import { spawn } from 'node:child_process';
import type { AgentAdapter, AgentRunContext, AgentRunResult } from '../types.js';

export class ClaudeAdapter implements AgentAdapter {
    readonly name = 'claude';

    constructor(private readonly executable: string = 'claude') {}

    async isAvailable(): Promise<boolean> {
        try {
            const child = spawn(this.executable, ['--help'], { stdio: 'ignore' });
            return await new Promise<boolean>(resolveAvailable => {
                child.on('error', () => resolveAvailable(false));
                child.on('exit', code => resolveAvailable(code === 0));
            });
        } catch {
            return false;
        }
    }

    async run(context: AgentRunContext): Promise<AgentRunResult> {
        void context;
        throw new Error('Claude adapter is not implemented in this environment yet.');
    }
}
