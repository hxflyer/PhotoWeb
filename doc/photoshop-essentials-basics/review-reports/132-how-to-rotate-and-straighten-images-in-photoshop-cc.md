# 132 how-to-rotate-and-straighten-images-in-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/how-to-rotate-and-straighten-images-in-photoshop-cc/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `05c-rotate-straighten`

## Lesson Expectations
- Crop Tool rotates the image when dragging outside the crop border, with a rotation cursor and rule-of-thirds grid feedback.
- Crop border can be resized after rotation before committing.
- Straighten Tool in the Crop options draws along a horizon line.
- Ruler Tool, hidden behind Eyedropper, allows endpoint adjustment and Straighten Layer.
- Grounding screenshots include `crop-and-straighten-rotate-straighten-photoshop-rotate-image-cursor-3253534a.jpg`, `crop-and-straighten-rotate-straighten-photoshop-straighten-tool-dac48dae.png`, and `crop-and-straighten-rotate-straighten-photoshop-ruler-tool-straighten-layer-e9aa7401.png`.

## Photoweb Coverage
- `src/store/documentSlice.ts:295` implements canvas rotation and `src/store/documentSlice.ts:325` implements straighten active layer.
- `src/tools/crop.ts:257` implements crop straightening from a drawn line; `src/tools/crop.ts:275` handles crop keyboard commands and overlays.
- `src/tools/ruler.ts:49` exposes Ruler straightening, with the tool behavior in `src/tools/ruler.ts:66`.
- `src/test/05c-rotate-straighten.test.tsx:63` covers arbitrary image rotation, `src/test/05c-rotate-straighten.test.tsx:100` covers Crop straighten, and `src/test/05c-rotate-straighten.test.tsx:132` covers Ruler straighten.

## Gaps / Mismatches
- Crop Tool free rotation by dragging outside the crop border was not found; Crop straightening is covered, but Photoshop's outside-border rotate habit appears missing.
- No evidence of Photoshop-like rotate cursor or grid feedback while rotating the crop box.

## Scope Decision
Fix

## Recommended Follow-up
Implement and test outside-crop-border rotation affordances, including cursor state, live grid feedback, and commit/cancel behavior.
