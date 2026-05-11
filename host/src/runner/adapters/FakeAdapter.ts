import type { AgentAdapter, AgentRunContext, AgentRunResult } from '../types.js';

function delay(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted) return;
    const error = new Error('Fake runner was stopped by the host.');
    error.name = 'AbortError';
    throw error;
}

export class FakeAdapter implements AgentAdapter {
    readonly name = 'fake';

    async isAvailable(): Promise<boolean> {
        return true;
    }

    async run(context: AgentRunContext): Promise<AgentRunResult> {
        throwIfAborted(context.signal);
        await context.emitLog(`Planning work for "${context.requirement.title}"`);
        await delay(250);
        throwIfAborted(context.signal);
        await context.emitLog('Inspecting repo structure and relevant files');
        await delay(250);
        throwIfAborted(context.signal);
        await context.emitLog('Preparing a minimal implementation slice');
        await delay(250);
        throwIfAborted(context.signal);
        await context.emitLog(`Leaving changes for review in ${context.workspace.branchName}`);
        return {
            summary: 'Fake runner completed. Replace this with a real Codex or Claude adapter if needed.',
        };
    }
}
