# 24 Type Basics Gap Report

Cluster: `24-type-basics`

## Lessons Reviewed

- `photoshop-type-essentials` — Type Tool `T`, point type, font family/style/size, text color, alignment, line breaks, commit/cancel, and re-editing.
- `area-type` — click-drag creates paragraph/area type boxes, wraps text, shows handles, and supports resizing.
- `font-size` — type size can be changed through Options Bar or Free Transform.
- `character-panel` — Character panel exposes font, style, size, anti-aliasing, leading, tracking, kerning, scale, baseline shift, faux styles, caps, super/sub, underline, strikethrough.
- `paragraph-panel` — Paragraph panel exposes alignment/justification, indents, paragraph spacing, and hyphenation.
- `how-to-choose-type-colors-from-images-with-photoshop` — opening the Type Color Picker lets the user sample colors directly from the image with an eyedropper cursor.

## Current Photoweb Coverage

- Type Tool already supported `T`, horizontal/vertical type, point type on click, area type on click-drag, re-editing existing type layers, contenteditable editing, line breaks, commit/cancel, and resize handles.
- Type layer data already stored `textMode`, `orientation`, rich `TextStyle`, style runs, transform, bounds, and Warp Text data.
- Character and Paragraph panels already mirrored most Photoshop controls and routed selected type-layer edits through undoable commands.
- Color Picker already supported type-target color commits via `openColorPicker('type')`, but the Type Options Bar did not use that target.

## Gaps

- Type Options Bar controls were mostly static placeholders and did not update default text style or selected type layers.
- Options Bar color swatch opened the Foreground Color Picker instead of the Type Color Picker.
- The Color Picker blocked the canvas, so Photoshop's “sample a type color from the image while the picker is open” workflow was unavailable.
- The visible document canvas had no stable attribute for picker sampling.

## Implemented Work

- Wired Type Options Bar font family, style, size, anti-aliasing, bold/italic/underline, alignment, and color swatch into the same type style pipeline used by Character/Paragraph panels.
- Options Bar edits now update an active editing session, the selected type layer, or the default style for the next type layer as appropriate.
- Changed the Options Bar type color swatch to open the Type Color Picker.
- Added Character/Paragraph panel reveal button behavior that makes both panels visible and expands the text panel group.
- Added canvas sampling while Color Picker is open: clicking the visible document canvas samples that pixel into the picker without triggering the active canvas tool.
- Marked the composited viewport canvas with `data-photoweb-canvas="true"` for dialog sampling.

## Verification

- Focused:
  - `npx tsc -b`
  - `npx vitest run src/test/24-type-basics.test.tsx src/test/typeToolSliceG.test.tsx src/test/shapeTransform.test.tsx src/test/warpText.test.ts`
- Full:
  - `npx tsc -b`
  - `npm run lint` — 16 existing warnings, 0 errors.
  - `npm test` — 168 files / 1259 tests.
  - Dev server smoke test: `curl -I http://127.0.0.1:5173/` returned `200 OK`.

## Photoshop Divergences Worth Keeping

- Area type overflow is prevented in the browser editor rather than showing Photoshop's plus-in-box overflow marker.
- Kerning and advanced OpenType feature buttons remain visible but limited because browser canvas text APIs do not expose full font-engine controls.
