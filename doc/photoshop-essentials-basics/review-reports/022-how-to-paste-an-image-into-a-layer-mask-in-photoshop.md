# 022 how-to-paste-an-image-into-a-layer-mask-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/how-to-paste-an-image-into-a-layer-mask-in-photoshop/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 17-layer-masks

## Lesson Expectations
- Add a mask to a layer, open/copy another image, Alt/Option-click or select the mask thumbnail to view the mask, paste image luminance into the mask, transform it, deselect, and adjust contrast/fade.
- Screenshots include `2023-paste-into-layer-mask-add-layer-mask-c299392c.png`, `2023-paste-into-layer-mask-click-layer-mask-thumbnail-f67dd678.png`, and `2023-paste-into-layer-mask-viewing-layer-mask-70b29ab5.png`.

## Photoweb Coverage
- Store has a dedicated `Paste Into Layer Mask` command (`src/store/documentSlice.ts:713`).
- Test verifies paste writes clipboard luminance into the active mask (`src/test/17-layer-masks.test.tsx:86`).
- Mask thumbnail modifier tests cover target/view/disable/load behaviors (`src/test/17-layer-masks.test.tsx:58`).
- Free Transform exists for layer/mask content positioning workflows (`src/components/Canvas/FreeTransformOverlay.tsx:2`).

## Gaps / Mismatches
- Multi-document tab switching from the lesson is simplified under photoweb's scoped file/document model; the mask-paste behavior itself is covered.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
