# 169 clipping-masks-and-type
- Lesson path: `doc/photoshop-essentials-basics/clipping-masks-and-type/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `18-clipping-masks`

## Lesson Expectations
- Create text, resize with Free Transform, place image layer directly above Type layer, then Layer > Create Clipping Mask, right-click Create Clipping Mask, or Ctrl/Cmd+Alt/Option+G.
- Layers panel should show clipped top layer indented/marked; image is visible only through type pixels. UI grounded by `clipping-masks-type-select-top-layer-f04ea38c.gif` and `clipping-masks-type-clipping-mask-...` screenshots.
- Type remains moveable/warpable and layer styles can be added after clipping.

## Photoweb Coverage
- Store implements create/release/toggle clipping masks in `src/store/layersSlice.ts:946`.
- Cmd/Ctrl+Alt+G toggles clipping in `src/App.tsx:629`; Layer menu exposes Create Clipping Mask in `src/components/layout/MenuBar.tsx`.
- Layers panel row shows clipped state and an indicator; tests verify compositor clipping, menu/shortcut toggle, and Alt-click row toggle in `src/test/18-clipping-masks.test.tsx:77`.

## Gaps / Mismatches
- No obvious gap in clipping behavior found.
- Lesson's Free Transform/type resizing and layer styles are covered by other clusters; this report did not find a clipping-specific mismatch there.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
