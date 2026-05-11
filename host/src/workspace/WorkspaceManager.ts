import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ReviewWorkspaceInfo } from '../types.js';

const execFileAsync = promisify(execFile);

export interface PreparedWorkspace {
    branchName: string;
    worktreePath: string;
    baseRef: string;
}

export interface AppliedWorkspace {
    mergeCommit: string;
}

function isAgentMetadataPath(path: string): boolean {
    return path === '.photoweb-agent' || path.startsWith('.photoweb-agent/');
}

export class WorkspaceManager {
    constructor(
        private readonly repoRoot: string,
        private readonly worktreeRoot: string,
    ) {}

    async prepare(requirementId: string): Promise<PreparedWorkspace> {
        await mkdir(this.worktreeRoot, { recursive: true });
        const baseRef = await this.currentBaseRef();
        const suffix = `${requirementId.slice(0, 8)}-${Date.now()}`;
        const branchName = `agent/${suffix}`;
        const worktreePath = resolve(this.worktreeRoot, suffix);
        await execFileAsync('git', ['worktree', 'add', '-b', branchName, worktreePath, baseRef], {
            cwd: this.repoRoot,
        });
        return { branchName, worktreePath, baseRef };
    }

    toReviewInfo(workspace: PreparedWorkspace): ReviewWorkspaceInfo {
        return {
            branchName: workspace.branchName,
            worktreePath: workspace.worktreePath,
            baseRef: workspace.baseRef,
        };
    }

    async changedFiles(worktreePath: string): Promise<string[]> {
        const { stdout } = await execFileAsync('git', ['status', '--short', '--untracked-files=all'], {
            cwd: worktreePath,
        });
        return stdout
            .split('\n')
            .map(line => line.slice(3).trim())
            .filter(file => file && !isAgentMetadataPath(file));
    }

    async commitAndMerge(workspace: PreparedWorkspace, message: string): Promise<AppliedWorkspace> {
        await this.ensurePrimaryWorktreeClean();
        await execFileAsync('git', ['add', '-A', '--', '.', ':!.photoweb-agent'], {
            cwd: workspace.worktreePath,
        });
        const hasChanges = await this.hasStagedChanges(workspace.worktreePath);
        if (!hasChanges) {
            throw new Error('No staged changes were available to merge.');
        }
        await execFileAsync('git', [
            '-c', 'user.name=Photoweb Agent',
            '-c', 'user.email=photoweb-agent@local',
            'commit',
            '-m', message,
        ], {
            cwd: workspace.worktreePath,
        });
        await execFileAsync('git', ['merge', '--no-ff', '--no-edit', workspace.branchName], {
            cwd: this.repoRoot,
        });
        const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
            cwd: this.repoRoot,
        });
        return {
            mergeCommit: stdout.trim(),
        };
    }

    async cleanupReviewWorkspace(info: ReviewWorkspaceInfo): Promise<void> {
        await execFileAsync('git', ['worktree', 'remove', '--force', info.worktreePath], {
            cwd: this.repoRoot,
        }).catch(() => {});
        await execFileAsync('git', ['branch', '-D', info.branchName], {
            cwd: this.repoRoot,
        }).catch(() => {});
        await execFileAsync('git', ['worktree', 'prune'], {
            cwd: this.repoRoot,
        }).catch(() => {});
    }

    private async currentBaseRef(): Promise<string> {
        const branchAttempt = await execFileAsync('git', ['branch', '--show-current'], {
            cwd: this.repoRoot,
        });
        const branch = branchAttempt.stdout.trim();
        if (branch) return branch;
        const revAttempt = await execFileAsync('git', ['rev-parse', 'HEAD'], {
            cwd: this.repoRoot,
        });
        return revAttempt.stdout.trim();
    }

    private async hasStagedChanges(worktreePath: string): Promise<boolean> {
        try {
            await execFileAsync('git', ['diff', '--cached', '--quiet'], {
                cwd: worktreePath,
            });
            return false;
        } catch {
            return true;
        }
    }

    private async ensurePrimaryWorktreeClean(): Promise<void> {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
            cwd: this.repoRoot,
        });
        if (stdout.trim()) {
            throw new Error('Primary worktree has uncommitted changes; merge is paused to avoid overwriting local work.');
        }
    }
}
