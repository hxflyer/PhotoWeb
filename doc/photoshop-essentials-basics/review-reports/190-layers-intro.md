# 190 layers-intro
- Lesson path: `doc/photoshop-essentials-basics/layers-intro/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Demonstrates why layers matter by drawing/filling a selection on the Background, then showing that edits are permanent without separate layers.
- Uses File > New, Rectangular Marquee, Edit > Fill/Color Picker, and Layers panel (`layers-new-edit-fill-3d33eca9.gif`, `layers-new-selection-filled-red-e8af97c1.gif`).

## Photoweb Coverage
- New Document dialog and document creation are implemented in `src/components/Dialogs/NewDocumentDialog.tsx` and `src/store/documentSlice.ts:495`.
- Rectangular Marquee and selection fill paths exist through selection tools and Fill dialog (`src/components/Dialogs/FillDialog.tsx:86`).
- Layers panel supports independent layer creation and editing in `src/components/Panels/LayersPanel.tsx:620`.

## Gaps / Mismatches
- The conceptual "without layers this is destructive" behavior is naturally present, but no dedicated tutorial-state gap is needed in the app.
- No functional gap found for the app target.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
