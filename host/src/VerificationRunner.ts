import { spawn } from 'node:child_process';
import type { VerificationResult } from './runner/types.js';

const MAX_FAILURE_OUTPUT_LINES = 40;
const MAX_OUTPUT_LINE_CHARS = 240;

function createAbortError(): Error {
    const error = new Error('Verification was stopped by the host.');
    error.name = 'AbortError';
    return error;
}

function compactOutputLine(line: string): string {
    const compact = line.trim().replace(/\s+/g, ' ');
    return compact.length > MAX_OUTPUT_LINE_CHARS
        ? `${compact.slice(0, MAX_OUTPUT_LINE_CHARS - 1)}...`
        : compact;
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

async function runCommand(
    cwd: string,
    command: string,
    args: string[],
    signal: AbortSignal,
    emitLog: (line: string) => Promise<void>,
): Promise<boolean> {
    if (signal.aborted) throw createAbortError();

    const label = `${command} ${args.join(' ')}`;
    await emitLog(`Checking: ${label}`);
    const child = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
    });

    const output = createRecentOutputCollector();
    const abortHandler = () => {
        child.kill('SIGTERM');
        setTimeout(() => {
            if (child.exitCode === null) child.kill('SIGKILL');
        }, 5000).unref();
    };
    signal.addEventListener('abort', abortHandler, { once: true });

    child.stdout.on('data', chunk => {
        output.capture(String(chunk));
    });
    child.stderr.on('data', chunk => {
        output.capture(String(chunk));
    });

    const passed = await new Promise<boolean>(resolve => {
        let settled = false;
        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            resolve(ok);
        };

        child.on('error', async error => {
            output.capture(`Command failed to start: ${error.message}`);
            finish(false);
        });
        child.on('exit', code => finish(code === 0));
    }).finally(() => {
        signal.removeEventListener('abort', abortHandler);
    });
    output.flush();

    if (signal.aborted) throw createAbortError();

    if (passed) {
        await emitLog(`Passed: ${label}`);
    } else {
        await emitLog(`Failed: ${label}`);
        const recentOutput = output.recentLines();
        if (recentOutput.length > 0) {
            await emitLog(`Recent ${label} output:`);
            await Promise.all(recentOutput.map(line => emitLog(line)));
        }
    }

    return passed;
}

export class VerificationRunner {
    async run(worktreePath: string, signal: AbortSignal, emitLog: (line: string) => Promise<void>): Promise<VerificationResult> {
        const typecheck = await runCommand(worktreePath, 'npx', ['tsc', '-b'], signal, emitLog);
        const lint = await runCommand(worktreePath, 'npm', ['run', 'lint'], signal, emitLog);
        const tests = await runCommand(worktreePath, 'npm', ['test'], signal, emitLog);
        return {
            ok: typecheck && lint && tests,
            verification: {
                typecheck: typecheck ? 'pass' : 'fail',
                lint: lint ? 'pass' : 'fail',
                tests: tests ? 'pass' : 'fail',
            },
        };
    }
}
