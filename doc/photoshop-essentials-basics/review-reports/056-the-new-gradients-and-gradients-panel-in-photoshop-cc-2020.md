# 056 the-new-gradients-and-gradients-panel-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/the-new-gradients-and-gradients-panel-in-photoshop-cc-2020/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: none

## Lesson Expectations
- Window > Gradients opens the CC 2020 Gradients panel with color-theme groups, recents, thumbnail/list size menu, New Group/New Gradient/Delete icons, and Legacy Gradients command.
- Ctrl/Cmd-click group arrows expands/collapses all sets.
- Screenshots grounding UI: `2020-gradients-panel-open-gradients-panel-photoshop-00fc688b.png`, `2020-gradients-panel-default-gradients-photoshop-cc2020-53f94396.png`, `2020-gradients-panel-gradient-thumbnail-sizes-2ceff212.png`, `2020-gradients-panel-legacy-gradients-62ca6622.png`.

## Photoweb Coverage
- Gradient editing/drawing exists, but a Photoshop-style Gradients panel was not found in inspected `src/components/Panels` files.
- Gradient Editor dialog exists at `src/components/Dialogs/GradientEditorDialog.tsx:344`.

## Gaps / Mismatches
- No Window > Gradients panel toggle identified.
- No recents row, thumbnail/list sizing, or Legacy Gradients command.
- This lesson is excluded as version-changelog/preset UI, but it reveals a recurring panel-level gradient gap.

## Scope Decision
out of scope

## Recommended Follow-up
No action for CC 2020 legacy/default panel churn; consider a separate product decision on whether a Gradients panel is needed for in-scope gradient editing.

