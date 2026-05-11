import { access, constants, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import type { AgentAdapter, AgentRunContext, AgentRunResult } from '../types.js';

const MAX_FAILURE_OUTPUT_LINES = 40;
const MAX_OUTPUT_LINE_CHARS = 240;
const HEARTBEAT_INTERVAL_MS = 30000;

function createAbortError(): Error {
    const error = new Error('Codex run was stopped by the host.');
    error.name = 'AbortError';
    return error;
}

function compactOutputLine(line: string): string {
    const compact = line.trim().replace(/\s+/g, ' ');
    return compact.length > MAX_OUTPUT_LINE_CHARS
        ? `${compact.slice(0, MAX_OUTPUT_LINE_CHARS - 1)}...`
        : compact;
}

function compactCommand(command: string): string {
    const withoutShell = command.replace(/^\/bin\/(?:ba|z)?sh -lc /, '');
    return compactOutputLine(withoutShell);
}

function parseJsonLine(line: string): unknown | null {
    try {
        return JSON.parse(line) as unknown;
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getEventItem(event: unknown): Record<string, unknown> | null {
    if (!isRecord(event) || !isRecord(event.item)) return null;
    return event.item;
}

function getCodexLogLine(line: string): string | null {
    const event = parseJsonLine(line);
    if (!event || !isRecord(event)) return null;
    const item = getEventItem(event);
    if (!item) {
        if (event.type === 'turn.started') return 'Codex turn started.';
        if (event.type === 'turn.completed') return 'Codex turn completed.';
        return null;
    }

    if (item.type === 'agent_message' && typeof item.text === 'string') {
        const text = compactOutputLine(item.text);
        return text ? `Codex: ${text}` : null;
    }

    if (item.type === 'command_execution' && typeof item.command === 'string') {
        const command = compactCommand(item.command);
        if (event.type === 'item.started') return `Codex command started: ${command}`;
        if (event.type === 'item.completed') {
            const exitCode = typeof item.exit_code === 'number' ? item.exit_code : null;
            return exitCode === 0
                ? `Codex command passed: ${command}`
                : `Codex command failed${exitCode === null ? '' : ` (${exitCode})`}: ${command}`;
        }
    }

    return null;
}

function createRecentOutputCollector() {
    let pending = '';
    const recent: string[] = [];

    function pushLine(line: string) {
        const compact = compactOutputLine(line);
        if (!compact) return;
        recent.push(compact);
        if (recent.length > MAX_FAILURE_OUTPUT_LINES) {
            recent.splice(0, recent.length - MAX_FAILURE_OUTPUT_LINES);
        }
    }

    return {
        capture(chunk: string) {
            pending += chunk;
            const lines = pending.split(/\r?\n/);
            pending = lines.pop() ?? '';
            lines.forEach(pushLine);
        },
        flush() {
            if (!pending) return;
            pushLine(pending);
            pending = '';
        },
        recentLines() {
            return [...recent];
        },
    };
}

function createPrompt(context: AgentRunContext): string {
    const requirement = context.requirement;
    const sourceContext = requirement.sourceContext;
    const contextLine = sourceContext
        ? `App context: document=${sourceContext.documentName ?? 'unknown'}, tool=${sourceContext.activeTool ?? 'unknown'}, activeLayer=${sourceContext.activeLayerId ?? 'none'}, zoom=${sourceContext.zoom ?? 'unknown'}`
        : 'App context: unavailable';
    return [
        'You are implementing exactly one queued requirement for the Photoweb repository.',
        'You are running inside an isolated git worktree created for review.',
        'Do not modify files outside this worktree.',
        'Follow the repository instructions in CLAUDE.md and relevant docs.',
        'Implement the request, make focused code changes, and leave the result ready for review.',
        'Run relevant checks if helpful, but the host will also verify afterwards.',
        '',
        `Requirement title: ${requirement.title}`,
        `Requirement details: ${requirement.rawPrompt}`,
        contextLine,
        '',
        'In your final response, summarize what changed and mention any important caveats.',
    ].join('\n');
}

export class CodexAdapter implements AgentAdapter {
    readonly name = 'codex';

    constructor(private readonly executable: string = 'codex') {}

    async isAvailable(): Promise<boolean> {
        try {
            await access(this.executable, constants.X_OK);
            return true;
        } catch {
            try {
                const child = spawn(this.executable, ['--version'], { stdio: 'ignore' });
                return await new Promise<boolean>(resolveAvailable => {
                    child.on('error', () => resolveAvailable(false));
                    child.on('exit', code => resolveAvailable(code === 0));
                });
            } catch {
                return false;
            }
        }
    }

    async run(context: AgentRunContext): Promise<AgentRunResult> {
        if (context.signal.aborted) throw createAbortError();

        const outputDir = resolve(context.workspace.worktreePath, '.photoweb-agent');
        await mkdir(outputDir, { recursive: true });
        const summaryPath = resolve(outputDir, 'codex-last-message.txt');
        const args = [
            '--ask-for-approval', 'never',
            'exec',
            '--json',
            '--cd', context.workspace.worktreePath,
            '--sandbox', 'workspace-write',
            '--ephemeral',
            '--color', 'never',
            '--output-last-message', summaryPath,
            '-',
        ];

        await context.emitLog(`Launching Codex in ${context.workspace.branchName}`);
        await context.emitLog('Streaming Codex progress. Noisy command output is still hidden.');

        const child = spawn(this.executable, args, {
            cwd: context.workspace.worktreePath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env,
        });

        const output = createRecentOutputCollector();
        let pendingStdout = '';
        let emitQueue = Promise.resolve();
        const enqueueLog = (line: string) => {
            emitQueue = emitQueue.then(() => context.emitLog(line));
        };
        const captureStdout = (chunk: string) => {
            output.capture(chunk);
            pendingStdout += chunk;
            const lines = pendingStdout.split(/\r?\n/);
            pendingStdout = lines.pop() ?? '';
            lines.forEach(line => {
                const logLine = getCodexLogLine(line);
                if (logLine) enqueueLog(logLine);
            });
        };
        const flushStdout = () => {
            if (!pendingStdout) return;
            const logLine = getCodexLogLine(pendingStdout);
            if (logLine) enqueueLog(logLine);
            pendingStdout = '';
        };
        const heartbeat = setInterval(() => {
            enqueueLog('Codex is still working...');
        }, HEARTBEAT_INTERVAL_MS);
        const abortHandler = () => {
            child.kill('SIGTERM');
            setTimeout(() => {
                if (child.exitCode === null) child.kill('SIGKILL');
            }, 5000).unref();
        };
        context.signal.addEventListener('abort', abortHandler, { once: true });

        child.stdout.on('data', chunk => {
            captureStdout(String(chunk));
        });
        child.stderr.on('data', chunk => {
            output.capture(String(chunk));
        });

        child.stdin.write(createPrompt(context));
        child.stdin.end();

        const exitCode = await new Promise<number>((resolveExit, rejectExit) => {
            child.on('error', rejectExit);
            child.on('exit', code => resolveExit(code ?? 1));
        }).finally(() => {
            clearInterval(heartbeat);
            context.signal.removeEventListener('abort', abortHandler);
        });
        flushStdout();
        await emitQueue;

        if (context.signal.aborted) throw createAbortError();

        if (exitCode !== 0) {
            output.flush();
            await context.emitLog(`Codex failed with exit code ${exitCode}. Recent output:`);
            const recentOutput = output.recentLines();
            if (recentOutput.length === 0) {
                await context.emitLog('No Codex output was captured.');
            } else {
                await Promise.all(recentOutput.map(line => context.emitLog(line)));
            }
            throw new Error(`Codex exited with code ${exitCode}`);
        }

        await context.emitLog('Codex completed; reading final summary.');
        const summary = await readFile(summaryPath, 'utf8').catch(() => '');
        return {
            summary: summary.trim() || 'Codex completed without a final summary message.',
        };
    }
}
