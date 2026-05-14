# 175 feather-quick-mask
- Lesson path: `doc/photoshop-essentials-basics/feather-quick-mask/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `16a-edge-refinement`

## Lesson Expectations
- Q toggles Quick Mask; selection appears as a red overlay (`selections-feather-quick-mask-photoshop-quick-mask-mode-db7e9542.jpg`).
- Double-click Quick Mask icon adjusts overlay color/opacity.
- Painting and Gaussian Blur inside Quick Mask create previewable feathered selections; Q exits back to marching ants.

## Photoweb Coverage
- Q toggles quick mask in `src/App.tsx:531`.
- Gaussian Blur is routed to the Quick Mask buffer with preview/cancel handling in `src/App.tsx:1131`.
- Tests cover Quick Mask Gaussian Blur preview, cancel restore, and partial coverage preservation in `src/test/16a-edge-refinement.test.tsx:59`.

## Gaps / Mismatches
- No evidence of a Quick Mask options dialog for changing overlay color/opacity by double-clicking the toolbar icon.
- Brush painting in Quick Mask should be checked visually if not already covered by mask-paint tests.

## Scope Decision
Fix.

## Recommended Follow-up
Add Quick Mask overlay color/opacity controls or log the omission; add/confirm a brush-in-Quick-Mask test.
