# 009 clipping-masks-essentials
- Lesson path: `doc/photoshop-essentials-basics/clipping-masks-essentials/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 18-clipping-masks

## Lesson Expectations
- A clipped layer displays only where the layer below has opaque pixels; create/release via Layer > Create Clipping Mask, shortcut Ctrl/Cmd+Alt+G, or Alt/Option-click between layers.
- Screenshots such as `cc-clipping-masks-photoshop-create-clipping-mask-command-ec7e747a.png` and layer-panel indicators ground the UI.

## Photoweb Coverage
- Layer model persists `clippedToBelow` (`src/core/Layer.ts:142`, `src/core/persistence.ts:31`).
- Store toggles create/release clipping mask with history (`src/store/layersSlice.ts:948`, `src/store/layersSlice.ts:975`, `src/store/layersSlice.ts:987`).
- Menu and shortcut expose Create/Release Clipping Mask (`src/components/layout/MenuBar.tsx:453`, `src/core/shortcuts.ts:53`).
- Tests cover compositing, menu/shortcut, Alt-click row toggle, and Layers panel indicator (`src/test/18-clipping-masks.test.tsx:77`, `src/test/18-clipping-masks.test.tsx:93`, `src/test/18-clipping-masks.test.tsx:105`).

## Gaps / Mismatches
- None found after checking clipping mask code, menus, persistence, and tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
