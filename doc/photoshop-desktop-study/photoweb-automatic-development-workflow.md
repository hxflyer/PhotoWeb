# Photoweb Automatic Development Workflow

Purpose: turn the Photoweb development plan into a repeatable implementation loop where an agent can pick one or two requirements, implement them, add tests, verify, mark progress, and continue.

Primary backlog: `doc/photoshop-desktop-study/photoweb-implementation-backlog.md`

Primary plan: `doc/photoshop-desktop-study/photoweb-development-plan.md`

## Operating Principle

Photoweb development should proceed as a controlled queue, not as open-ended feature work.

Each cycle should:
- Pick at most 1 or 2 requirements.
- Read the related comparison notes and existing code.
- Design tests before or alongside implementation.
- Implement the smallest complete vertical slice.
- Run typecheck, lint, and tests.
- Fix bugs until green.
- Mark the backlog item complete.
- Stop unless the user explicitly says to continue.

## Requirement Status Values

Use these status labels in the backlog:
- `[ ]`: Not started.
- `[~]`: In progress.
- `[x]`: Complete and verified.
- `[!]`: Blocked.
- `[>]`: Deferred by scope decision.

Do not mark `[x]` unless all acceptance criteria and required tests are complete.

## Development Cycle

1. Read the current scope.
   - Open `photoweb-development-plan.md`.
   - Open this workflow file.
   - Open `photoweb-implementation-backlog.md`.
   - Confirm the next unchecked item is still in scope.

2. Select work.
   - Choose the first unchecked requirement in order unless a dependency blocks it.
   - If the item is small, optionally choose the next closely related item.
   - Never pick more than two requirements in one cycle.
   - Change selected items from `[ ]` to `[~]`.

3. Read sources.
   - Read the linked comparison document section.
   - Read the original note file when behavior details matter.
   - Read the relevant source code under `src/`.
   - Read nearby tests under `src/test/`.

4. Define the implementation contract.
   - Restate what the feature must do.
   - List user-facing behavior.
   - List data/store changes.
   - List new tests.
   - List files likely to change.

5. Write or update tests.
   - Add simulator/tool-level tests in `src/test/<area>.test.ts` or `.tsx`.
   - Test names should describe user actions.
   - Use `runScript`, `makeToolPointerEvent`, `pixelAt`, or `layerPixelAt` where appropriate.
   - For UI changes, use Testing Library and simulator events.
   - For store logic, assert state changes and undo/redo behavior.

6. Implement.
   - Keep the slice complete but narrow.
   - Use existing architecture: Zustand slices, tool registry, compositor, dialogs, panels, and history actions.
   - Every pixel/state-changing user operation must be undoable when the feature touches document content.
   - Avoid adding dependencies unless explicitly approved.

7. Verify.
   - Run `npx tsc -b`.
   - Run `npm run lint`.
   - Run `npm test`.
   - Fix all feature-related failures.
   - If existing unrelated lint/test failures appear, record them in the backlog item notes instead of hiding them.

8. Update tracking.
   - Change `[~]` to `[x]` only when verification passed.
   - Add implementation notes under the backlog item: files changed, tests added, commands run.
   - If blocked, change to `[!]` and state the blocker clearly.

9. Stop or continue.
   - Stop after one cycle unless the user explicitly asked to continue.
   - If continuing, repeat from step 1.

## Definition Of Done

Each requirement is done only when:
- User-facing behavior matches the acceptance criteria.
- New or updated tests cover the feature.
- Undo/redo behavior is covered for document-mutating features.
- `npx tsc -b` passes.
- `npm run lint` has no new errors.
- `npm test` passes.
- Backlog status is updated to `[x]`.

## Backlog Item Template

Use this structure when adding new requirements:

```md
- [ ] `REQ-ID` Requirement title
  - Priority: `P0 | P1 | P2`
  - Source notes: `comparison-file.md`, `pages/source-note.md`
  - Function description: What the user can do and why it matters.
  - Acceptance criteria:
    - Concrete observable behavior.
    - Edge cases.
    - Undo/redo expectations where applicable.
  - Required tests:
    - Test file.
    - User action to simulate.
    - State/pixel/UI assertion.
  - Dependencies: Requirement IDs or `None`.
  - Implementation notes: Filled during/after work.
```

## Picking Rules

- Always finish `P0` items before `P1` unless the user asks otherwise.
- Treat the history foundation as implemented, but do not start new document-mutating feature work unless it can use the existing command/history support.
- Prefer vertical slices over broad refactors.
- If an item grows too large, split it into smaller backlog items before coding.
- Keep excluded features out of the backlog unless they are explicitly marked `[>]`.

## Exclusion Guardrail

Do not add implementation tickets for:
- AI or generative features.
- Cloud collaboration or Adobe integrations.
- Print/CMYK/spot color workflows.
- Video/timeline/animation.
- Actions/batch automation.
- Help/release-note/support content.
- Smart Objects or Smart Filters.
- PSD/PSB/PDF/TIFF professional compatibility.
- Advanced export features the user declined.

## Current Cycle Recommendation

Next focus:
- `PROPS-01` Active layer Properties panel shell.
- Then `PROPS-02` and `PROPS-03` for editing existing adjustment and fill layer parameters.

Reason:
- `HIST-01` through `HIST-05` and `LAYERS-01` through `LAYERS-05` are implemented and verified.
- The app now has enough history/layer foundation to make layer-specific Properties editing the next highest-leverage feature family.
