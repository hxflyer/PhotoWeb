# 103 access-refine-edge-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/access-refine-edge-photoshop-cc-2018/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `16a-edge-refinement`

## Lesson Expectations
- Start with an existing selection, hold Shift, and choose Select > Select and Mask to open classic Refine Edge rather than the newer Select and Mask workspace (`2018-access-refine-edge-photoshop-choose-select-and-mask-0ee05e3d.png`, `2018-access-refine-edge-photoshop-refine-edge-dialog-box-9f5ebd1f.png`).
- Refine Edge cannot create selections from scratch.

## Photoweb Coverage
- Select > Select and Mask opens the existing Refine Edge dialog (`src/components/layout/MenuBar.tsx:554`, `src/test/16a-edge-refinement.test.tsx:150`).
- Refine Edge dialog exposes Radius/Smooth/Feather/Contrast/Shift Edge, Smart Radius, view modes, and Output To (`src/components/Dialogs/RefineEdgeDialog.tsx:164`, `src/components/Dialogs/RefineEdgeDialog.tsx:200`, `src/components/Dialogs/RefineEdgeDialog.tsx:240`).
- Divergence is documented: one refinement dialog instead of separate classic/new workspace (`doc/photoshop-essentials-basics/divergence-log.md:425`).

## Gaps / Mismatches
- Shift-modified menu access is intentionally collapsed; no separate Select and Mask workspace exists.
- No selection precondition enforcement was confirmed from this pass.

## Scope Decision
Divergence already accepted.

## Recommended Follow-up
Verify/grayout behavior when no selection exists; otherwise no action.
