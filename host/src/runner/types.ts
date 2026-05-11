import type { RequirementRecord, RequirementVerification } from '../types.js';
import type { PreparedWorkspace } from '../workspace/WorkspaceManager.js';

export interface AgentRunContext {
    requirement: RequirementRecord;
    workspace: PreparedWorkspace;
    repoRoot: string;
    signal: AbortSignal;
    emitLog: (line: string) => Promise<void>;
}

export interface AgentRunResult {
    summary: string;
}

export interface VerificationResult {
    verification: RequirementVerification;
    ok: boolean;
}

export interface AgentAdapter {
    readonly name: string;
    isAvailable(): Promise<boolean>;
    run(context: AgentRunContext): Promise<AgentRunResult>;
}
