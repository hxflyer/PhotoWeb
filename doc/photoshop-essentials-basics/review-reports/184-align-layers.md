# 184 align-layers
- Lesson path: `doc/photoshop-essentials-basics/align-layers/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `08a-layer-ops`

## Lesson Expectations
- Move Tool activates Align and Distribute icons in the Options Bar (`layers-align-layers-photoshop-align-distribute-options-ee0ef61f.gif`).
- Shift-click multiple layers in Layers panel, then align left/center/right or top/middle/bottom; distribute requires three or more layers.
- Commands align/distribute by layer contents, not just canvas bounds.

## Photoweb Coverage
- Layer menu exposes Align and Distribute commands in `src/components/layout/MenuBar.tsx:484`.
- Move Tool Options Bar exposes align/distribute controls; tests exercise selected layers and pixel positions in `src/test/08a-layer-ops.test.tsx:81`.
- Store includes align/distribute layer actions in `src/store/layersSlice.ts`.

## Gaps / Mismatches
- Need to verify disabled states: Photoshop only enables controls with enough selected layers.
- Content-bounds calculations should be regression-tested for transparent padding and groups.

## Scope Decision
Fix.

## Recommended Follow-up
Add tests for disabled controls and transparent-content bounds if they are not already covered.
