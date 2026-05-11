import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AgentAdapter } from './runner/types.js';
import type { CreateRequirementInput, HostEvent, RequirementRecord, RequirementVerification } from './types.js';
import { RequirementStore } from './RequirementStore.js';
import { VerificationRunner } from './VerificationRunner.js';
import { WorkspaceManager } from './workspace/WorkspaceManager.js';

const MAX_STREAMED_LOG_LINE_CHARS = 360;

function nowIso(): string {
    return new Date().toISOString();
}

function compactLogLine(line: string): string {
    const compact = line.trim().replace(/\s+/g, ' ');
    return compact.length > MAX_STREAMED_LOG_LINE_CHARS
        ? `${compact.slice(0, MAX_STREAMED_LOG_LINE_CHARS - 1)}...`
        : compact;
}

function isAgentMetadataPath(path: string): boolean {
    return path === '.photoweb-agent' || path.startsWith('.photoweb-agent/');
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

function buildTitle(prompt: string): string {
    const compact = prompt.trim().replace(/\s+/g, ' ');
    const sentence = compact.split(/[.!?]/)[0] || compact;
    return sentence.slice(0, 72) || 'Untitled requirement';
}

function defaultVerification(): RequirementVerification {
    return {
        typecheck: 'not-run',
        lint: 'not-run',
        tests: 'not-run',
    };
}

type EventListener = (event: HostEvent) => void;

export class RequirementService {
    private items: RequirementRecord[] = [];
    private listeners = new Set<EventListener>();
    private runningRequirementId: string | null = null;
    private runningAbortController: AbortController | null = null;
    private runningCompletion: Promise<void> | null = null;
    private stopRequestedIds = new Set<string>();
    private pumpQueued = false;

    constructor(
        private readonly store: RequirementStore,
        private readonly adapter: AgentAdapter,
        private readonly workspaceManager: WorkspaceManager,
        private readonly verificationRunner: VerificationRunner,
        private readonly repoRoot: string,
    ) {}

    async init(): Promise<void> {
        this.items = await this.store.load();
        let recovered = false;
        const items: RequirementRecord[] = [];

        for (const item of this.items) {
            const itemChangedFiles = item.changedFiles.filter(file => !isAgentMetadataPath(file));
            const normalizedItem = itemChangedFiles.length === item.changedFiles.length
                ? item
                : { ...item, changedFiles: itemChangedFiles };
            if (normalizedItem !== item) recovered = true;
            if (normalizedItem.status !== 'running') {
                items.push(normalizedItem);
                continue;
            }
            items.push(await this.recoverInterruptedRun(normalizedItem));
            recovered = true;
        }

        if (recovered) {
            this.items = items;
            await this.persist();
        }
    }

    list(): RequirementRecord[] {
        return [...this.items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }

    subscribe(listener: EventListener): () => void {
        this.listeners.add(listener);
        listener(this.makeHostStatusEvent());
        return () => {
            this.listeners.delete(listener);
        };
    }

    async create(input: CreateRequirementInput): Promise<RequirementRecord> {
        const timestamp = nowIso();
        const item: RequirementRecord = {
            id: randomUUID(),
            title: buildTitle(input.rawPrompt),
            rawPrompt: input.rawPrompt.trim(),
            normalizedPrompt: input.rawPrompt.trim(),
            status: 'queued',
            createdAt: timestamp,
            updatedAt: timestamp,
            source: 'user',
            priority: 'normal',
            sourceContext: input.appContext,
            changedFiles: [],
            verification: defaultVerification(),
        };
        this.items = [item, ...this.items];
        await this.persist();
        this.emit({ type: 'requirement.created', item });
        this.emit(this.makeHostStatusEvent());
        this.queuePump();
        return item;
    }

    async retry(id: string): Promise<RequirementRecord | null> {
        const current = this.items.find(item => item.id === id);
        if (!current) return null;
        if (current.reviewWorkspace) {
            await this.appendLog(id, `Cleaning previous worktree ${current.reviewWorkspace.worktreePath}`);
            await this.workspaceManager.cleanupReviewWorkspace(current.reviewWorkspace);
        }
        const retried: RequirementRecord = {
            ...current,
            status: 'queued',
            updatedAt: nowIso(),
            startedAt: undefined,
            completedAt: undefined,
            failureReason: undefined,
            resultSummary: undefined,
            changedFiles: [],
            verification: defaultVerification(),
            reviewWorkspace: undefined,
            runner: undefined,
            appliedAt: undefined,
            mergeCommit: undefined,
        };
        this.replace(retried);
        await this.persist();
        this.emit({ type: 'requirement.updated', item: retried });
        this.emit(this.makeHostStatusEvent());
        this.queuePump();
        return retried;
    }

    async refresh(id: string): Promise<RequirementRecord | null> {
        const current = this.items.find(item => item.id === id);
        if (!current) return null;

        if (current.status === 'running' && this.runningRequirementId !== id) {
            const recovered = await this.recoverInterruptedRun(current);
            this.replace(recovered);
            await this.persist();
            this.emit({ type: 'requirement.updated', item: recovered });
            this.emit(this.makeHostStatusEvent());
            await this.appendLog(id, 'Refresh detected a stale running task and moved it to Blocked.');
            return recovered;
        }

        if (current.status === 'running') {
            await this.appendLog(id, 'Refresh checked the task: the host still owns an active runner process.');
        }
        return this.mustGet(id);
    }

    async stop(id: string): Promise<RequirementRecord | null> {
        const current = this.items.find(item => item.id === id);
        if (!current) return null;

        if (this.runningRequirementId === id && this.runningAbortController) {
            this.stopRequestedIds.add(id);
            await this.appendLog(id, 'Stop requested; terminating the active runner.');
            this.runningAbortController.abort();
            await this.runningCompletion?.catch(() => {});
            return this.mustGet(id);
        }

        if (current.status === 'queued' || current.status === 'todo' || current.status === 'running') {
            await this.appendLog(id, 'Stop requested for a non-active task; cleaning any review workspace.');
            await this.cancelRequirement(id, 'Stopped by user.');
            this.emit(this.makeHostStatusEvent());
            return this.mustGet(id);
        }

        return current;
    }

    async remove(id: string): Promise<boolean> {
        const current = this.items.find(item => item.id === id);
        if (!current) return false;

        if (this.runningRequirementId === id && this.runningAbortController) {
            this.stopRequestedIds.add(id);
            this.runningAbortController.abort();
            await this.runningCompletion?.catch(() => {});
        }

        const latest = this.items.find(item => item.id === id) ?? current;
        if (latest.reviewWorkspace) {
            await this.workspaceManager.cleanupReviewWorkspace(latest.reviewWorkspace);
        }

        this.items = this.items.filter(item => item.id !== id);
        await this.persist();
        this.emit({ type: 'requirement.removed', requirementId: id });
        this.emit(this.makeHostStatusEvent());
        this.queuePump();
        return true;
    }

    private queuePump(): void {
        if (this.pumpQueued) return;
        this.pumpQueued = true;
        queueMicrotask(() => {
            this.pumpQueued = false;
            void this.pump();
        });
    }

    private async pump(): Promise<void> {
        if (this.runningRequirementId) return;
        const next = this.items.find(item => item.status === 'queued' || item.status === 'todo');
        if (!next) {
            this.emit(this.makeHostStatusEvent());
            return;
        }
        this.runningRequirementId = next.id;
        const running: RequirementRecord = {
            ...next,
            status: 'running',
            updatedAt: nowIso(),
            startedAt: nowIso(),
            runner: this.adapter.name,
        };
        this.replace(running);
        await this.persist();
        this.emit({ type: 'requirement.updated', item: running });
        this.emit(this.makeHostStatusEvent());

        const abortController = new AbortController();
        this.runningAbortController = abortController;
        const implementation = this.runImplementation(running, abortController.signal);
        this.runningCompletion = implementation;

        try {
            await implementation;
        } finally {
            this.runningRequirementId = null;
            this.runningAbortController = null;
            this.runningCompletion = null;
            this.stopRequestedIds.delete(running.id);
            this.emit(this.makeHostStatusEvent());
            this.queuePump();
        }
    }

    private async runImplementation(item: RequirementRecord, signal: AbortSignal): Promise<void> {
        await this.appendLog(item.id, `Selected runner: ${this.adapter.name}`);
        try {
            if (signal.aborted) throw this.createStopError();
            const available = await this.adapter.isAvailable();
            if (!available) {
                await this.failRequirement(item.id, 'blocked', `${this.adapter.name} is not available on the host machine.`);
                return;
            }
            if (signal.aborted) throw this.createStopError();

            const workspace = await this.workspaceManager.prepare(item.id);
            await this.updateRequirement(item.id, current => ({
                ...current,
                updatedAt: nowIso(),
                reviewWorkspace: this.workspaceManager.toReviewInfo(workspace),
            }));
            await this.appendLog(item.id, `Created review worktree ${workspace.worktreePath}`);

            const runResult = await this.adapter.run({
                requirement: this.mustGet(item.id),
                workspace,
                repoRoot: this.repoRoot,
                signal,
                emitLog: line => this.appendLog(item.id, line),
            });

            if (signal.aborted) throw this.createStopError();
            await this.appendLog(item.id, 'Host verification started');
            const verificationResult = await this.verificationRunner.run(workspace.worktreePath, signal, line => this.appendLog(item.id, line));
            if (signal.aborted) throw this.createStopError();
            const changedFiles = await this.workspaceManager.changedFiles(workspace.worktreePath);

            if (changedFiles.length === 0) {
                await this.failRequirement(item.id, 'blocked', 'The runner finished without producing any file changes.', verificationResult.verification);
                return;
            }

            if (!verificationResult.ok) {
                await this.failRequirement(item.id, 'blocked', 'Verification failed in the isolated review worktree.', verificationResult.verification, changedFiles);
                return;
            }

            await this.appendLog(item.id, 'Verification passed; merging into the primary branch');
            let applied;
            try {
                applied = await this.workspaceManager.commitAndMerge(
                    workspace,
                    `Apply requirement: ${this.mustGet(item.id).title}`,
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Merge failed after verification.';
                await this.failRequirement(item.id, 'blocked', message, verificationResult.verification, changedFiles);
                return;
            }

            const done: RequirementRecord = {
                ...this.mustGet(item.id),
                status: 'done',
                updatedAt: nowIso(),
                completedAt: nowIso(),
                appliedAt: nowIso(),
                mergeCommit: applied.mergeCommit,
                changedFiles,
                resultSummary: runResult.summary,
                verification: verificationResult.verification,
            };
            this.replace(done);
            await this.persist();
            this.emit({ type: 'requirement.updated', item: done });
            await this.appendLog(item.id, `Merged as ${applied.mergeCommit}`);
            await this.workspaceManager.cleanupReviewWorkspace(workspace);
            await this.appendLog(item.id, 'Cleaned merged review worktree');
        } catch (error) {
            if (isAbortError(error) || this.stopRequestedIds.has(item.id)) {
                await this.cancelRequirement(item.id, 'Stopped by user.');
                return;
            }
            const message = error instanceof Error ? error.message : 'Unknown runner failure';
            await this.failRequirement(item.id, 'failed', message);
        }
    }

    private createStopError(): Error {
        const error = new Error('Requirement run was stopped by the host.');
        error.name = 'AbortError';
        return error;
    }

    private async failRequirement(
        id: string,
        status: 'blocked' | 'failed',
        failureReason: string,
        verification?: RequirementVerification,
        changedFiles?: string[],
    ): Promise<void> {
        const failed: RequirementRecord = {
            ...this.mustGet(id),
            status,
            updatedAt: nowIso(),
            completedAt: nowIso(),
            failureReason,
            changedFiles: changedFiles ?? this.mustGet(id).changedFiles,
            verification: verification ?? this.mustGet(id).verification,
        };
        this.replace(failed);
        await this.persist();
        this.emit({ type: 'requirement.updated', item: failed });
    }

    private async cancelRequirement(id: string, failureReason: string): Promise<void> {
        const current = this.mustGet(id);
        if (current.reviewWorkspace) {
            await this.workspaceManager.cleanupReviewWorkspace(current.reviewWorkspace);
            await this.appendLog(id, `Removed review worktree and branch ${current.reviewWorkspace.branchName}`);
        }
        const cancelled: RequirementRecord = {
            ...current,
            status: 'cancelled',
            updatedAt: nowIso(),
            completedAt: nowIso(),
            failureReason,
            reviewWorkspace: undefined,
            runner: undefined,
        };
        this.replace(cancelled);
        await this.persist();
        this.emit({ type: 'requirement.updated', item: cancelled });
    }

    private async recoverInterruptedRun(item: RequirementRecord): Promise<RequirementRecord> {
        const changedFiles = item.reviewWorkspace
            ? await this.workspaceManager.changedFiles(item.reviewWorkspace.worktreePath).catch(() => item.changedFiles)
            : item.changedFiles;
        const resultSummary = item.reviewWorkspace
            ? await this.readRecoveredSummary(item.reviewWorkspace.worktreePath)
            : item.resultSummary;
        return {
            ...item,
            status: 'blocked',
            updatedAt: nowIso(),
            completedAt: nowIso(),
            changedFiles,
            resultSummary: resultSummary ?? item.resultSummary,
            failureReason: 'Host restarted before this running job was finalized. The review worktree is kept; retry will start the task again from a clean branch.',
        };
    }

    private async readRecoveredSummary(worktreePath: string): Promise<string | undefined> {
        const candidates = [
            resolve(worktreePath, '.photoweb-agent', 'codex-last-message.txt'),
            resolve(worktreePath, '.photoweb-agent', 'claude-last-message.txt'),
        ];
        for (const candidate of candidates) {
            const summary = await readFile(candidate, 'utf8').catch(() => '');
            const trimmed = summary.trim();
            if (trimmed) return trimmed;
        }
        return undefined;
    }

    private async updateRequirement(
        id: string,
        updater: (item: RequirementRecord) => RequirementRecord,
    ): Promise<void> {
        const updated = updater(this.mustGet(id));
        this.replace(updated);
        await this.persist();
        this.emit({ type: 'requirement.updated', item: updated });
    }

    private async appendLog(requirementId: string, line: string): Promise<void> {
        const compact = compactLogLine(line);
        if (!compact) return;
        this.emit({ type: 'requirement.log', requirementId, line: compact });
    }

    private makeHostStatusEvent(): HostEvent {
        return {
            type: 'host.status',
            busy: this.runningRequirementId !== null,
            queueDepth: this.items.filter(item => item.status === 'queued' || item.status === 'todo' || item.status === 'running').length,
        };
    }

    private emit(event: HostEvent): void {
        this.listeners.forEach(listener => {
            listener(event);
        });
    }

    private replace(updated: RequirementRecord): void {
        this.items = this.items.map(item => item.id === updated.id ? updated : item);
    }

    private mustGet(id: string): RequirementRecord {
        const found = this.items.find(item => item.id === id);
        if (!found) throw new Error(`Missing requirement ${id}`);
        return found;
    }

    private async persist(): Promise<void> {
        await this.store.save(this.items);
    }
}
