# Photoweb vs Photoshop Notes: Function Comparison 0311-0406

Scope: 100 generated Photoshop study note files in sorted order, from `0311` through `0406`. This batch includes duplicate OpenType spelling variants present in the source folder.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes typography theory or product documentation more than an editor function.

Relevant Photoweb code areas:
- Paint, brush, pencil, fill, gradient: `src/tools/brush.ts`, `src/tools/pencil.ts`, `src/tools/paintBucket.ts`, `src/tools/gradient.ts`, `src/utils/brushEngine.ts`
- Brush and tool options: `src/components/Panels/OptionsBar.tsx`, `src/store/toolsSlice.ts`
- Shapes, paths, pen tools: `src/tools/shapes.ts`, `src/tools/pen.ts`, `src/tools/pathSelection.ts`, `src/components/Panels/PathsPanel.tsx`
- Type tools and panels: `src/tools/type.ts`, `src/components/Canvas/TextEditOverlay.tsx`, `src/components/Panels/CharacterPanel.tsx`, `src/components/Panels/ParagraphPanel.tsx`
- Filters: `src/filters/*`, `src/components/Dialogs/FilterDialog.tsx`

## 0311 - Apply Painting Techniques

Source note: `pages/0311-apply-painting-techniques.md`

Function group: painting workflow overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Brush and Pencil painting`: `Present with differences`. Brush smoothing slider is now numeric and wired through the engine; pencil exposes a working spacing slider and reads brushSettings for size/opacity. Shift+B cycles Brush and Pencil.
- `Opacity/flow/size/hardness`: `Present with differences`.
- `Paint into a layer mask`: `Present with differences`. Brush, Eraser, and Pencil retarget into the active layer's mask canvas when the mask is the paint target.
- `Mixer Brush, art/history brush, advanced brush dynamics`: `Missing`.

Implementation notes:
- Photoweb supports practical pixel painting and mask painting, but not Photoshop's advanced painting engine.

## 0312 - Fill Objects, Selections, And Layers

Source note: `pages/0312-fill-objects-selections-and-layers.md`

Function group: fill workflows.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Paint Bucket/fill adjacent color areas`: `Present with differences`.
- `Fill selection/layer with foreground color`: `Present with differences`.
- `Pattern/content-aware/history fill`: `Missing`.

Implementation notes:
- Fill operations are color/gradient focused, not pattern/content-aware/history based.

## 0313 - Painting Tools Overview

Source note: `pages/0313-painting-tools-overview.md`

Function group: painting tool catalog.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Brush and Pencil`: `Present with differences`. Shift+B cycles between them.
- `Gradient and Paint Bucket`: `Present with differences`. Shift+G cycles between them; gradient now supports Smooth (linear-light) vs Classic (sRGB) interpolation and a working Transparency toggle.
- `Eraser, Dodge, Burn, Sponge`: `Present with differences`. Eraser Mode dropdown (Brush/Pencil/Block) is functional and reads size/hardness/opacity/flow from the store; Dodge/Burn Range and Exposure are functional; Sponge Mode (Desaturate/Saturate) and Vibrance toggle are functional. Shift+O cycles Dodge / Burn / Sponge.
- `Mixer Brush, History Brush, Art History Brush`: `Missing`.

Implementation notes:
- The toolbar includes core paint/fill tools with working option wiring; advanced Photoshop catalog entries are still absent.

## 0314 - Fill Adjacent Areas With Similar Colors

Source note: `pages/0314-fill-adjacent-areas-with-similar-colors.md`

Function group: Paint Bucket fill.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Tolerance`: `Present with differences`.
- `Contiguous`: `Present with differences`.
- `Anti-alias and sample all layers`: `Present with differences`.
- `Pattern fill source`: `Missing`. Paint Bucket only fills with the foreground color; pattern fills are not supported.

Implementation notes:
- Implemented in `paintBucket` with OptionsBar controls. Shift+G cycles Bucket and Gradient.

## 0315 - Stroke A Selection Or Layer With Color

Source note: `pages/0315-stroke-a-selection-or-layer-with-color.md`

Function group: stroke command.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Edit > Stroke selection/layer`: `Missing`.
- `Stroke width/color/location/blend/opacity`: `Partial`. A Stroke layer effect (outside / center / inside) is now available as a layer style on any layer, covering the location dimension of the Photoshop Stroke command, but no Edit > Stroke command exists yet.
- `Shape stroke controls`: `Partial`. Shape options still expose stroke-like fields, and shape strokes can also be expressed via the new Stroke layer effect.

Implementation notes:
- Users can apply a stroke as a non-destructive layer effect or draw strokes manually; the menu-driven Edit > Stroke command is still absent.

## 0316 - Use Content-Aware, Pattern, Or History Fills

Source note: `pages/0316-use-content-aware-pattern-or-history-fills.md`

Function group: advanced fill sources.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Content-Aware Fill`: `Missing`.
- `Pattern Fill command`: `Missing`.
- `History Fill`: `Missing`.

Implementation notes:
- Photoweb supports color/gradient fills, not these fill sources.

## 0317 - Fill The Work Canvas

Source note: `pages/0317-fill-the-work-canvas.md`

Function group: canvas/background filling.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Fill canvas with color`: `Present with differences` through Paint Bucket or background/canvas operations.
- `Canvas extension color`: `Present with differences`.
- `Pattern/content-aware canvas fill`: `Missing`.

Implementation notes:
- Canvas Size can extend with transparent, white, or black; painting tools handle manual fills.

## 0318 - Fill A Selection Or Layer With Color

Source note: `pages/0318-fill-a-selection-or-layer-with-color.md`

Function group: solid color fill.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Fill selected pixels/layer with color`: `Present with differences`.
- `Solid Color fill layer`: `Present with differences`.
- `Photoshop Fill dialog blend/options`: `Partial`.

Implementation notes:
- Color fills are available, but the exact Photoshop Fill dialog is not.

## 0319 - Create A New Layer When Brushing

Source note: `pages/0319-create-a-new-layer-when-brushing.md`

Function group: non-destructive painting on new layers.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create blank layer`: `Present with differences`.
- `Paint on separate layer`: `Present with differences`.
- `Automatic new layer while brushing`: `Missing`.

Implementation notes:
- Users can add a layer manually before painting.

## 0320 - Create And Fill With Patterns

Source note: `pages/0320-create-and-fill-with-patterns.md`

Function group: pattern creation and fill.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Pattern preset creation`: `Missing`.
- `Pattern fill layer/fill command`: `Missing`.
- `Pattern libraries`: `Missing`.

Implementation notes:
- No pattern system exists.

## 0321 - Pattern Preview Best Practices

Source note: `pages/0321-pattern-preview-best-practices.md`

Function group: Pattern Preview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Pattern Preview mode`: `Missing`.
- `Tiled repeat preview`: `Missing`.
- `Seamless pattern workflow`: `Missing`.

Implementation notes:
- Depends on absent pattern tools.

## 0322 - Create A New Pattern

Source note: `pages/0322-create-a-new-pattern.md`

Function group: defining new pattern presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Define Pattern`: `Missing`.
- `Name pattern preset`: `Missing`.
- `Reuse pattern in fill/stroke`: `Missing`.

Implementation notes:
- No pattern preset storage exists.

## 0323 - Brushes And Presets

Source note: `pages/0323-brushes-and-presets.md`

Function group: brush system and presets.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Brush tool settings`: `Present with differences`. Size, hardness, opacity, flow, spacing, and a numeric smoothing slider are all wired.
- `Brush presets`: `Missing`.
- `Brush Settings panel dynamics`: `Missing`. No advanced dynamics UI (shape dynamics, scattering, texture, dual brush, color dynamics, transfer, brush pose, noise, wet edges, build-up, smoothing dynamics) exists.

Implementation notes:
- Photoweb has the basic brush parameters wired, but no preset or dynamics ecosystem.

## 0324 - Get Started With Brush Presets

Source note: `pages/0324-get-started-with-brush-presets.md`

Function group: using brush presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Preset brush list`: `Missing`.
- `Switch brush tip presets`: `Missing`.
- `Brush preset preview thumbnails`: `Missing`.

Implementation notes:
- Current brush selection is parameter-based.

## 0325 - Display The Brush Settings Panel And Brush Options

Source note: `pages/0325-display-the-brush-settings-panel-and-brush-options.md`

Function group: brush settings UI.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Options bar brush controls`: `Present with differences`. OptionsBar exposes size, hardness, opacity, flow, spacing, and numeric smoothing for Brush, plus spacing for Pencil.
- `Brush Settings panel`: `Missing`.
- `Shape dynamics/scattering/texture/dual brush`: `Missing`. Dynamics (shape, scatter, texture, dual brush, color, transfer, brush pose, noise, wet edges, build-up, smoothing dynamics) have no UI.

Implementation notes:
- OptionsBar covers basic brush parameters; advanced dynamics are not exposed.

## 0326 - Create A Brush Tip From An Image

Source note: `pages/0326-create-a-brush-tip-from-an-image.md`

Function group: custom brush tip creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Define Brush Preset from selection/image`: `Missing`.
- `Use image as brush tip`: `Missing`.
- `Save custom tip`: `Missing`.

Implementation notes:
- Brush tip is generated procedurally, not user-defined from image data.

## 0327 - Create A Brush And Set Painting Options

Source note: `pages/0327-create-a-brush-and-set-painting-options.md`

Function group: custom brush creation.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Set basic painting options`: `Present with differences`. Size, hardness, opacity, flow, spacing, and smoothing are wired through the store.
- `Create named brush preset`: `Missing`.
- `Advanced brush dynamics`: `Missing`.

Implementation notes:
- Brush parameters can be changed but not saved as custom brushes.

## 0328 - Select A Preset Brush

Source note: `pages/0328-select-a-preset-brush.md`

Function group: selecting brush presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Brush preset picker`: `Missing`.
- `Preset thumbnails/search`: `Missing`.
- `Recent/imported brushes`: `Missing`.

Implementation notes:
- No preset picker exists.

## 0329 - Create A New Preset Brush

Source note: `pages/0329-create-a-new-preset-brush.md`

Function group: saving brush presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `New Brush Preset`: `Missing`.
- `Capture tool settings`: `Missing`.
- `Persist preset`: `Missing`.

Implementation notes:
- No brush preset storage exists.

## 0330 - Create Preset Brush Groups

Source note: `pages/0330-create-preset-brush-groups.md`

Function group: brush preset organization.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Brush groups/folders`: `Missing`.
- `Move brushes into groups`: `Missing`.
- `Group import/export`: `Missing`.

Implementation notes:
- Depends on absent preset system.

## 0331 - Rename Preset Brushes

Source note: `pages/0331-rename-preset-brushes.md`

Function group: brush preset renaming.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Rename brush preset`: `Missing`.
- `Preset list context menu`: `Missing`.
- `Persist renamed preset`: `Missing`.

Implementation notes:
- No brush presets exist.

## 0332 - Delete Preset Brushes

Source note: `pages/0332-delete-preset-brushes.md`

Function group: brush preset deletion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Delete brush preset`: `Missing`.
- `Restore/default brush management`: `Missing`.
- `Brush library state`: `Missing`.

Implementation notes:
- No preset library exists.

## 0333 - Import Brushes And Brush Packs

Source note: `pages/0333-import-brushes-and-brush-packs.md`

Function group: importing brush packs.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Import ABR/brush pack`: `Missing`.
- `Brush library merge`: `Missing`.
- `Third-party brush compatibility`: `Missing`.

Implementation notes:
- No external brush format parser exists.

## 0334 - Draw Shapes And Paths

Source note: `pages/0334-draw-shapes-and-paths.md`

Function group: shape and path drawing overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Shape tools`: `Present with differences`. Shift+U cycles registered shape variants.
- `Pen/freeform pen paths`: `Present with differences`. Shift+P cycles Pen and Freeform Pen.
- `Path selection/direct selection`: `Present with differences`. Shift+A cycles Direct Selection and Path Selection.
- `Custom shapes/vector editing parity`: `Missing` or limited.

Implementation notes:
- Photoweb covers basic paths/shapes with consistent tool cycling, but not Photoshop's full vector toolset.

## 0335 - Create Shapes

Source note: `pages/0335-create-shapes.md`

Function group: creating shape layers/pixels.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Rectangle/rounded rectangle/ellipse shape drawing`: `Present with differences`.
- `Polygon and line shape drawing`: `Present with differences`.
- `Shape/path/pixels modes`: `Present with differences`. Pen mode tabs (Path / Shape / Pixels) are now functional: Shape rasterizes the path filled with the primary color, Pixels strokes the path at the current brush size, and Path keeps a vector path. Shape layers still rasterize on commit rather than persisting as live vector layers.
- `Custom shape library`: `Missing`.

Implementation notes:
- Shape modes drive distinct output behavior; the live Photoshop shape-layer model is still simplified.

## 0336 - Drawing Tools Overview

Source note: `pages/0336-drawing-tools-overview.md`

Function group: drawing tool catalog.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Pen and Freeform Pen`: `Present with differences`. Shift+P cycles between them.
- `Shape tools`: `Present with differences`. Shift+U cycles registered shape variants.
- `Path selection tools`: `Present with differences`. Shift+A cycles Direct Selection and Path Selection.
- `Custom Shape/Content-Aware Tracing`: `Missing`.

Implementation notes:
- Core manual drawing tools and tool-cycling shortcuts are wired up.

## 0337 - Draw Shapes

Source note: `pages/0337-draw-shapes.md`

Function group: drawing geometric shapes.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Rectangle and ellipse/circle`: `Present with differences`.
- `Polygon and line tools`: `Present with differences`.
- `Fill/stroke options`: `Present with differences`. Stroke can now be applied as a layer effect (outside / center / inside) on shape layers; OptionsBar shape stroke fields remain.
- `Custom shape options`: `Missing` or non-functional.

Implementation notes:
- Shape tool coverage is basic; stroke effect comes through the layer-styles system.

## 0338 - Modify Fill And Stroke For Shapes

Source note: `pages/0338-modify-fill-and-stroke-for-shapes.md`

Function group: shape styling.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Shape fill color`: `Present with differences`.
- `Stroke controls`: `Present with differences`. A Stroke layer effect with outside / center / inside alignment is now available on any layer, including shape layers. This is a layer-style effect rather than a live shape-tool stroke.
- `Advanced stroke alignment/dashes/caps/joins`: `Partial`. Outside/center/inside alignment are exposed via the Stroke layer effect; dashes, caps, and joins are not.

Implementation notes:
- A Properties panel is mounted and active-layer aware (relevant for type and shape layers, though shape layers still rasterize on commit). Stroke styling now flows through the layer-effects system in addition to OptionsBar shape controls.

## 0339 - Draw Custom Shapes

Source note: `pages/0339-draw-custom-shapes.md`

Function group: custom shape tool.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Custom Shape tool entry`: `Partial`. Photoweb registers a Custom Shape tool in the toolbar (cycled via Shift+U), but the drawing code does not implement preset-based custom shape rendering.
- `Shape preset picker`: `Missing`.
- `Custom shape libraries`: `Missing`.

Implementation notes:
- Treat this as a placeholder, not a usable Photoshop-style Custom Shape workflow.

## 0340 - Create Star Shapes

Source note: `pages/0340-create-star-shapes.md`

Function group: star/polygon shape options.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Polygon tool`: `Present with differences`. Photoweb has a polygon shape tool and polygon side option in code.
- `Star-specific options`: `Missing`.
- `Star ratio/sides/indent controls`: `Missing`.
- `Saved shape presets`: `Missing`.

Implementation notes:
- Polygon drawing exists, but Photoshop-style star indentation/ratio controls and presets are absent.

## 0341 - Add Legacy Custom Shapes

Source note: `pages/0341-add-legacy-custom-shapes.md`

Function group: legacy custom shape libraries.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Legacy shape library`: `Missing`.
- `Load legacy shapes`: `Missing`.
- `Shape preset management`: `Missing`.

Implementation notes:
- No custom shape library exists.

## 0342 - Draw Lines And Curves

Source note: `pages/0342-draw-lines-and-curves.md`

Function group: line and curve drawing.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Pen curves/straight segments`: `Present with differences`.
- `Freeform pen`: `Present with differences`.
- `Dedicated Line tool`: `Present with differences`.

Implementation notes:
- Pen tools cover path-based lines/curves.

## 0343 - Draw A Circle, Square, Or Rectangle

Source note: `pages/0343-draw-a-circle-square-or-rectangle.md`

Function group: basic geometric shapes.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Rectangle`: `Present with differences`.
- `Ellipse/circle`: `Present with differences`.
- `Constrained proportions shortcuts`: `Partial`.

Implementation notes:
- Basic shapes are implemented in `shapes.ts`.

## 0344 - Draw Lines And Line Segments

Source note: `pages/0344-draw-lines-and-line-segments.md`

Function group: line drawing.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Draw line with Pen/path`: `Present with differences`. Pen modes Path / Shape / Pixels are functional via Shift+P-cycled Pen tools.
- `Line Shape tool`: `Present with differences`.
- `Arrowheads/stroke line options`: `Missing`. The Line tool has no arrowhead options.

Implementation notes:
- Photoweb has a line shape tool, but Photoshop's full Line tool arrowhead and stroke options are not matched.

## 0345 - Shape, Path, And Pixel Mode Options

Source note: `pages/0345-shape-path-and-pixel-mode-options.md`

Function group: drawing mode selection.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Shape/Path/Pixels mode buttons`: `Present with differences`. OptionsBar exposes the three modes and the Pen tool implements distinct output for each: Path stores a vector path, Shape rasterizes filled with the primary color, and Pixels strokes the path at the current brush size.
- `Fully separate output behavior`: `Present with differences`. Mode now meaningfully changes commit behavior.
- `Photoshop shape layer/path architecture`: `Missing` or simplified. Shape commits still rasterize rather than producing a live editable vector shape layer.

Implementation notes:
- Mode tabs drive real differences in output; live vector shape layers are not implemented.

## 0346 - Draw An Arrow

Source note: `pages/0346-draw-an-arrow.md`

Function group: arrow drawing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Arrowhead line options`: `Missing`.
- `Arrow shape preset`: `Missing`.
- `Custom arrow styling`: `Missing`.

Implementation notes:
- Users would need to draw arrows manually with paths/shapes.

## 0347 - Trace Images With The Content-Aware Tracing Tool

Source note: `pages/0347-trace-images-with-the-content-aware-tracing-tool.md`

Function group: content-aware tracing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Content-Aware Tracing tool`: `Missing`.
- `Automatic edge-to-path tracing`: `Missing`.
- `Tracing detail controls`: `Missing`.

Implementation notes:
- Pen tools are manual only.

## 0348 - Draw Curves And Straight Segments

Source note: `pages/0348-draw-curves-and-straight-segments.md`

Function group: Pen tool segment drawing.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Straight anchor segments`: `Present with differences`.
- `Bezier curve handles`: `Present with differences`.
- `Path editing precision/polish`: `Partial`.

Implementation notes:
- Pen tool implementation includes anchors and curve behavior.

## 0349 - Draw Paths With The Pen Tool

Source note: `pages/0349-draw-paths-with-the-pen-tool.md`

Function group: Pen tool path drawing.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create paths`: `Present with differences`. Pen Path mode now stores a true work path; Shape mode rasterizes fill with primary color; Pixels mode strokes at brush size.
- `Close paths`: `Present with differences`.
- `Manage active paths`: `Partial`.

Implementation notes:
- Path data and a Paths panel exist; Pen mode tabs drive distinct outputs. Full Photoshop path management is still simplified.

## 0350 - Overview Of Pen Tool Settings

Source note: `pages/0350-overview-of-pen-tool-settings.md`

Function group: Pen tool settings.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Pen and Freeform Pen`: `Present with differences`. Shift+P cycles between them.
- `Path/shape/pixels output mode`: `Present with differences`. The mode tabs are functional and drive different commit behavior.
- `Rubber band/auto add-delete/visual settings`: `Missing` or limited.

Implementation notes:
- Core pen behavior and mode-tab output are wired; rubber-band and auto add/delete settings remain simplified.

## 0351 - Text And Typography

Source note: `pages/0351-text-and-typography.md`

Function group: typography overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Horizontal/vertical type tools`: `Present with differences`. Shift+T cycles Horizontal Type and Vertical Type.
- `Character and Paragraph panels`: `Present with differences`. A Properties panel is also mounted and exposes basic whole-layer Type controls.
- `Advanced fonts, glyphs, OpenType, text on path, dynamic text`: `Missing` or limited.

Implementation notes:
- Text support is real but much smaller than Photoshop; the Properties panel exposes and edits type-layer text, font family, size, color, alignment, and orientation.

## 0352 - Get Started With Text

Source note: `pages/0352-get-started-with-text.md`

Function group: basic text workflow.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Add text layer`: `Present with differences`.
- `Edit text on canvas`: `Present with differences`.
- `Format text`: `Present with differences`. Character/Paragraph panels and Properties basics cover common whole-layer formatting.

Implementation notes:
- Type tools, `TextEditOverlay`, Character/Paragraph panels, and Properties Type basics provide common text editing.

## 0353 - Add Text

Source note: `pages/0353-add-text.md`

Function group: adding text.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Horizontal type`: `Present with differences`.
- `Vertical type`: `Present with differences`. Shift+T cycles Horizontal and Vertical Type.
- `Point/paragraph type parity`: `Partial`.

Implementation notes:
- Text layer creation is implemented in `src/tools/type.ts`.

## 0354 - Edit Text

Source note: `pages/0354-edit-text.md`

Function group: editing existing text.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Re-edit text content`: `Present with differences`.
- `Apply character/paragraph changes`: `Partial`.
- `Advanced rich text editing`: `Missing`.

Implementation notes:
- On-canvas editing exists with simplified text data.

## 0355 - Add Bulleted And Numbered Lists

Source note: `pages/0355-add-bulleted-and-numbered-lists.md`

Function group: bullet and numbered lists.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Bulleted lists`: `Missing`.
- `Numbered lists`: `Missing`.
- `List indentation/format controls`: `Missing`.

Implementation notes:
- Text layers are plain styled text, not rich paragraph lists.

## 0356 - Copy And Paste Text

Source note: `pages/0356-copy-and-paste-text.md`

Function group: text copy and paste.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Browser text editing copy/paste`: `Present with differences`.
- `Paste styled text and preserve formatting`: `Missing` or limited.
- `Copy/paste between text layers`: `Partial`.

Implementation notes:
- Basic text input behavior comes from browser editing controls.

## 0357 - Resize Text

Source note: `pages/0357-resize-text.md`

Function group: text resizing.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Change font size`: `Present with differences`.
- `Transform type layer`: `Present with differences`.
- `Paragraph text box resize parity`: `Partial`.

Implementation notes:
- Type layers participate in transform and style editing paths.

## 0358 - Move Text

Source note: `pages/0358-move-text.md`

Function group: moving text layers.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Move active text layer`: `Present with differences`.
- `Transform/move text bounds`: `Present with differences`.
- `Precise alignment/smart guides`: `Missing`.

Implementation notes:
- Text layer transform data is supported.

## 0359 - Change Text Color

Source note: `pages/0359-change-text-color.md`

Function group: text color.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Set text color`: `Present with differences`.
- `Use color picker`: `Present with differences`.
- `Per-character color ranges`: `Missing` or limited.

Implementation notes:
- Text style includes a color value.

## 0360 - Set Up Paragraph Formatting

Source note: `pages/0360-set-up-paragraph-formatting.md`

Function group: paragraph formatting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Alignment controls`: `Present with differences`.
- `Justify buttons`: `Present with differences`.
- `Spacing/indent/hyphenation/full paragraph engine`: `Missing` or limited.

Implementation notes:
- Paragraph panel exists but is much simpler than Photoshop.

## 0361 - Rotate Text

Source note: `pages/0361-rotate-text.md`

Function group: text rotation.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Rotate type layer with transform`: `Present with differences`.
- `Switch horizontal/vertical orientation`: `Present with differences`. Shift+T cycles Horizontal and Vertical Type to switch orientation when starting new text.
- `Precise numeric rotation fields`: `Missing`.

Implementation notes:
- Text can be transformed, but not with the full Photoshop type transform UI.

## 0362 - Update Text Layers For Vector-Based Output

Source note: `pages/0362-update-text-layers-for-vector-based-output.md`

Function group: vector text output compatibility.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Vector text preservation in PSD/PDF output`: `Missing`.
- `Update legacy text engine data`: `Missing`.
- `Export vector type`: `Missing`.

Implementation notes:
- Photoweb renders/export canvas output, not vector text output.

## 0363 - Select And Manage Fonts

Source note: `pages/0363-select-and-manage-fonts.md`

Function group: font selection and management.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Choose font family`: `Partial`. Options UI exposes a font field, but no full font browser.
- `Font styles`: `Present with differences` in Character panel.
- `Activate/sync/manage fonts`: `Missing`.

Implementation notes:
- Font availability is browser/system dependent.

## 0364 - About Fonts

Source note: `pages/0364-about-fonts.md`

Function group: font concepts and support.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Font technology overview`: `Not applicable`.
- `App font support matrix`: `Missing`.
- `Font troubleshooting`: `Missing`.

Implementation notes:
- Photoweb relies on browser font rendering.

## 0365 - Replace Missing Fonts

Source note: `pages/0365-replace-missing-fonts.md`

Function group: missing font replacement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Detect missing fonts`: `Missing`.
- `Replace missing font dialog`: `Missing`.
- `Resolve/sync Adobe Fonts`: `Missing`.

Implementation notes:
- No document-level font dependency tracking exists.

## 0366 - Match Fonts

Source note: `pages/0366-match-fonts.md`

Function group: font recognition.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Match Font command`: `Missing`.
- `Analyze image/text appearance`: `Missing`.
- `Suggested font list`: `Missing`.

Implementation notes:
- No OCR/font matching model exists.

## 0367 - Search For And Apply Font Styles

Source note: `pages/0367-search-for-and-apply-font-styles.md`

Function group: font browser search/styles.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Apply common font styles`: `Present with differences`.
- `Search/filter fonts`: `Missing`.
- `Adobe Fonts/favorites/recent filters`: `Missing`.

Implementation notes:
- Character panel has style buttons, not a full font browser.

## 0368 - Overview Of OpenType Fonts

Source note: `pages/0368-overview-of-open-type-fonts.md`

Function group: OpenType font feature overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `OpenType feature detection`: `Missing`.
- `Ligatures/alternates/fractions controls`: `Missing`.
- `OpenType panel/menu`: `Missing`.

Implementation notes:
- Browser may render font features by default, but Photoweb does not expose controls.

## 0368 - Overview Of Opentype Fonts

Source note: `pages/0368-overview-of-opentype-fonts.md`

Function group: OpenType font feature overview duplicate source note.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `OpenType feature detection`: `Missing`.
- `Typography feature controls`: `Missing`.
- `Feature availability UI`: `Missing`.

Implementation notes:
- This duplicate note has the same Photoweb gap as the previous OpenType overview.

## 0369 - Apply OpenType Features

Source note: `pages/0369-apply-open-type-features.md`

Function group: applying OpenType features.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Standard/discretionary ligatures`: `Missing`.
- `Stylistic sets/alternates`: `Missing`.
- `Fractions/ordinals/swashes`: `Missing`.

Implementation notes:
- No OpenType feature UI exists.

## 0369 - Apply Opentype Features

Source note: `pages/0369-apply-opentype-features.md`

Function group: applying OpenType features duplicate source note.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `OpenType feature toggles`: `Missing`.
- `Per-layer/per-selection feature application`: `Missing`.
- `Glyph alternate workflow`: `Missing`.

Implementation notes:
- Duplicate source note; comparison result is the same.

## 0370 - Use OpenType Variable Fonts

Source note: `pages/0370-use-open-type-variable-fonts.md`

Function group: variable font controls.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Variable font axis controls`: `Missing`.
- `Weight/width/slant axis sliders`: `Missing`.
- `Variable font instance management`: `Missing`.

Implementation notes:
- Character panel exposes fixed style choices only.

## 0370 - Use Opentype Variable Fonts

Source note: `pages/0370-use-opentype-variable-fonts.md`

Function group: variable font controls duplicate source note.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Variable font axes`: `Missing`.
- `Axis preview and adjustment`: `Missing`.
- `Adobe Fonts variable workflow`: `Missing`.

Implementation notes:
- Duplicate source note; no variable font support is exposed.

## 0371 - Change The Font Across Multiple Layers

Source note: `pages/0371-change-the-font-across-multiple-layers.md`

Function group: multi-layer font change.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select multiple type layers`: `Missing`.
- `Change font across selected layers`: `Missing`.
- `Find/replace fonts across document`: `Missing`.

Implementation notes:
- Photoweb primarily tracks one active layer.

## 0372 - Type Layers And Creation

Source note: `pages/0372-type-layers-and-creation.md`

Function group: type layer creation and model.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Type layer kind`: `Present with differences`.
- `Point/vertical type`: `Present with differences`.
- `Paragraph/rich text features`: `Partial`.

Implementation notes:
- Type layers are modeled with `typeData`. The mounted Properties panel is active-layer aware and surfaces type-layer state.

## 0373 - Fill Text With Image

Source note: `pages/0373-fill-text-with-image.md`

Function group: image-filled text.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Clipping image to text`: `Missing`.
- `Create clipping mask workflow`: `Missing`.
- `Frame/text fill workflow`: `Missing`.

Implementation notes:
- Layer masks exist, but not text clipping-mask workflows.

## 0374 - Text On Paths And Shapes

Source note: `pages/0374-text-on-paths-and-shapes.md`

Function group: text on paths/shapes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Type on path`: `Missing`.
- `Type inside shape`: `Missing`.
- `Path text editing controls`: `Missing`.

Implementation notes:
- Type and paths exist separately, but are not connected.

## 0375 - Add Text Along Paths Or Inside Shapes

Source note: `pages/0375-add-text-along-paths-or-inside-shapes.md`

Function group: path/shape text creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Click path with Type tool`: `Missing`.
- `Text inside closed path`: `Missing`.
- `Shape boundary text flow`: `Missing`.

Implementation notes:
- No path text engine exists.

## 0376 - Flip Or Move Text Along A Path

Source note: `pages/0376-flip-or-move-text-along-a-path.md`

Function group: path text positioning.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Move text start/end along path`: `Missing`.
- `Flip text across path`: `Missing`.
- `Path text handles`: `Missing`.

Implementation notes:
- Depends on absent path text.

## 0377 - Modify Text Paths

Source note: `pages/0377-modify-text-paths.md`

Function group: editing text paths.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Edit path controlling type`: `Missing`.
- `Update text flow after path edit`: `Missing`.
- `Path selection for type paths`: `Missing`.

Implementation notes:
- Path editing exists for normal paths, not text paths.

## 0378 - Warp And Unwarp Text

Source note: `pages/0378-warp-and-unwarp-text.md`

Function group: text warp.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Transform/warp type layer pixels`: `Partial`. Warp overlay can affect active layer content, but not Photoshop's editable text warp style system.
- `Warp Text presets`: `Missing`.
- `Unwarp while keeping editable text style`: `Missing`.

Implementation notes:
- Layer warp is not the same as Photoshop's Type Warp controls.

## 0379 - Convert Text To Shapes Or Work Paths

Source note: `pages/0379-convert-text-to-shapes-or-work-paths.md`

Function group: text conversion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Convert text to shape`: `Missing`.
- `Create work path from text`: `Missing`.
- `Rasterize type layer`: `Missing` or disabled.

Implementation notes:
- Type menu items for conversion are disabled.

## 0380 - Create Text Selection Borders

Source note: `pages/0380-create-text-selection-borders.md`

Function group: selection from text shape.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Load text shape as selection`: `Missing`.
- `Create selection border from type`: `Missing`.
- `Use text outline as mask`: `Missing`.

Implementation notes:
- Type layer pixels exist, but text outline selection command is absent.

## 0381 - Add Drop Shadows To Text

Source note: `pages/0381-add-drop-shadows-to-text.md`

Function group: text drop shadow/layer style.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Drop Shadow layer style`: `Missing`. Drop shadow specifically is not implemented.
- `Text-specific shadow editing`: `Missing`.
- `Layer effects visibility/editing`: `Partial`. A layer-effects pipeline now exists (a Stroke effect is implemented for any layer with outside / center / inside alignment), so type layers can carry an editable Stroke effect; Drop Shadow has not landed yet.

Implementation notes:
- The layer-style infrastructure has begun with Stroke; Drop Shadow remains absent.

## 0382 - Characters And Glyphs

Source note: `pages/0382-characters-and-glyphs.md`

Function group: glyphs and character insertion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Glyphs panel`: `Missing`.
- `Insert alternate glyphs`: `Missing`.
- `Character set browsing`: `Missing`.

Implementation notes:
- Users can type normal Unicode characters through the browser, but no Glyphs panel exists.

## 0383 - Work With OpenType SVG Fonts

Source note: `pages/0383-work-with-open-type-svg-fonts.md`

Function group: OpenType SVG/color fonts.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `OpenType SVG font detection`: `Missing`.
- `Color glyph rendering controls`: `Missing`.
- `SVG font workflow guidance`: `Missing`.

Implementation notes:
- Font rendering is delegated to the browser.

## 0383 - Work With Opentype SVG Fonts

Source note: `pages/0383-work-with-opentype-svg-fonts.md`

Function group: OpenType SVG/color fonts duplicate source note.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Color OpenType SVG support controls`: `Missing`.
- `Glyph panel access`: `Missing`.
- `Font compatibility UI`: `Missing`.

Implementation notes:
- Duplicate note; no dedicated feature exists.

## 0384 - Add Emoji Glyphs

Source note: `pages/0384-add-emoji-glyphs.md`

Function group: emoji glyph insertion.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Type emoji characters`: `Partial`. Browser/system emoji input can work.
- `Glyphs panel emoji insertion`: `Missing`.
- `Emoji font management`: `Missing`.

Implementation notes:
- Emoji support is incidental browser text input behavior.

## 0385 - Enable Glyph Protection

Source note: `pages/0385-enable-glyph-protection.md`

Function group: missing glyph protection.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Glyph protection preference`: `Missing`.
- `Prevent unsupported glyph substitution`: `Missing`.
- `Missing glyph warnings`: `Missing`.

Implementation notes:
- No typography preference system exists.

## 0386 - Add Glyphs

Source note: `pages/0386-add-glyphs.md`

Function group: inserting glyphs.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Glyphs panel insertion`: `Missing`.
- `Recently used glyphs`: `Missing`.
- `Font-specific glyph browsing`: `Missing`.

Implementation notes:
- No glyph browser exists.

## 0387 - Use On-Canvas Glyph Alternatives

Source note: `pages/0387-use-on-canvas-glyph-alternatives.md`

Function group: contextual glyph alternates.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `On-canvas alternate glyph menu`: `Missing`.
- `OpenType alternates`: `Missing`.
- `Substitution preview`: `Missing`.

Implementation notes:
- No contextual glyph UI exists.

## 0388 - International Text And Languages

Source note: `pages/0388-international-text-and-languages.md`

Function group: international typography.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Browser Unicode text input`: `Partial`.
- `Language-specific composers and shaping settings`: `Missing`.
- `RTL/CJK/Indic feature controls`: `Missing`.

Implementation notes:
- Text shaping depends on browser canvas/font behavior.

## 0389 - Overview Of Unified Text Engine

Source note: `pages/0389-overview-of-unified-text-engine.md`

Function group: Adobe Unified Text Engine.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Adobe Unified Text Engine`: `Not applicable`.
- `Cross-script Photoshop text engine options`: `Missing`.
- `Legacy text engine migration`: `Missing`.

Implementation notes:
- Photoweb has its own simpler browser/canvas text implementation.

## 0390 - Create Documents Using International Languages, Scripts, And Text

Source note: `pages/0390-create-documents-using-international-languages-scripts-and-text.md`

Function group: multilingual document text.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Type Unicode text`: `Partial`.
- `International script preferences`: `Missing`.
- `Language-specific paragraph/composer options`: `Missing`.

Implementation notes:
- Browser font/script support may help, but no Photoshop-level controls exist.

## 0391 - Supported International Scripts

Source note: `pages/0391-supported-international-scripts.md`

Function group: supported script list.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Official supported script matrix`: `Not applicable`.
- `Script feature detection`: `Missing`.
- `Fallback warning UI`: `Missing`.

Implementation notes:
- Support depends on browser and fonts, not a documented app matrix.

## 0392 - Work With Dynamic Text

Source note: `pages/0392-work-with-dynamic-text.md`

Function group: dynamic text.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Dynamic text layouts`: `Missing`.
- `On-canvas text shape controls`: `Missing`.
- `Adjust dynamic text paths/handles`: `Missing`.

Implementation notes:
- Basic type layers exist, not dynamic text.

## 0393 - Dynamic Text Overview

Source note: `pages/0393-dynamic-text-overview.md`

Function group: dynamic text feature overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Circular/arched/bowed text presets`: `Missing`.
- `Dynamic resizing/reflow`: `Missing`.
- `Beta-style dynamic type controls`: `Missing`.

Implementation notes:
- Text can be transformed, but not dynamically shaped.

## 0394 - Adjust Formatting And Resize Text

Source note: `pages/0394-adjust-formatting-and-resize-text.md`

Function group: dynamic text formatting/resizing.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Basic font size/color/style`: `Present with differences`.
- `Resize normal text layer`: `Present with differences`.
- `Dynamic text formatting controls`: `Missing`.

Implementation notes:
- Applies to normal text only.

## 0395 - Reposition Start And End Points

Source note: `pages/0395-reposition-start-and-end-points.md`

Function group: dynamic/path text endpoints.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Start/end handles`: `Missing`.
- `Reposition dynamic/path text endpoints`: `Missing`.
- `Text flow along path`: `Missing`.

Implementation notes:
- No path/dynamic text endpoint model exists.

## 0396 - Effects And Filters

Source note: `pages/0396-effects-and-filters.md`

Function group: effects and filters overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Blur/sharpen/noise/distort/stylize/render/other filters`: `Present with differences`.
- `Filter dialogs and previews`: `Present with differences`.
- `Filter Gallery/Smart Filters/Neural Filters`: `Missing`.

Implementation notes:
- Photoweb has a useful local raster filter registry.

## 0397 - Get Started With Filters

Source note: `pages/0397-get-started-with-filters.md`

Function group: basic filter workflow.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Open filter from menu`: `Present with differences`.
- `Apply filter to active layer/selection`: `Present with differences`.
- `Reapply last filter`: `Present with differences`.
- `Smart/non-destructive filters`: `Missing`.

Implementation notes:
- Filters apply destructively to pixels.

## 0398 - Filters Overview

Source note: `pages/0398-filters-overview.md`

Function group: filter categories.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Blur filters`: `Present with differences`.
- `Sharpen filters`: `Present with differences`.
- `Noise/distort/stylize/render/other`: `Present with differences`.
- `Complete Photoshop category coverage`: `Missing`.

Implementation notes:
- Filter coverage is broad for a web app but not Photoshop-complete.

## 0399 - Apply Filters

Source note: `pages/0399-apply-filters.md`

Function group: applying filters.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Apply to active layer`: `Present with differences`.
- `Apply to selection`: `Present with differences`.
- `Filter preview dialog`: `Present with differences`.
- `Filter masks/Smart Filters`: `Missing`.

Implementation notes:
- Filter application is direct raster editing.

## 0400 - Apply Filters From The Filter Gallery

Source note: `pages/0400-apply-filters-from-the-filter-gallery.md`

Function group: Filter Gallery.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Filter Gallery UI`: `Missing`.
- `Stack multiple gallery effects`: `Missing`.
- `Gallery thumbnails/categories`: `Missing`.

Implementation notes:
- Individual filter dialogs exist, not a Filter Gallery.

## 0401 - Filter Gallery Overview

Source note: `pages/0401-filter-gallery-overview.md`

Function group: Filter Gallery overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Gallery preview workspace`: `Missing`.
- `Artistic/sketch/texture filter stacks`: `Missing`.
- `Effect layer list inside gallery`: `Missing`.

Implementation notes:
- The registry-driven filter menu is simpler.

## 0402 - Blend And Fade Filter Effects

Source note: `pages/0402-blend-and-fade-filter-effects.md`

Function group: fade filter and blending.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Fade last filter`: `Missing`.
- `Blend mode/opacity for last filter result`: `Missing`.
- `Filter application history blending`: `Missing`.

Implementation notes:
- Layer blend modes exist, but not Fade Filter.

## 0403 - Tips For Creating Special Effects

Source note: `pages/0403-tips-for-creating-special-effects.md`

Function group: special effects techniques.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Use filters and blend modes creatively`: `Present with differences`.
- `Adjustment layers/fill layers`: `Present with differences`.
- `Photoshop-specific effect recipes and gallery filters`: `Missing` or partial.

Implementation notes:
- Photoweb has primitives for effects but no guided effect library.

## 0404 - Smart Filters

Source note: `pages/0404-smart-filters.md`

Function group: non-destructive Smart Filters.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Apply filter to Smart Object as Smart Filter`: `Missing`.
- `Edit/reorder/filter mask`: `Missing`.
- `Toggle Smart Filter visibility`: `Missing`.

Implementation notes:
- Smart Objects and Smart Filters are both absent.

## 0405 - Sharpening Overview

Source note: `pages/0405-sharpening-overview.md`

Function group: sharpening workflows.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Unsharp Mask`: `Present with differences`.
- `Smart Sharpen`: `Present with differences`.
- `Sharpening workflow guidance/edge masking`: `Partial`.

Implementation notes:
- Sharpen filters are implemented, but with simpler controls.

## 0406 - Sharpen Controls With Smart Sharpen

Source note: `pages/0406-sharpen-controls-with-smart-sharpen.md`

Function group: Smart Sharpen.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Smart Sharpen filter`: `Present with differences`.
- `Amount/radius/noise-style controls`: `Partial`.
- `Lens/motion blur removal and shadow/highlight controls`: `Missing`.

Implementation notes:
- Implemented in `src/filters/sharpenFilters.tsx` as a simplified Smart Sharpen.

## Summary

High-overlap areas:
- Photoweb has usable brush, pencil, paint bucket, gradient, eraser, dodge/burn/sponge, basic shape, pen/path, type, and filter functionality with consistent tool-cycling shortcuts (Shift+B / G / P / T / U / O / M / L / W / A).
- Brush smoothing, Pencil spacing, Eraser modes, Dodge/Burn Range and Exposure, Sponge Mode and Vibrance, Gradient Smooth/Classic interpolation and Transparency, and Pen Path/Shape/Pixels modes are all wired.
- Brush, Eraser, and Pencil retarget into the active mask canvas when painting on a mask.
- A layer-effects pipeline (Stroke effect with outside / center / inside) exists, and a Properties panel is mounted and active-layer aware.
- Basic type creation/editing, character styling, paragraph alignment, type transforms, and core filter application are implemented.
- Sharpening is stronger than many advanced areas because both Unsharp Mask and Smart Sharpen exist.

Major missing areas:
- Pattern workflows (pattern fills in Paint Bucket, pattern stamp, define pattern, presets), content-aware / history fills, brush presets, brush packs / abr import, custom brushes, define brush, advanced Brush Settings dynamics (shape dynamics, scattering, texture, dual brush, color dynamics, transfer, brush pose, noise, wet edges, build-up, smoothing dynamics), and Pattern Preview are absent.
- Custom Shape preset library, star options on Polygon, arrowheads on Line, content-aware tracing, advanced shape libraries, and full live vector shape-layer output are missing or incomplete.
- Advanced typography is mostly missing: bullets/numbering, missing font replacement, Match Font, OpenType controls and glyph palette, variable fonts, type styles / paragraph styles, spell check, find/replace, text on path, text in shape, dynamic text, and most layer-style text effects.
- Smart Sharpen mode field is cosmetic; all modes still use USM.
- Healing brush, spot healing, patch tool, content-aware patch, red-eye, content-aware move, and Selection Brush are absent.
- Filter Gallery, Fade Filter, Smart Filters, and non-destructive filter stacks are missing.
- Gradient editor with custom stops / saved presets is absent.

Recommended implementation priorities:
- Add brush presets and a simple brush preset picker before advanced brush dynamics.
- Add a proper Edit > Stroke command and pattern fills if design workflows are important.
- Expand typography incrementally: font picker/search, richer paragraph controls, then glyph/OpenType support.
- Add non-destructive filter support only after Smart Object or equivalent layer-source architecture is decided.
