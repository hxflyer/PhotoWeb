# 072 auto-select-layers-photoshop
- Lesson path: `doc/photoshop-essentials-basics/auto-select-layers-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 08a-layer-ops

## Lesson Expectations
- Move Tool (`V`) Options Bar Auto-Select checkbox, Layer/Group dropdown, click visible content to select corresponding layer.
- Drag a marquee with Move Tool to auto-select multiple layers; Ctrl/Cmd-click can temporarily auto-select while the checkbox is off.
- Background click deselects all because Background cannot be auto-selected.
- Screenshots grounding UI: `layers-auto-select-photoshop-move-tool-57ee8d51.png`, `layers-auto-select-photoshop-auto-select-layers-option-817bdb21.png`, `layers-auto-select-auto-select-layers-or-groups-photoshop-0c603e19.png`, `layers-auto-select-auto-select-multiple-layers-a3d996dc.jpg`.

## Photoweb Coverage
- Move Options Bar exposes Auto-Select checkbox and Layer/Group dropdown in `src/components/Panels/OptionsBar.tsx:249`.
- Move tool options support off/layer/group and Ctrl/Cmd temporary auto-select in `src/tools/move.ts:344`.
- Tests cover option toggling and layer/group auto-select in `src/test/moveToolSliceB.test.ts:134`.
- Align/distribute buttons also live in Move Options Bar and are tested in `src/test/08a-layer-ops.test.tsx:81`.

## Gaps / Mismatches
- Drag-marquee multi-layer auto-select was not verified in inspected tests.
- Background-click deselect-all behavior should be explicitly tested; current code likely needs audit.
- The Options Bar is close to Photoshop, but multi-select choreography is the weak point.

## Scope Decision
Fix

## Recommended Follow-up
Add simulator tests for Move Tool drag-marquee layer selection and Background-click deselect behavior.

