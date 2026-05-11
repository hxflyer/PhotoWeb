# Photoweb Agent Overlay Architecture

## Goal

Add a small top-left overlay to Photoweb where a user can:

- open a popup from a compact icon
- describe bugs, changes, or feature requests in natural language
- see a persistent requirement queue with status updates
- watch items move from `todo` to `running` to `done` or `blocked`
- test the result and submit follow-up requirements

The host side should:

- receive and persist requirements
- decide which item to work on next
- run an agent executor such as Codex or Claude Code
- apply changes in the local repo
- verify work
- mark the requirement complete or blocked with logs

## Recommendation

Do **not** try to make the browser app run the coding agent directly.

Recommended architecture:

1. Keep Photoweb as the current Vite/React/Zustand web app.
2. Add a thin in-app overlay UI.
3. Add a separate local host service that owns the requirement queue and agent execution.
4. Connect the overlay to the host through a local bridge.

This is the best fit for the current repo because:

- the app is frontend-only today
- browser code cannot safely execute local coding tools
- Codex/Claude-style agents need file-system, process, and git access
- queue persistence and long-running jobs belong outside the React app

## High-Level Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│ Photoweb Web App                                                │
│                                                                  │
│  React overlay icon + popup                                      │
│  Zustand overlay slice                                           │
│  Bridge client (HTTP + WebSocket or SSE)                         │
└───────────────┬──────────────────────────────────────────────────┘
                │
                │ localhost bridge
                │
┌───────────────▼──────────────────────────────────────────────────┐
│ Local Host Service                                               │
│                                                                  │
│  API server                                                      │
│  Queue manager                                                   │
│  Requirement store                                               │
│  Event stream                                                    │
│  Agent runner                                                    │
│  Verification runner                                             │
│  Repo workspace manager                                          │
└───────────────┬──────────────────────────────────────────────────┘
                │
                │ process / filesystem / git
                │
┌───────────────▼──────────────────────────────────────────────────┐
│ Local Tooling                                                    │
│                                                                  │
│  codex / claude-code adapter                                     │
│  npm test / lint / tsc                                           │
│  git worktree or branch isolation                                │
│  patch generation and logs                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Why This Fits The Current Codebase

Current repo facts:

- `src/App.tsx` already mounts global overlays, dialogs, and toasts at the app root.
- `src/components/layout/MainLayout.tsx` provides a stable shell for a fixed-position UI element.
- `src/store/editorStore.ts` is Zustand-based and easy to extend with a new overlay slice.
- The app already persists some UI/document state in browser storage and OPFS, but not process-level task state.
- There is no backend yet, so agent execution must be introduced as a new host concern.

Best insertion point:

- Mount a new `RequirementsOverlay` near `ToastContainer` in `src/App.tsx`.
- Keep it `position: fixed` so it does not interfere with the canvas layout grid.
- Store only UI/session cache in Zustand.
- Treat the host as the source of truth for requirement status.

## Core Subsystems

## 1. Overlay UI

### Behavior

- Default state: a small icon button in the top-left.
- Expanded state: a popup drawer or floating panel.
- Main sections:
  - composer input
  - requirement list
  - requirement detail view
  - execution logs
  - retry / cancel / approve actions if needed

### UX states

- `collapsed`
- `expanded`
- `submitting`
- `syncing`
- `offline`
- `host-busy`

### Suggested popup layout

- Header: `Assistant Queue`
- Input box: natural-language request
- Submit button
- Queue tabs: `Open`, `Running`, `Done`, `Blocked`
- Item detail pane:
  - original request
  - normalized task title
  - status
  - timestamps
  - agent summary
  - files changed
  - verification results

## 2. Frontend State Model

Add a new Zustand slice, for example:

`src/store/requirementsSlice.ts`

Suggested local state:

```ts
type RequirementStatus =
  | 'todo'
  | 'queued'
  | 'running'
  | 'done'
  | 'blocked'
  | 'failed'
  | 'needs-review'
  | 'cancelled';

interface RequirementItem {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  createdAt: string;
  updatedAt: string;
  source: 'user' | 'host' | 'agent';
  priority: 'low' | 'normal' | 'high';
  acceptanceCriteria: string[];
  resultSummary?: string;
  verification?: {
    typecheck?: 'pass' | 'fail' | 'not-run';
    lint?: 'pass' | 'fail' | 'not-run';
    tests?: 'pass' | 'fail' | 'not-run';
  };
}

interface OverlayState {
  isOpen: boolean;
  draftText: string;
  selectedRequirementId: string | null;
  connection: 'connecting' | 'online' | 'offline';
  items: RequirementItem[];
  logsByRequirementId: Record<string, string[]>;
}
```

Important boundary:

- frontend state is a cache
- host store is authoritative

## 3. Host Service

The host service is the heart of the system.

Suggested responsibilities:

- accept new requirements
- normalize them into queue items
- persist queue state
- schedule work
- launch the agent executor
- stream logs back to the UI
- record verification results
- mark status changes

Suggested implementation options:

### Option A: Separate local daemon

- `host/` folder
- Node.js + TypeScript
- REST API + WebSocket
- started manually alongside `vite`

Pros:

- lowest disruption to current app
- easy to debug independently
- works with the existing browser app

Cons:

- two-process developer experience

### Option B: Desktop wrapper host

- Electron or Tauri shell around Photoweb
- host bundled into desktop app

Pros:

- cleaner end-user packaging
- no separate daemon for users

Cons:

- bigger platform shift
- more initial integration work

### Recommendation

Build Option A first. Move to Option B later if you want a packaged desktop product.

## 4. Requirement Queue Model

Suggested persistent schema:

```ts
interface RequirementRecord {
  id: string;
  projectId: string;
  title: string;
  rawPrompt: string;
  normalizedPrompt: string;
  status: 'todo' | 'queued' | 'running' | 'done' | 'blocked' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  sourceContext?: {
    activeDocumentName?: string;
    activeLayerId?: string | null;
    currentTool?: string;
    appVersion?: string;
  };
  agentRunId?: string;
  resultSummary?: string;
  failureReason?: string;
  changedFiles?: string[];
  verification?: {
    typecheck: 'pass' | 'fail' | 'not-run';
    lint: 'pass' | 'fail' | 'not-run';
    tests: 'pass' | 'fail' | 'not-run';
  };
}
```

Persist this in:

- SQLite if you want robustness
- JSON files if you want the fastest MVP

Recommendation:

- start with JSON on disk
- move to SQLite if concurrency or audit history grows

## 5. Agent Runner

Do not hard-code the system to one model vendor.

Use an adapter layer:

```ts
interface AgentAdapter {
  name: 'codex' | 'claude-code';
  isAvailable(): Promise<boolean>;
  runTask(task: AgentTask, context: AgentContext): Promise<AgentRunResult>;
  cancelRun(runId: string): Promise<void>;
}
```

Each run should receive:

- repo path
- selected requirement
- implementation rules
- verification commands
- output format contract

Suggested run contract:

1. Read requirement.
2. Inspect relevant files.
3. Implement one requirement only.
4. Run `npx tsc -b`.
5. Run `npm run lint`.
6. Run `npm test`.
7. Return:
   - summary
   - changed files
   - verification status
   - final disposition: `done` or `blocked`

## 6. Workspace Isolation

This part matters a lot.

If the agent edits the same working tree the user is actively using, collisions will happen.

Recommended approach:

- host creates a dedicated worktree or branch for each run
- agent works there
- host compares result back to the main workspace
- host either:
  - applies patch automatically
  - opens a review step
  - or asks for approval before merge

Suggested modes:

### Mode 1: Direct apply

- fastest
- highest risk

### Mode 2: Patch review

- host generates diff
- user reviews in overlay or external tool
- then apply

### Mode 3: Auto-commit to branch

- host commits to `agent/<requirement-id>`
- user merges when satisfied

### Recommendation

For this repo, start with `Mode 3` or `Mode 2`.

Reason:

- Photoweb is under active development
- the user may have local changes
- you do not want the agent silently overwriting in-progress work

## 7. Frontend/Host API

Suggested API surface:

### Commands

- `POST /requirements`
- `GET /requirements`
- `GET /requirements/:id`
- `POST /requirements/:id/cancel`
- `POST /requirements/:id/retry`
- `POST /requirements/:id/approve`

### Streaming

- `GET /events` via SSE

Suggested event types:

```ts
type HostEvent =
  | { type: 'requirement.created'; item: RequirementRecord }
  | { type: 'requirement.updated'; item: RequirementRecord }
  | { type: 'requirement.log'; requirementId: string; line: string }
  | { type: 'requirement.started'; requirementId: string }
  | { type: 'requirement.completed'; requirementId: string; summary: string }
  | { type: 'requirement.blocked'; requirementId: string; reason: string }
  | { type: 'host.status'; queueDepth: number; busy: boolean };
```

Why SSE first:

- simpler than WebSocket
- enough for mostly one-way status streaming
- easy to consume in React

## 8. Requirement Lifecycle

```text
user submits request
  -> host persists item as todo
  -> host normalizes title and metadata
  -> scheduler marks item queued
  -> runner marks item running
  -> agent edits code in isolated workspace
  -> verification runs
  -> if success: mark done or needs-review
  -> if failure: mark blocked or failed
  -> UI updates in real time
```

Suggested statuses:

- `todo`: captured, not scheduled yet
- `queued`: accepted and waiting
- `running`: agent working
- `needs-review`: changes prepared, waiting for user acceptance
- `done`: applied and verified
- `blocked`: agent needs clarification or hit a product constraint
- `failed`: execution or verification failed
- `cancelled`: stopped by user

## 9. Natural Language Intake

User prompts will often be vague. The host should normalize them before execution.

Example normalization pipeline:

1. save raw text
2. generate a short title
3. classify type:
   - bug
   - feature
   - polish
   - refactor
   - question
4. extract acceptance criteria if obvious
5. attach app context snapshot if available
6. enqueue for agent

Important rule:

Do not let the agent overwrite the original user request. Keep:

- `rawPrompt`
- `normalizedPrompt`

both fields.

## 10. Context Sent From App To Host

The overlay should send lightweight app context with each submission:

- current document name
- active tool
- active layer id
- selected layer ids
- current zoom
- possibly screenshot later

For example:

```ts
interface RequirementSubmission {
  rawPrompt: string;
  appContext: {
    documentName: string;
    activeTool: string;
    activeLayerId: string | null;
    selectedLayerIds: string[];
    zoom: number;
  };
}
```

This helps the host generate better agent prompts without tightly coupling the agent to the live browser state.

## 11. Security And Safety

This feature is powerful and risky.

Main risks:

- arbitrary local command execution
- editing the wrong files
- destructive git operations
- infinite task loops
- prompt injection from untrusted text
- user confusion when a requirement is "done" but not actually validated

Minimum safeguards:

- run only on localhost
- explicit allowlist of repo root paths
- no unrestricted shell passthrough from UI
- one active run at a time in MVP
- max runtime per task
- max file count or diff size threshold
- require review before applying large patches
- persist full logs for audit
- include verification results in the UI

## 12. Product Boundary

The current Photoweb scope docs explicitly exclude in-app AI/automation today.

So treat this as a new product layer:

- not core editor behavior
- not part of compositor/tool/history architecture
- a development-assistant subsystem

That means it should remain loosely coupled:

- it should not directly mutate editor state
- it should not bypass existing app/store architecture
- it should mostly interact through the repo and the host service

## 13. Recommended File Layout

Suggested repo additions:

```text
src/
  components/
    Overlay/
      RequirementsOverlay.tsx
      RequirementsFab.tsx
      RequirementsPopup.tsx
      RequirementList.tsx
      RequirementDetail.tsx
  hooks/
    useRequirementEvents.ts
  store/
    requirementsSlice.ts
  bridge/
    requirementsClient.ts

host/
  src/
    server.ts
    routes/requirements.ts
    queue/RequirementQueue.ts
    runner/AgentRunner.ts
    runner/adapters/CodexAdapter.ts
    runner/adapters/ClaudeCodeAdapter.ts
    workspace/WorkspaceManager.ts
    persistence/RequirementStore.ts
    events/EventBus.ts
```

## 14. Integration With Existing App Files

Concrete repo touch points:

- `src/App.tsx`
  - mount `RequirementsOverlay`
- `src/store/editorStore.ts`
  - compose `requirementsSlice`
- `src/store/types.ts`
  - add overlay and requirement types
- `src/components/layout/MainLayout.tsx`
  - no required structural changes if overlay is fixed-position

Avoid:

- mixing requirement queue state into document/history slices
- treating requirement items as editor history entries
- placing host logic inside canvas/tool files

## 15. MVP Scope

Build the smallest useful version first.

### MVP features

- top-left icon button
- expandable popup
- submit requirement text
- local host accepts request
- persistent queue list
- one active job at a time
- host streams logs
- host marks `done` or `blocked`
- user sees changed files and verification results

### Not in MVP

- multiple concurrent agents
- auto-merge without review
- screenshot/video context capture
- rich threaded conversations per requirement
- cloud sync or remote execution
- permissions UI for arbitrary shell commands

## 16. Suggested Phases

### Phase 1: Overlay shell

- add UI icon and popup
- add frontend requirement slice
- mock data only

### Phase 2: Local host bridge

- implement local host service
- connect `POST /requirements` and `GET /requirements`
- add SSE updates

### Phase 3: Queue persistence

- persist requirements on disk
- restore queue on restart
- add retry/cancel

### Phase 4: Agent execution

- add adapter abstraction
- run one requirement at a time
- capture logs and verification

### Phase 5: Safe apply workflow

- add worktree or branch isolation
- add review gate before apply
- expose changed files and diff summary

### Phase 6: Better context and UX

- submit active editor context
- add filtering, search, badges, and health status

## 17. Key Design Decisions

### Decision 1: Browser app stays thin

The web app should be a client for the requirement system, not the executor.

### Decision 2: Host is source of truth

If the app reloads, queue state should still be correct.

### Decision 3: One requirement at a time first

Parallel agent runs sound attractive but increase merge conflicts and user confusion.

### Decision 4: Reviewable changes beat silent changes

For a coding assistant inside a development app, trust comes from visible status and safe apply steps.

## 18. Recommended First Implementation Contract

If you build this next, I would define the first slice like this:

1. Add `RequirementsOverlay` to `src/App.tsx`.
2. Add `requirementsSlice` with mock items.
3. Add a tiny Node host in `host/` with:
   - `POST /requirements`
   - `GET /requirements`
   - `GET /events`
4. Wire the overlay to the host.
5. Implement a fake runner first that:
   - waits a few seconds
   - emits log events
   - marks an item `done`
6. Replace the fake runner with a real agent adapter.

This gives you the UI contract and queue contract before you introduce risky code-editing automation.

## Final Recommendation

Your idea is good, but it should be treated as a **local agent platform around Photoweb**, not as a normal panel inside Photoweb.

The clean architecture is:

- React overlay in the app
- local host service for queue and execution
- agent adapter layer for Codex or Claude Code
- isolated workspace for safe code changes
- streamed status back to the overlay

If you want, the next step can be to turn this design into a concrete implementation plan and scaffold the Phase 1 overlay plus Phase 2 host bridge in this repo.
