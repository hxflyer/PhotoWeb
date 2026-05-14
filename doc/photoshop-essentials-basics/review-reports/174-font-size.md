# 174 font-size
- Lesson path: `doc/photoshop-essentials-basics/font-size/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- Type color can be sampled from the image while Color Picker is open (`type-font-size-sample-color-c2539106.jpg`).
- Font size can be set in the Options Bar, but the recommended workflow is Ctrl/Cmd+T Free Transform on a Type layer for live scalable type.
- Type stays crisp because it remains vector/live type.

## Photoweb Coverage
- Type options expose font size/style/anti-alias controls and tests assert edits in `src/test/24-type-basics.test.tsx:118`.
- Type hit/edit data and raster commit live in `src/tools/type.ts:520` and `src/tools/type.ts:747`.
- Free Transform overlay commits type transforms with a specific history label in `src/App.tsx:1337`.

## Gaps / Mismatches
- Photoweb rasterizes type onto a layer canvas; even if data remains editable, it is not truly vector-rendered at arbitrary output scale like Photoshop.
- Color Picker image-sampling while the picker is open should be rechecked; code has dialog eyedropper hooks but this lesson-specific workflow needs a direct test.

## Scope Decision
Fix.

## Recommended Follow-up
Add a type-color eyedropper test from the Color Picker workflow and document any rasterized-type quality divergence.
