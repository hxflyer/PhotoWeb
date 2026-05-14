# 24 Type Basics Plan

## Goals

### Feature: Live Type Options Bar

**What it does** — The Type Options Bar controls font family, font style, size, anti-aliasing, bold/italic/underline, alignment, and type color.

**Photoshop habit preserved** — Selecting the Type Tool immediately exposes the common type controls in the Options Bar.

**Invocation** — Press `T`, select or create type, then change controls in the Options Bar.

**Post-conditions** — Edits affect the active edit session, selected type layer, or default style for the next type layer.

### Feature: Point And Area Type

**What it does** — Click creates point type; click-drag creates an area type box with stored `textMode: 'box'` and editable dimensions.

**Photoshop habit preserved** — The same Type Tool creates both kinds of type depending on click vs drag.

**Invocation** — Press `T`, click or drag on canvas.

**Post-conditions** — A Type layer is created and enters edit mode.

### Feature: Type Color Sampling From Image

**What it does** — While the Color Picker is open for Type Color, clicking the document canvas samples a pixel into the picker.

**Photoshop habit preserved** — Photoshop temporarily turns the cursor into the Eyedropper when the Color Picker is open over the image.

**Invocation** — Click Type Options Bar color swatch, click a color on the canvas, click OK.

**Post-conditions** — The sampled color is committed to the type style.

### Feature: Character / Paragraph Panel Access

**What it does** — The Type Options Bar panel button makes Character and Paragraph panels visible and expands their dock group.

**Photoshop habit preserved** — Photoshop's Options Bar includes a Character/Paragraph panel toggle.

**Invocation** — Click the panel icon in the Type Options Bar.

**Post-conditions** — Character and Paragraph panel tabs are visible.

## Files Edited / Created

- `src/components/Panels/OptionsBar.tsx` — wired Type Options Bar controls.
- `src/components/Dialogs/ColorPickerDialog.tsx` — canvas sampling while picker is open.
- `src/components/Canvas/Viewport.tsx` — stable canvas sampling attribute.
- `src/test/24-type-basics.test.tsx` — focused regressions.

## Test Cases

- Type Tool creates point type on click and area type on drag.
- Type Options Bar updates selected type layer style.
- Type Options Bar color swatch opens the Type Color Picker target.
- Color Picker samples from the canvas and confirms the sampled color.
- Existing type editing, transform, and Warp Text tests stay green.

## Divergences From Photoshop

- Overflow uses browser edit constraints instead of Photoshop's visible overflow marker.
- Kerning/OpenType buttons remain partial because the browser canvas font stack does not expose Photoshop-level typography internals.
