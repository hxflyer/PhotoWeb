# 077 preview-layer-blend-modes-photoshop-cc-2019
- Lesson path: `doc/photoshop-essentials-basics/preview-layer-blend-modes-photoshop-cc-2019/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 09-blend-modes

## Lesson Expectations
- Open Layers panel Blend Mode menu, hover over modes to preview result on canvas; moving away reverts, clicking commits.
- Shift+Plus/Minus cycles modes from keyboard.
- Screenshots grounding UI: `2019-blend-mode-previews-layer-blend-mode-option-51fd04e9.png`, `2019-blend-mode-previews-layer-blend-modes-photoshopcc2019-04586888.png`, `2019-blend-mode-previews-blend-mode-preview-26197da3.jpg`, `2019-blend-mode-previews-cycle-layer-blend-modes-keyboard-1935e9c4.jpg`.

## Photoweb Coverage
- Layers panel BlendModeMenu opens a Photoshop-style list, previews on mouse enter/focus, reverts on leave, and commits on click in `src/components/Panels/LayersPanel.tsx:281`.
- Store has preview and committed blend-mode paths in `src/store/layersSlice.ts:732` and `src/store/layersSlice.ts:742`.
- Shift+Plus/Minus cycles blend modes when not in paint-family tools in `src/App.tsx:672`.
- Tests cover hover preview/revert/commit, Shift+Plus/Minus, and visible composite changes in `src/test/09-blend-modes.test.tsx:57`.

## Gaps / Mismatches
- None found after checking core menu behavior.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.

