import { env } from 'node:process';
import { ClaudeAdapter } from './adapters/ClaudeAdapter.js';
import { CodexAdapter } from './adapters/CodexAdapter.js';
import { FakeAdapter } from './adapters/FakeAdapter.js';
import type { AgentAdapter } from './types.js';

export async function createAgentAdapter(): Promise<AgentAdapter> {
    const runner = (env.PHOTOWEB_AGENT_RUNNER ?? 'auto').trim().toLowerCase();
    const codex = new CodexAdapter(env.PHOTOWEB_AGENT_CODEX_COMMAND ?? 'codex');
    const claude = new ClaudeAdapter(env.PHOTOWEB_AGENT_CLAUDE_COMMAND ?? 'claude');
    const fake = new FakeAdapter();

    if (runner === 'codex') return codex;
    if (runner === 'claude') return claude;
    if (runner === 'fake') return fake;

    if (await codex.isAvailable()) return codex;
    if (await claude.isAvailable()) return claude;
    return fake;
}
