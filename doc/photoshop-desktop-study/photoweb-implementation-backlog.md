# Photoweb Implementation Backlog

Purpose: executable todo list for continuing Photoweb development from the scoped plan.

Workflow: use `doc/photoshop-desktop-study/photoweb-automatic-development-workflow.md`.

Status key:
- `[ ]`: Not started.
- `[~]`: In progress.
- `[x]`: Complete and verified.
- `[!]`: Blocked.
- `[>]`: Deferred by scope decision.

## P0 - History, Commands, And Reliability

- [ ] `HIST-01` Full history timeline with active cursor
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`, `photoweb-function-comparison-0011-0110.md` sections `0041-0047`
  - Function description: Replace the current undo-stack-only History panel model with a timeline that keeps both past and redoable future states visible and tracks the active cursor.
  - Acceptance criteria:
    - Undo moves the active cursor backward without deleting future states.
    - Redo moves the active cursor forward.
    - Committing a new action after undo truncates future states.
    - History panel visually distinguishes current, past, and redoable future entries.
    - `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Cmd/Ctrl+Y` still work.
  - Required tests:
    - `src/test/history.test.ts`: commit three actions, undo twice, redo once, assert cursor and stacks.
    - `src/test/history.test.ts`: commit after undo clears redoable future.
    - UI test for History panel current/future state display.
  - Dependencies: `None`
  - Implementation notes:

- [ ] `HIST-02` Snapshot restore correctness
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` section `0045`
  - Function description: Make History snapshots restore document/layer state, not only appear as labels in the History panel.
  - Acceptance criteria:
    - Creating a snapshot captures layer pixel data, layer order, names, visibility, opacity, blend mode, kind, masks, and active layer.
    - Reverting to a snapshot restores captured state.
    - Snapshot restore is itself undoable/redone consistently with the timeline model.
  - Required tests:
    - `src/test/history.test.ts`: create snapshot, mutate layer pixels/properties, revert, assert restore.
    - Test snapshot with multiple layers and active layer.
  - Dependencies: `HIST-01`
  - Implementation notes:

- [ ] `HIST-03` Command wrapper for document-mutating actions
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Add a standard command helper so layer, selection, transform, property, and pixel operations all register consistent history actions.
  - Acceptance criteria:
    - Command helper supports `apply`, `revert`, label, action kind, affected IDs, and optional dirty rect.
    - Existing history API remains usable during migration.
    - Compound command support exists for multi-step operations.
  - Required tests:
    - `src/test/history.test.ts`: generic command applies/reverts/redoes.
    - `src/test/history.test.ts`: compound command applies/reverts child steps in correct order.
  - Dependencies: `HIST-01`
  - Implementation notes:

- [ ] `HIST-04` Undo/redo coverage for high-use operations
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Ensure core operations are undoable before adding more features.
  - Acceptance criteria:
    - Brush, eraser, fill, gradient, filter, adjustment, layer add/remove/reorder, layer property, selection change, transform, crop, mask add/apply/delete are undoable.
    - History labels are readable and Photoshop-like.
  - Required tests:
    - Extend existing tests across `paint.test.ts`, `fillTools.test.ts`, `filterOps.test.ts`, `layers.test.ts`, `selection.test.ts`, `transforms.test.ts`, and `history.test.ts`.
    - Each operation family gets at least one undo and redo assertion.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `HIST-05` History preferences and limits
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` section `0042`
  - Function description: Let the app use a configurable maximum history state count while preserving current default behavior.
  - Acceptance criteria:
    - Default max history remains safe for memory.
    - Setting can be changed through future Settings infrastructure or temporary store API.
    - Old states prune predictably.
  - Required tests:
    - `src/test/history.test.ts`: set max size, commit beyond limit, assert pruning and undo behavior.
  - Dependencies: `HIST-01`
  - Implementation notes:

## P0 - Layer System

- [ ] `LAYERS-01` Layer groups core model
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0074`, `0084`; `photoweb-development-plan.md`
  - Function description: Add usable layer groups so users can organize layers into collapsible folders.
  - Acceptance criteria:
    - Create group from selected layers.
    - Create empty group.
    - Rename, delete, collapse, expand group.
    - Group visibility hides/shows children.
    - Group opacity affects composited children.
    - Group operations are undoable.
  - Required tests:
    - `src/test/layers.test.ts`: create group from layers and assert hierarchy.
    - `src/test/layers.test.ts`: group visibility/opacity affects composited result.
    - Undo/redo group creation and deletion.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `LAYERS-02` Multi-layer selection
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` sections `0083`, `0134`, `0136`
  - Function description: Allow selecting multiple layers in the Layers panel for group, align, distribute, delete, and transform workflows.
  - Acceptance criteria:
    - Cmd/Ctrl-click toggles layer selection.
    - Shift-click selects a contiguous range.
    - Active layer remains distinct from selected layers.
    - Multi-selection survives reorder where possible.
    - Multi-selection changes are undoable if they affect document state.
  - Required tests:
    - `src/test/layers.test.tsx`: multi-select click/range behavior.
    - `src/test/layers.test.ts`: store selection model behavior.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `LAYERS-03` Align selected layers
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0134`
  - Function description: Align multiple selected layers to left, horizontal center, right, top, vertical center, or bottom.
  - Acceptance criteria:
    - Alignment can target selection bounds or canvas bounds.
    - Pixel bounds are computed from visible layer content.
    - Operation is undoable.
  - Required tests:
    - `src/test/layers.test.ts`: align left/center/bottom using synthetic layers.
    - Undo/redo alignment.
  - Dependencies: `LAYERS-02`, `HIST-03`
  - Implementation notes:

- [ ] `LAYERS-04` Distribute selected layers
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0136`
  - Function description: Evenly distribute selected layers by edges or centers.
  - Acceptance criteria:
    - Supports horizontal and vertical distribution.
    - Requires at least three selected layers.
    - Operation is undoable.
  - Required tests:
    - `src/test/layers.test.ts`: distribute three layers and assert positions.
  - Dependencies: `LAYERS-02`, `HIST-03`
  - Implementation notes:

- [ ] `LAYERS-05` Layer mask UI polish
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` sections `0221-0227`
  - Function description: Make layer mask state visible and editable through the Layers panel.
  - Acceptance criteria:
    - Mask thumbnail is visible when a layer has a mask.
    - Disabled mask state is visually marked.
    - Link/unlink mask state is visible.
    - Add/apply/delete/enable/disable/link mask operations are undoable.
  - Required tests:
    - `src/test/layers.test.tsx`: UI shows mask thumbnail and disabled indicator.
    - `src/test/layers.test.ts`: undo/redo mask lifecycle.
  - Dependencies: `HIST-03`
  - Implementation notes:

## P0 - Properties Panel

- [ ] `PROPS-01` Active layer Properties panel shell
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`, `photoweb-function-comparison-0011-0110.md` sections `0098-0099`
  - Function description: Build a real Properties panel that changes by active layer kind.
  - Acceptance criteria:
    - Raster, type, shape, fill, adjustment, group, and empty states render appropriate sections.
    - Panel reads from active layer store state.
    - Panel writes through undoable actions.
  - Required tests:
    - `src/test/properties.test.tsx`: panel renders correct controls for layer kinds.
    - `src/test/properties.test.tsx`: changing a property updates store and history.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `PROPS-02` Edit existing adjustment layer parameters
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0090`, `0098`, `0099`
  - Function description: Let users reopen and adjust existing adjustment layers from Properties.
  - Acceptance criteria:
    - Parameters update live or on confirm.
    - Composited image updates.
    - Changes are undoable.
  - Required tests:
    - `src/test/adjustments.test.ts`: update Hue/Saturation or Brightness/Contrast adjustment layer and assert pixels.
    - Undo/redo parameter change.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes:

- [ ] `PROPS-03` Edit existing fill layer parameters
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0097`, `0099`
  - Function description: Let users edit solid color and gradient fill layers after creation.
  - Acceptance criteria:
    - Solid color can be changed.
    - Gradient type, angle, and stops can be changed within current gradient model.
    - Changes repaint fill layer and are undoable.
  - Required tests:
    - `src/test/layers.test.ts`: edit fill layer color and assert pixels.
    - `src/test/fillTools.test.ts`: edit gradient fill angle/type if applicable.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes:

- [ ] `PROPS-04` Edit type layer basics
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0351-0361`, `0394`
  - Function description: Make active type layer text, font family, font size, color, alignment, and orientation editable from Properties.
  - Acceptance criteria:
    - Changing controls rerenders the type layer.
    - Changes are undoable.
    - Does not add OpenType/glyph/dynamic text features.
  - Required tests:
    - `src/test/typeReedit.test.ts`: update font size/color/alignment and assert type data/canvas changes.
    - Undo/redo type style change.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes:

- [ ] `PROPS-05` Edit shape layer/tool output basics
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0335-0345`
  - Function description: Make shape fill, stroke, stroke width, corner radius, polygon sides, and line weight editable where the current shape model supports it.
  - Acceptance criteria:
    - Existing shape data can be edited if shape layer model exists.
    - If current shapes are raster-only, split and complete `SHAPE-01` first.
    - Changes are undoable.
  - Required tests:
    - `src/test/shapes.test.ts`: edit shape properties and assert state/pixels.
  - Dependencies: `PROPS-01`, `SHAPE-01`, `HIST-03`
  - Implementation notes:

## P0 - Selections And Masks

- [ ] `SEL-01` Color Range dialog
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0194`; `photoweb-function-comparison-0211-0310.md` section `0217`
  - Function description: Select pixels by sampled color range using fuzziness and preview controls.
  - Acceptance criteria:
    - Open from `Select > Color Range`.
    - Eyedropper samples target color from canvas.
    - Add/subtract sample controls alter range.
    - Fuzziness controls tolerance.
    - Output creates a selection mask.
    - Operation is undoable.
  - Required tests:
    - `src/test/selection.test.ts`: sample red area, assert selected mask.
    - UI test for fuzziness affecting selection size.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `SEL-02` Select and Mask refinement upgrade
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` sections `0199`, `0201`; `photoweb-function-comparison-0211-0310.md` section `0212`
  - Function description: Improve the existing Refine Edge/Select and Mask dialog into a practical non-AI edge refinement workflow.
  - Acceptance criteria:
    - Smooth, Feather, Contrast, and Shift Edge produce observable mask changes.
    - Output to selection and output to layer mask are supported.
    - Preview view modes remain usable.
    - Operation is undoable.
  - Required tests:
    - `src/test/selectionEdge.test.ts`: each slider changes mask as expected.
    - `src/test/layers.test.ts`: output to layer mask creates correct mask.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `SEL-03` Modify Selection dialogs
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0210`; `photoweb-function-comparison-0211-0310.md` sections `0214-0216`
  - Function description: Add real dialogs for Feather, Border, Smooth, Expand, and Contract.
  - Acceptance criteria:
    - Each command accepts pixel radius/amount where applicable.
    - Commands update selection preview/state.
    - Commands are undoable.
  - Required tests:
    - `src/test/selection.test.ts`: expand/contract/border/smooth modify mask bounds.
    - UI tests for dialog confirmation.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `SEL-04` Defringe and matte removal
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` sections `0218-0220`
  - Function description: Add commands to clean halos/fringes around selected cutout pixels without AI.
  - Acceptance criteria:
    - Defringe replaces edge colors using nearby interior colors.
    - Remove White Matte and Remove Black Matte adjust selected edge pixels.
    - Operations are selection-aware and undoable.
  - Required tests:
    - `src/test/selectionEdge.test.ts`: synthetic fringe pixels are reduced.
    - Undo/redo pixel cleanup.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `SEL-05` Selection edge visibility toggle
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0208`
  - Function description: Hide or show marching ants without deselecting.
  - Acceptance criteria:
    - View command toggles selection edge rendering.
    - Selection remains active while edges are hidden.
    - Quick Mask behavior remains separate.
  - Required tests:
    - `src/test/selection.test.tsx`: toggle hides overlay but selection state remains.
  - Dependencies: `None`
  - Implementation notes:

- [ ] `SEL-06` Save/load selection UI
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0221`; existing `selectionSlice`
  - Function description: Expose existing saved selection store through dialogs/menu commands.
  - Acceptance criteria:
    - Save Selection asks for a name.
    - Load Selection lists saved names.
    - Saved selections survive during current document session.
  - Required tests:
    - `src/test/selection.test.tsx`: save and load named selection through UI.
  - Dependencies: `None`
  - Implementation notes:

## P0 - Retouch Tools

- [ ] `RET-01` Magic Eraser
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0276`
  - Function description: Click a color and erase matching pixels to transparency using Magic Wand-like tolerance, contiguous, anti-alias, and sample-all options.
  - Acceptance criteria:
    - Tool appears in Eraser group.
    - Tolerance/contiguous/sample all layers options work.
    - Operation respects active selection.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: click matching region and assert alpha becomes 0.
    - Undo/redo magic erase.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `RET-02` Background Eraser
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0275`
  - Function description: Brush away sampled background colors while preserving non-matching foreground pixels.
  - Acceptance criteria:
    - Tool appears in Eraser group.
    - Supports tolerance and sampling mode.
    - Erases to transparency.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: brush over mixed edge and assert matching pixels erased.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `RET-03` Spot Healing Brush
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0267`
  - Function description: Brush over a small imperfection and replace it with locally sampled/blended surrounding pixels.
  - Acceptance criteria:
    - Tool appears in retouch/healing group.
    - Brush size controls apply.
    - Small spot is blended from local neighborhood.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: synthetic dark spot on flat color is removed/blended.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `RET-04` Healing Brush
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0268`
  - Function description: Sample source texture and blend it into target tone/color while painting.
  - Acceptance criteria:
    - Alt/Option-click sets source.
    - Painting uses sampled texture with target tone blending.
    - Aligned mode is supported if feasible.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: sampled texture blends into target area.
  - Dependencies: `RET-03`, `HIST-03`
  - Implementation notes:

- [ ] `RET-05` Patch Tool
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0269`
  - Function description: Repair a selected area by dragging it to a source/destination region and blending pixels.
  - Acceptance criteria:
    - Uses existing selection as patch area.
    - Source and destination modes are available if practical.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: patch selected area from clean source.
  - Dependencies: `SEL-02`, `HIST-03`
  - Implementation notes:

- [ ] `RET-06` Red Eye Tool
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0270`
  - Function description: Darken/desaturate red pupil pixels in a clicked region.
  - Acceptance criteria:
    - Pupil size and darken amount options.
    - Red pixels near click are corrected.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: synthetic red-eye pixel cluster is corrected.
  - Dependencies: `HIST-03`
  - Implementation notes:

## P1 - Layer Styles And Effects

- [ ] `STYLE-01` Layer effects model and renderer
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0102-0115`
  - Function description: Implement the data model and compositor rendering path for layer effects.
  - Acceptance criteria:
    - Layer can store multiple effects.
    - Effects render non-destructively above/below layer content as appropriate.
    - Effect visibility can be toggled.
    - Changes are undoable.
  - Required tests:
    - `src/test/layerStyles.test.ts`: effect data persists and renders visible pixels.
    - Undo/redo effect add/remove.
  - Dependencies: `HIST-03`, `PROPS-01`
  - Implementation notes:

- [ ] `STYLE-02` Drop Shadow and Inner Shadow
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0103`, `0105`, `0111`
  - Function description: Add shadow effects with blend mode, color, opacity, angle, distance, spread, and size.
  - Acceptance criteria:
    - Drop Shadow renders outside visible layer pixels.
    - Inner Shadow renders inside layer alpha.
    - Global light angle can be shared by shadow effects.
    - Parameters are editable and undoable.
  - Required tests:
    - `src/test/layerStyles.test.ts`: shadow pixels appear in expected direction.
    - Global light angle updates multiple effects.
  - Dependencies: `STYLE-01`
  - Implementation notes:

- [ ] `STYLE-03` Stroke layer effect
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0103`, `0105`
  - Function description: Add non-destructive layer stroke with size, color, opacity, position, and blend mode.
  - Acceptance criteria:
    - Outside/inside/center stroke positions if feasible.
    - Works on raster, type, and shape layers.
    - Parameters are editable and undoable.
  - Required tests:
    - `src/test/layerStyles.test.ts`: stroke appears around alpha edge.
  - Dependencies: `STYLE-01`
  - Implementation notes:

- [ ] `STYLE-04` Glow and overlay effects
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0105`, `0110`
  - Function description: Add Outer Glow, Inner Glow, Color Overlay, and Gradient Overlay.
  - Acceptance criteria:
    - Effects render non-destructively.
    - Parameters are editable.
    - Effects can be copied/pasted/cleared.
  - Required tests:
    - `src/test/layerStyles.test.ts`: each effect visibly changes output.
  - Dependencies: `STYLE-01`, `STYLE-03`
  - Implementation notes:

## P1 - Shapes, Paths, And Text

- [ ] `SHAPE-01` Real shape layer behavior
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0335-0345`
  - Function description: Store shape geometry and style so shape layers remain editable instead of being only raster paint.
  - Acceptance criteria:
    - New shapes create shape layer data or editable shape content.
    - Fill/stroke changes rerender shape.
    - Shape/path/pixels modes are either fully implemented or simplified honestly in UI.
    - Shape changes are undoable.
  - Required tests:
    - `src/test/shapes.test.ts`: create rectangle, edit fill/stroke, assert rerender.
  - Dependencies: `HIST-03`, `PROPS-01`
  - Implementation notes:

- [ ] `SHAPE-02` Star options for Polygon tool
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` section `0340`
  - Function description: Add star mode to Polygon tool with point count and indent/radius controls.
  - Acceptance criteria:
    - Polygon tool can draw normal polygon or star.
    - Point count and indent affect geometry.
    - Works with shape style model.
  - Required tests:
    - `src/test/shapes.test.ts`: star path has expected alternating radii.
  - Dependencies: `SHAPE-01`
  - Implementation notes:

- [ ] `SHAPE-03` Arrowheads for Line tool
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0344`, `0346`
  - Function description: Add start/end arrowhead options to the Line tool.
  - Acceptance criteria:
    - Start and end arrowheads can be toggled.
    - Arrowhead size scales with line weight.
    - Shape remains editable if `SHAPE-01` is complete.
  - Required tests:
    - `src/test/shapes.test.ts`: rendered line includes arrowhead pixels.
  - Dependencies: `SHAPE-01`
  - Implementation notes:

- [ ] `SHAPE-04` Custom shape presets
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0339`, `0341`
  - Function description: Make Custom Shape tool usable with a small local preset library.
  - Acceptance criteria:
    - Preset picker offers built-in shapes.
    - Drawing selected preset creates editable shape data.
    - Custom shape feature remains local and simple.
  - Required tests:
    - `src/test/shapes.test.ts`: select preset and draw shape.
  - Dependencies: `SHAPE-01`
  - Implementation notes:

- [ ] `TEXT-01` Better font picker and basic text properties
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0351-0367`
  - Function description: Improve basic text editing without advanced typography.
  - Acceptance criteria:
    - Font family, style, size, color, and alignment controls are reliable.
    - Font picker can search common/system font names if practical.
    - Text changes are undoable.
    - Does not include OpenType/glyph/dynamic text engines.
  - Required tests:
    - `src/test/typeReedit.test.ts`: edit font family/style/size/color and undo.
  - Dependencies: `PROPS-04`, `HIST-03`
  - Implementation notes:

- [ ] `TEXT-02` Fill text with image
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0311-0406.md` section `0373`
  - Function description: Clip an image layer into text-like alpha/mask so text can be filled with image content.
  - Acceptance criteria:
    - User can choose a type layer and image layer to create clipped text effect.
    - Result remains editable through masks/layers if feasible.
    - Operation is undoable.
  - Required tests:
    - `src/test/typeOverlay.test.tsx` or `src/test/layers.test.ts`: image visible only inside text alpha.
  - Dependencies: `LAYERS-01`, `PROPS-04`, `HIST-03`
  - Implementation notes:

## P1 - Guides, Snapping, And Settings

- [ ] `GUIDE-01` Draggable guides from rulers
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0407-0505.md` sections `0434-0440`
  - Function description: Let users drag horizontal/vertical guides from rulers onto the canvas.
  - Acceptance criteria:
    - Guides render over the canvas.
    - Guides can be dragged, moved, and deleted.
    - Guides can be hidden/shown.
    - Guide changes are undoable if stored in document state.
  - Required tests:
    - `src/test/guides.test.tsx`: drag from ruler creates guide.
    - Move/delete guide assertions.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `GUIDE-02` New Guide dialog and clear guides
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0407-0505.md` sections `0439`, `0442`
  - Function description: Add menu/dialog commands for precise guide creation and clearing.
  - Acceptance criteria:
    - New Guide accepts orientation and position.
    - Clear Guides removes all guides.
    - Operations are undoable.
  - Required tests:
    - `src/test/guides.test.tsx`: create guide through dialog and clear all.
  - Dependencies: `GUIDE-01`
  - Implementation notes:

- [ ] `GUIDE-03` Smart-guide-like alignment hints
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0407-0505.md` section `0444`
  - Function description: Show temporary alignment hints when moving layers near canvas/layer centers and edges.
  - Acceptance criteria:
    - Hints appear during move/transform.
    - Snap can use hints when enabled.
    - Hints do not mutate document state.
  - Required tests:
    - `src/test/overlays.test.ts`: moving near center renders guide overlay.
  - Dependencies: `LAYERS-02`, `GUIDE-01`
  - Implementation notes:

- [ ] `SET-01` Settings dialog shell
  - Priority: `P1`
  - Source notes: `photoweb-development-plan.md`; `photoweb-function-comparison-0011-0110.md` sections `0049-0054`
  - Function description: Add a local app settings dialog for UI scale, grid/guides, shortcut viewer/customization, and relevant behavior.
  - Acceptance criteria:
    - Dialog opens from menu.
    - Settings persist locally.
    - Settings can be reset to defaults.
  - Required tests:
    - `src/test/settings.test.tsx`: open dialog, change setting, reload store/persistence, assert retained.
  - Dependencies: `None`
  - Implementation notes:

- [ ] `SET-02` Keyboard shortcut viewer and customization
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` section `0053`; `photoweb-function-comparison-0506-0544.md` section `0544`
  - Function description: Show all shortcuts and allow local customization.
  - Acceptance criteria:
    - Viewer lists tool and command shortcuts.
    - User can change a shortcut.
    - Conflicts are detected.
    - Custom shortcuts persist locally.
  - Required tests:
    - `src/test/settings.test.tsx`: change Brush shortcut and assert key activates brush.
    - Conflict warning test.
  - Dependencies: `SET-01`
  - Implementation notes:

## P1 - Brushes, Patterns, And Presets

- [ ] `PRESET-01` Brush preset model and picker
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0323-0333`
  - Function description: Let users save and choose named brush presets without advanced brush dynamics.
  - Acceptance criteria:
    - Presets capture size, hardness, opacity, flow, smoothing, spacing, and mode.
    - User can create, rename, delete, and select presets.
    - Presets persist locally.
  - Required tests:
    - `src/test/brushPresets.test.tsx`: create preset, select it, assert brush settings.
  - Dependencies: `SET-01`
  - Implementation notes:

- [ ] `PRESET-02` Pattern preset model
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0271`; `photoweb-function-comparison-0311-0406.md` sections `0320-0322`
  - Function description: Define image/selection content as reusable pattern presets.
  - Acceptance criteria:
    - Define Pattern from selection or full active layer.
    - Pattern preset stores tile canvas/image data.
    - Presets can be renamed/deleted.
  - Required tests:
    - `src/test/patterns.test.ts`: define pattern and assert tile data.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [ ] `PRESET-03` Pattern fill support
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0316`, `0320`
  - Function description: Use pattern presets as a Paint Bucket fill source and optionally as fill layers.
  - Acceptance criteria:
    - Paint Bucket `pattern` source uses selected pattern, not foreground fallback.
    - Pattern fill respects selection and opacity/mode.
    - Pattern fill layer exists if compatible with fill model.
    - Operations are undoable.
  - Required tests:
    - `src/test/fillTools.test.ts`: pattern bucket fills repeated tile.
    - `src/test/layers.test.ts`: pattern fill layer renders repeated tile if implemented.
  - Dependencies: `PRESET-02`, `HIST-03`
  - Implementation notes:

## P1 - Performance And Stability

- [ ] `STAB-01` Browser storage diagnostics
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0506-0544.md` sections `0532-0541`
  - Function description: Provide clear diagnostics when save/load/autosave fails because of storage quota, browser support, or serialization errors.
  - Acceptance criteria:
    - Save/load failures show actionable messages.
    - Storage quota estimate is used when available.
    - Autosave failures do not silently fail.
  - Required tests:
    - `src/test/persistence.test.ts`: mock storage failure and assert error toast/diagnostic.
  - Dependencies: `None`
  - Implementation notes:

- [ ] `STAB-02` Autosave reliability tests
  - Priority: `P1`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Make autosave recover reliably after reload/failure scenarios.
  - Acceptance criteria:
    - Autosave writes current document.
    - Recovery banner appears when autosave exists.
    - Recover restores layers and active document.
    - Dismiss clears recovery state.
  - Required tests:
    - `src/test/persistence.test.ts`: autosave/recover/dismiss flow.
  - Dependencies: `STAB-01`
  - Implementation notes:

- [ ] `STAB-03` Canvas memory guardrails
  - Priority: `P2`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Prevent common browser crashes by warning before creating/opening oversized documents.
  - Acceptance criteria:
    - New/open/import checks approximate pixel memory.
    - User gets warning or graceful failure for oversized images.
    - No half-created corrupt document on failure.
  - Required tests:
    - `src/test/document.test.ts`: oversize new/open path fails gracefully.
  - Dependencies: `STAB-01`
  - Implementation notes:

## Deferred By Scope

- [>] `AI-*` Generative AI, Neural Filters, Firefly, subject detection, object removal, automatic background removal
  - Reason: User excluded AI and complex content synthesis.

- [>] `CLOUD-*` Cloud documents, collaboration, projects, Adobe integrations
  - Reason: User excluded cloud/account/product ecosystem features.

- [>] `PRINT-*` CMYK, spot colors, ICC workflows, printer resolution, separations
  - Reason: User excluded print-production features.

- [>] `VIDEO-*` Video, timeline animation, frame animation, animated export
  - Reason: User wants photo editing only.

- [>] `AUTO-*` Actions, batch processing, droplets, automation
  - Reason: User excluded automation.

- [>] `SMART-*` Smart Objects and Smart Filters
  - Reason: User excluded Smart Objects and deferred non-destructive Smart Filters.

- [>] `EXPORT-*` Layer export, scaled export, metadata, Content Credentials, PSD/PSB/PDF/TIFF support
  - Reason: User declined export improvement scope and excluded PSD/pro formats.
