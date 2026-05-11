export type RequirementStatus =
    | 'todo'
    | 'queued'
    | 'running'
    | 'done'
    | 'blocked'
    | 'failed'
    | 'needs-review'
    | 'cancelled';

export interface RequirementVerification {
    typecheck: 'pass' | 'fail' | 'not-run';
    lint: 'pass' | 'fail' | 'not-run';
    tests: 'pass' | 'fail' | 'not-run';
}

export interface ReviewWorkspaceInfo {
    branchName: string;
    worktreePath: string;
    baseRef: string;
}

export interface RequirementContext {
    documentName?: string;
    activeTool?: string;
    activeLayerId?: string | null;
    selectedLayerIds?: string[];
    zoom?: number;
}

export interface RequirementRecord {
    id: string;
    title: string;
    rawPrompt: string;
    normalizedPrompt: string;
    status: RequirementStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    source: 'user' | 'host' | 'agent';
    priority: 'low' | 'normal' | 'high';
    sourceContext?: RequirementContext;
    resultSummary?: string;
    failureReason?: string;
    changedFiles: string[];
    verification: RequirementVerification;
    runner?: string;
    reviewWorkspace?: ReviewWorkspaceInfo;
    appliedAt?: string;
    mergeCommit?: string;
}

export interface RequirementStorePayload {
    version: 1;
    items: RequirementRecord[];
}

export type HostEvent =
    | { type: 'requirement.created'; item: RequirementRecord }
    | { type: 'requirement.updated'; item: RequirementRecord }
    | { type: 'requirement.removed'; requirementId: string }
    | { type: 'requirement.log'; requirementId: string; line: string }
    | { type: 'host.status'; busy: boolean; queueDepth: number };

export interface CreateRequirementInput {
    rawPrompt: string;
    appContext?: RequirementContext;
}
