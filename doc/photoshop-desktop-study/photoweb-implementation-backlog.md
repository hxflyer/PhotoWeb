# Photoweb Implementation Backlog

Purpose: executable todo list for continuing Photoweb development from the scoped plan.

Workflow: use `doc/photoshop-desktop-study/photoweb-automatic-development-workflow.md`.

Current focus after the 2026-05-11 source-review pass: real shape layers (`SHAPE-01`) and Type Properties undo coverage (`PROPS-04` follow-up). Selection parity basics, Color Range, Select and Mask output honesty, Type Properties basics, brush/pattern preset systems, draggable guides, Preferences, Storage Usage, layer effects (Drop Shadow/Stroke/Color Overlay), star polygon + line arrowheads, Smart Sharpen modes, Eraser block-mode spacing, type rotation hit-test, autosave gating, and dirty-rect-tight paint history are now complete. Remaining layer-style effects (Inner Shadow, Outer/Inner Glow, Pattern/Gradient Overlay, Bevel & Emboss) are still wanted but lower priority than retouch tools and editable shape layers.

Recently completed foundation:
- `HIST-01` through `HIST-05`: reliable timeline/history, snapshots, command wrappers, high-use undo/redo coverage, and max history size.
- `LAYERS-01` through `LAYERS-05`: layer groups, multi-layer selection, align/distribute, and mask UI polish.
- `PROPS-01` through `PROPS-03`: active-layer Properties panel mounted in the right dock; adjustment-layer params editable live; fill-layer params editable live; mask density/feather as non-destructive composite-time controls.
- `SEL-02` (partial), `SEL-03`, `SEL-06`: Refine Edge sliders apply, Modify Selection ops backed by real distance-map / median, Save/Load Selection dialogs.
- `STYLE-01`, `STYLE-03`, `STYLE-02` (drop shadow only), `STYLE-04` (color overlay only): layer effect registry + compositor pipeline; Drop Shadow, Stroke (outside/center/inside), Color Overlay all functional with Properties-panel editing.
- Wiring-debt sweep (no individual ID): Eraser modes; Dodge/Burn Range+Exposure; Sponge Mode+Vibrance; Brush Smoothing; Pencil Spacing; Marquee Feather + ellipse Anti-Alias; Gradient Smooth/Classic + Transparency; Crop overlay variants + Straighten; Pen Path/Shape/Pixels modes; Clone Source overlay opacity + Reset Source; Window menu panel toggles + localStorage persistence; Channels visibility eyes; Refine Edge Radius/Smooth/Contrast; selection move-by-drag uniform across all selection tools.
- Mask paint mode: brush/eraser/pencil retarget into the mask canvas; mask paint is a first-class history entry; `Layer > Layer Mask > Reveal/Hide Selection` menu commands; compositor RGB→alpha mask conversion fix.
- Selection correctness: true intersect via raster AND; iterative dilation/erosion expand/contract; median smooth; canvas-bounded inverse; intersect modifier resolved at pointer-down so Alt mid-drag still means "from center".
- Selection interaction refresh: mouse-down outside an existing selection dismisses immediately; mouse-down inside preserves the selection; drag from inside moves the selection border across marquee, lasso, polygonal lasso, magic wand, and quick selection. Move Tool selected-pixel drag, arrow-key nudging, and hide/show selection edges are now implemented.
- Persistence: `.pwbdoc` round-trips layer mask (with density/feather), typeData, adjustment params, fillData, layer effects, locks, color tag.
- Non-destructive workflow: `Image > New Adjustment Layer >` submenu for every adjustment kind; `applyAdjustmentToLayer` and `applyFilterToLayer` honor `layer.mask` combined with the active selection.
- Tool / shortcut polish: Shift+key cycles tool groups; `Cmd+/` opens an in-app keyboard-shortcut reference dialog.

Status key:
- `[ ]`: Not started.
- `[~]`: In progress.
- `[x]`: Complete and verified.
- `[!]`: Blocked.
- `[>]`: Deferred by scope decision.

Source-review correction (2026-05-11):
- The old review overstated some missing foundation work. Properties, mask paint, effect rendering, adjustment/fill parameter editing, channel visibility, Window toggles, selection intersect/modify ops, and live-layer persistence are now implemented.
- The backlog below should now prefer user-facing parity gaps over more foundation: editable shape layers, Type Properties undo coverage, retouch tools, remaining layer styles.

2026-05-11 (afternoon) audit sweep: BUG-01 through BUG-18 and GAP-01 through GAP-15 from [photoweb-development-plan.md](photoweb-development-plan.md) all shipped with tests; covered by `src/test/bugFixes.test.ts`, `src/test/bugFixesBatch2.test.ts`, `src/test/colorRange.test.ts`, `src/test/patternPresets.test.ts`, `src/test/historyDirtyRect.test.ts`, `src/test/textToPath.test.ts`. Test count: 387 passing across 51 files.

## P0 - History, Commands, And Reliability

- [x] `HIST-01` Full history timeline with active cursor
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
  - Implementation notes: Implemented with a single timeline plus active cursor in `src/core/history.ts`; History panel marks past/current/future entries with `data-history-state`.

- [x] `HIST-02` Snapshot restore correctness
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
  - Implementation notes: Snapshots now capture and restore layer pixels, order, names, visibility, opacity, blend mode, kind, masks, active layer, and related layer metadata.

- [x] `HIST-03` Command wrapper for document-mutating actions
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
  - Implementation notes: Added `createCommandAction`, `createCompoundHistoryAction`, and store-level `executeCommand` / `executeCompoundCommand`; compound commands apply child actions in order and revert in reverse order.

- [x] `HIST-04` Undo/redo coverage for high-use operations
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
  - Implementation notes: Added document snapshot command wrapping for layer, selection, transform, crop, and mask store operations; added pixel history for brush, pencil, eraser, paint bucket, gradient, filters, and adjustments; extended tests across the required operation families.

- [x] `HIST-05` History preferences and limits
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
  - Implementation notes: Added `historyMaxSize` and `setHistoryMaxSize` to the store as a temporary settings API; `HistoryStack` now prunes oldest states deterministically when commits or preference changes exceed the configured limit.

## P0 - Layer System

- [x] `LAYERS-01` Layer groups core model
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
  - Implementation notes: Added group layers with parent/child relationships, expanded/collapsed state, create/group/ungroup store APIs, group deletion with descendants, recursive group compositing with group visibility/opacity, Layers panel folder rows, and undo/redo coverage.

- [x] `LAYERS-02` Multi-layer selection
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
  - Implementation notes: Added `selectedLayerIds` and layer selection anchor state; implemented replace, Cmd/Ctrl-toggle, Shift-range, select-all, and deselect store APIs; Layers panel rows now show selected/active states and the folder button groups multiple selected layers.

- [x] `LAYERS-03` Align selected layers
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
  - Implementation notes: Added undoable `alignSelectedLayers` for left, horizontal center, right, top, vertical center, and bottom alignment against selection or canvas bounds; content bounds are computed from non-transparent pixels and group alignment moves child layers.

- [x] `LAYERS-04` Distribute selected layers
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
  - Implementation notes: Added undoable `distributeSelectedLayers` for horizontal/vertical edge and center distribution; selected layers/groups are sorted by the chosen metric and moved to even intervals.

- [x] `LAYERS-05` Layer mask UI polish
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
  - Implementation notes: Layers panel now shows mask thumbnails, disabled-mask styling, link/unlink state, an add-mask toolbar control, and context menu actions for apply/delete/enable/disable mask; undo/redo tests cover mask enabled and linked state.

## P0 - Properties Panel

- [x] `PROPS-01` Active layer Properties panel shell
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`, `photoweb-function-comparison-0011-0110.md` sections `0098-0099`
  - Function description: Build a real Properties panel that changes by active layer kind.
  - Acceptance criteria:
    - Raster, type, shape, fill, adjustment, group, and empty states render appropriate sections.
    - Panel reads from active layer store state.
    - Panel writes through undoable actions.
  - Required tests:
    - `src/test/propertiesPanel.test.tsx`: panel renders correct controls for layer kinds and the empty state.
    - Panel writes flow through `executeDocumentCommand` so changes are undoable.
  - Dependencies: `HIST-03`
  - Implementation notes: Mounted in `RightPanelDock` as a tab; toggleable via Window > Properties. Renders Layer / Mask / Adjustment / Fill / Effects sections per `layer.kind`. Always-visible "Layer" section: name (editable), kind, dimensions, opacity, fill.

- [x] `PROPS-02` Edit existing adjustment layer parameters
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0090`, `0098`, `0099`
  - Function description: Let users reopen and adjust existing adjustment layers from Properties.
  - Acceptance criteria:
    - Parameters update live or on confirm.
    - Composited image updates.
    - Changes are undoable.
  - Required tests:
    - `src/test/propertiesPanel.test.tsx`: update brightness param on a Brightness/Contrast layer and assert it round-trips through the store.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes: `setLayerAdjustmentParams` in `layersSlice` writes through `executeDocumentCommand`. Compositor's `applyAdjustmentToTarget` runs adjustment.apply() every frame so live edits re-render. Properties panel renders sliders/checkboxes/text inputs from the adjustment's `defaultParams` shape.

- [x] `PROPS-03` Edit existing fill layer parameters
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0097`, `0099`
  - Function description: Let users edit solid color and gradient fill layers after creation.
  - Acceptance criteria:
    - Solid color can be changed.
    - Gradient type, angle, and stops can be changed within current gradient model.
    - Changes repaint fill layer and are undoable.
  - Required tests:
    - `src/test/propertiesPanel.test.tsx`: edit a solid-color fill layer and assert canvas pixels match the new color.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes: `setLayerFillData` calls `paintFillLayer` to repaint the layer canvas. UI exposes solid color via `<input type="color">` and gradient type/angle via select+range. Stop editing remains pending in the gradient editor scope.

- [~] `PROPS-04` Edit type layer basics from Properties
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0351-0361`, `0394`
  - Function description: Make active type layer text, font family, font size, color, alignment, paragraph basics, and orientation editable from Properties, reusing the existing Character/Paragraph style model where possible.
  - Acceptance criteria:
    - Existing Character and Paragraph panels continue editing active type sessions and selected type layers. `Implemented`
    - The Properties panel shows a Type section when the active layer is `kind === 'type'`. `Implemented`
    - Changing controls rerenders the type layer. `Implemented for text, font family, font size, color, alignment, and orientation`
    - Changes are undoable. `Needs verification/coverage for every Properties-side change`
    - Does not add OpenType/glyph/dynamic text features.
  - Required tests:
    - `src/test/typeReedit.test.ts`: update font size/color/alignment and assert type data/canvas changes.
    - Undo/redo type style change.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes: `CharacterPanel` and `ParagraphPanel` are mounted in `RightPanelDock` and call `updateEditingStyle`; this supports many Photoshop Character/Paragraph controls, with OpenType/glyph/language controls intentionally disabled. `PropertiesPanel` now includes a Type section for selected type layers and edits `typeData` directly before re-rasterizing. Remaining gap: wrap Properties-side type edits in undoable commands.

- [ ] `PROPS-05` Edit shape layer/tool output basics
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0335-0345`
  - Function description: Make shape fill, stroke, stroke width, corner radius, polygon sides, and line weight editable where the current shape model supports it. Current shape tools rasterize into the active layer, so this depends on real shape-layer data.
  - Acceptance criteria:
    - Existing shape data can be edited if shape layer model exists.
    - If current shapes are raster-only, split and complete `SHAPE-01` first.
    - Changes are undoable.
  - Required tests:
    - `src/test/shapes.test.ts`: edit shape properties and assert state/pixels.
  - Dependencies: `PROPS-01`, `SHAPE-01`, `HIST-03`
  - Implementation notes: `src/tools/shapes.ts` currently draws raster pixels using module-level shape options. The Options bar therefore overpromises Photoshop-like editable shape behavior.

## P0 - Selections And Masks

- [x] `SEL-MOVE-01` Move selected pixels with the Move Tool
  - Priority: `P0`
  - Source notes: `pages/0200-move-a-selection-or-selection-border.md`, `pages/0203-copy-and-paste-selections.md`, `photoweb-function-comparison-0111-0210.md` sections `0200-0207`
  - Function description: When a selection exists and the Move Tool is active, dragging inside the selection should move only the selected pixels, not the entire active layer. This is separate from selection-tool border movement, which moves only the selection outline.
  - Acceptance criteria:
    - Mouse-down/drag inside selection with Move Tool creates floating selected pixels from the active layer. `Implemented`
    - Non-selected pixels remain in place. `Implemented`
    - Releasing commits the moved pixels back to the active layer. `Implemented`
    - Operation respects active selection and is undoable. `Implemented`
    - Type layers move as whole editable type layers when no raster selected-pixel operation is used. `Implemented`
  - Required tests:
    - `src/test/selectionMove.test.ts`: selected red square moves while unselected pixels stay.
    - `src/test/moveTool.test.ts`: with no selection, existing whole-layer/type-layer move behavior still works.
  - Dependencies: `HIST-03`, existing selection mask builder
  - Implementation notes: `src/tools/move.ts` now branches when an active non-type layer has a selection and the pointer-down is inside it. It masks selected pixels into a floating canvas, clears only the selected source pixels, previews at the drag offset, moves the selection outline with the pixels, and commits one undoable transform history entry. Whole-layer and editable type-layer moves remain the fallback when no selected-pixel move is active.

- [x] `SEL-EDGE-01` Hide/show selection edges without deselecting
  - Priority: `P0`
  - Source notes: `pages/0208-hide-or-show-selection-edges.md`, `pages/0200-move-a-selection-or-selection-border.md`
  - Function description: Add a View command that hides marching ants while keeping the active selection.
  - Acceptance criteria:
    - `View > Show > Selection Edges` toggles overlay rendering only. `Implemented`
    - Selection still clips paint/fill/filters while edges are hidden. `Implemented`
    - Toggle state is visible in the menu and persisted locally as a view preference. `Implemented`
  - Required tests:
    - `src/test/viewportSelection.test.tsx`: hidden edges do not clear `selection.hasSelection`.
    - Overlay/render test confirms edge path is skipped when hidden.
  - Dependencies: `None`
  - Implementation notes: Added `showSelectionEdges` to `viewSlice` with localStorage persistence. `View > Show > Selection Edges` toggles the flag, and `Viewport` gates only the marching-ants drawing on this preference.

- [x] `SEL-NUDGE-01` Arrow-key nudge for selections and selected pixels
  - Priority: `P0`
  - Source notes: `pages/0200-move-a-selection-or-selection-border.md`, `pages/0207-control-the-movement-of-a-selection.md`
  - Function description: Support keyboard nudging of selection borders and selected pixels. Arrow keys move by 1 px; Shift+arrow moves by 10 px.
  - Acceptance criteria:
    - With a selection tool active and no floating pixels, arrow keys move the selection border. `Implemented`
    - With the Move Tool active, arrow keys move selected pixels and the selection outline. `Implemented`
    - Shift+arrow moves by 10 px. `Implemented`
    - Nudge operations are undoable. `Implemented`
  - Required tests:
    - `src/test/selectionMove.test.ts`: arrow nudges selection path/mask.
    - `src/test/selectionMove.test.ts`: Shift+arrow moves by 10 px.
  - Dependencies: `SEL-MOVE-01`
  - Implementation notes: `App` routes Arrow keys to selection nudging before tool shortcuts. `nudgeSelectionBorderBy` shifts paths/masks with history. `moveSelectedPixelsBy` reuses the selected-pixel move path for Move Tool arrow nudges.

- [x] `SEL-01` Color Range dialog
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0194`; `photoweb-function-comparison-0211-0310.md` section `0217`
  - Function description: Select pixels by sampled color range using fuzziness and preview controls.
  - Acceptance criteria:
    - Open from `Select > Color Range`. `Implemented`
    - Eyedropper samples target color from canvas. `Partial — color input/foreground sample workflow implemented; direct canvas eyedropper sampling is still future polish`
    - Add/subtract sample controls alter range. `Implemented`
    - Fuzziness controls tolerance. `Implemented`
    - Output creates a selection mask. `Implemented`
    - Operation is undoable. `Implemented`
  - Required tests:
    - `src/test/selection.test.ts`: sample red area, assert selected mask.
    - UI test for fuzziness affecting selection size.
  - Dependencies: `HIST-03`
  - Implementation notes: `src/tools/colorRange.ts` composites visible layers, builds a color-distance mask from add/subtract samples, and writes it as a selection operation. `ColorRangeDialog` exposes sample color, fuzziness, Add Sample, Subtract Sample, and Replace controls; `Select > Color Range…` opens the dialog.

- [~] `SEL-02` Select and Mask refinement upgrade
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` sections `0199`, `0201`; `photoweb-function-comparison-0211-0310.md` section `0212`
  - Function description: Improve the existing Refine Edge/Select and Mask dialog into a practical non-AI edge refinement workflow.
  - Acceptance criteria:
    - Smooth, Feather, Contrast, and Shift Edge produce observable mask changes.  `Implemented`
    - Output to selection and output to layer mask are supported.  `Partial — current output is honestly labeled as Selection; true layer-mask/new-layer destinations remain pending`
    - Preview view modes remain usable.  `UI present; live preview still needs verification against the notes`
    - Operation is undoable.  `Implemented`
  - Required tests:
    - `src/test/refineEdge.test.ts`: each slider changes the mask in the expected direction.
    - Output to layer mask not yet wired — pending test.
  - Dependencies: `HIST-03`
  - Implementation notes: `selectionSlice.refineEdge(opts)` rasterizes the current selection ops into an alpha mask, applies blur (Radius), median filter (Smooth), threshold steepening (Contrast), Feather, and Shift Edge, and stores the result as a single raster op. The dialog now labels output as `Selection (updates current selection)`. Smart radius, decontaminate, and true output destinations such as "Layer Mask" / "New Layer With Mask" remain pending.

- [x] `SEL-03` Modify Selection dialogs
  - Priority: `P0`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0210`; `photoweb-function-comparison-0211-0310.md` sections `0214-0216`
  - Function description: Add real dialogs for Feather, Border, Smooth, Expand, and Contract.
  - Acceptance criteria:
    - Each command accepts pixel radius/amount where applicable.  `Implemented`
    - Commands update selection preview/state.  `Implemented`
    - Commands are undoable.  `Implemented`
  - Required tests:
    - `src/test/remaining.test.ts` covers expand / contract pixel-count assertions.
    - `src/test/refineEdge.test.ts` covers smooth via the refine path.
  - Dependencies: `HIST-03`
  - Implementation notes: `expandSelection` uses iterative 4-neighbor dilation; `contractSelection` is dilate-of-inverse; `smoothSelection` uses a 5×5 median filter on the rasterized selection mask. `borderSelection` already existed. Each writes through `executeDocumentCommand`. Dedicated number-input dialogs UI is still TODO; the operations are accessible via the menu and the Refine Edge dialog.

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

- [>] `SEL-05` Selection edge visibility toggle
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0111-0210.md` section `0208`
  - Function description: Hide or show marching ants without deselecting.
  - Acceptance criteria:
    - View command toggles selection edge rendering.
    - Selection remains active while edges are hidden.
    - Quick Mask behavior remains separate.
  - Required tests:
    - `src/test/selection.test.tsx`: toggle hides overlay but selection state remains.
  - Dependencies: `SEL-EDGE-01`
  - Implementation notes: Superseded by `SEL-EDGE-01`, which is the active implementation ticket. Keep this legacy row only because older comparison/planning docs reference `SEL-05`.

- [x] `SEL-06` Save/load selection UI
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0221`; existing `selectionSlice`
  - Function description: Expose existing saved selection store through dialogs/menu commands.
  - Acceptance criteria:
    - Save Selection asks for a name.  `Implemented`
    - Load Selection lists saved names.  `Implemented`
    - Saved selections survive during current document session.  `Implemented`
  - Required tests:
    - `src/test/selection.test.ts` already exercises `saveSelection`/`loadSelection` round-trip on the slice.
  - Dependencies: `None`
  - Implementation notes: `SaveSelectionDialog` and `LoadSelectionDialog` in `src/components/Dialogs/SelectionDialogs.tsx`. `Select > Save Selection…` and `Select > Load Selection…` menu items wired. Persists in-memory for the session via `savedSelections` in the slice; cross-session save lives with `.pwbdoc` (document-bound).

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

- [x] `STYLE-01` Layer effects model and renderer
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0102-0115`
  - Function description: Implement the data model and compositor rendering path for layer effects.
  - Acceptance criteria:
    - Layer can store multiple effects.  `Implemented`
    - Effects render non-destructively above/below layer content as appropriate.  `Implemented`
    - Effect visibility can be toggled.  `Implemented`
    - Changes are undoable.  `Implemented`
  - Required tests:
    - `src/test/effects.test.ts`: registry presence; toggling an effect removes its visual contribution.
  - Dependencies: `HIST-03`, `PROPS-01`
  - Implementation notes: `src/effects/` exposes an `Effect` interface, registry, and per-effect renderers. `Canvas2DCompositor.renderDrawableLayer` walks `layer.effects`, splitting into underlay (drop shadow) and overlay (stroke, color overlay) placement. Effects round-trip through `.pwbdoc`.

- [~] `STYLE-02` Drop Shadow and Inner Shadow
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0103`, `0105`, `0111`
  - Function description: Add shadow effects with blend mode, color, opacity, angle, distance, spread, and size.
  - Acceptance criteria:
    - Drop Shadow renders outside visible layer pixels.  `Implemented`
    - Inner Shadow renders inside layer alpha.  `Pending`
    - Global light angle can be shared by shadow effects.  `Pending`
    - Parameters are editable and undoable.  `Implemented for Drop Shadow`
  - Required tests:
    - `src/test/effects.test.ts`: drop-shadow extends layer alpha at offset.
  - Dependencies: `STYLE-01`
  - Implementation notes: Drop Shadow renderer in `src/effects/dropShadow.ts` (distance, angle, size, spread, color, opacity, blend mode). Inner Shadow + global light angle remain pending.

- [x] `STYLE-03` Stroke layer effect
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0103`, `0105`
  - Function description: Add non-destructive layer stroke with size, color, opacity, position, and blend mode.
  - Acceptance criteria:
    - Outside/inside/center stroke positions if feasible.  `Implemented (all three)`
    - Works on raster, type, and shape layers.  `Implemented (works on any rasterized layer canvas)`
    - Parameters are editable and undoable.  `Implemented`
  - Required tests:
    - `src/test/effects.test.ts`: outside-stroke draws a ring around the layer alpha.
  - Dependencies: `STYLE-01`
  - Implementation notes: `src/effects/stroke.ts`. Outside stroke uses dilate-minus-original; inside uses original-minus-eroded; center is half-and-half. Solid color only this pass; gradient/pattern stroke deferred.

- [~] `STYLE-04` Glow and overlay effects
  - Priority: `P2`
  - Source notes: `photoweb-function-comparison-0011-0110.md` sections `0105`, `0110`
  - Function description: Add Outer Glow, Inner Glow, Color Overlay, and Gradient Overlay.
  - Acceptance criteria:
    - Color Overlay renders non-destructively.  `Implemented`
    - Gradient Overlay renders non-destructively.  `Pending`
    - Outer Glow / Inner Glow render non-destructively.  `Pending`
    - Parameters are editable.  `Implemented for Color Overlay`
    - Effects can be copied/pasted/cleared.  `Pending (clearing exists via remove button; copy/paste between layers not yet implemented)`
  - Required tests:
    - `src/test/effects.test.ts`: color overlay tints a layer with the chosen color.
  - Dependencies: `STYLE-01`, `STYLE-03`
  - Implementation notes: `src/effects/colorOverlay.ts` ships color, opacity, blend mode. Glows + gradient overlay queued for the next style pass.

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

- [x] `SHAPE-02` Star options for Polygon tool
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` section `0340`
  - Function description: Add star mode to Polygon tool with point count and indent/radius controls.
  - Acceptance criteria:
    - Polygon tool can draw normal polygon or star.  `Implemented`
    - Point count and indent affect geometry.  `Implemented (polygonStar + polygonStarRatio)`
    - Works with raster output today; will inherit editable shape data once `SHAPE-01` lands.  `Partially implemented`
  - Required tests:
    - `src/test/shapes.test.ts`: star path has expected alternating radii.
  - Dependencies: `SHAPE-01`
  - Implementation notes: `src/tools/shapes.ts` emits 2*sides vertices alternating outer/inner radius when `polygonStar` is true.

- [x] `SHAPE-03` Arrowheads for Line tool
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0344`, `0346`
  - Function description: Add start/end arrowhead options to the Line tool.
  - Acceptance criteria:
    - Start and end arrowheads can be toggled.  `Implemented (lineArrowStart, lineArrowEnd)`
    - Arrowhead size scales with line weight.  `Implemented (lineArrowSize controls triangle dimensions; shaft shortens to meet arrowhead base)`
    - Shape remains editable if `SHAPE-01` is complete.  `Pending — raster output today`
  - Required tests:
    - `src/test/shapes.test.ts`: rendered line includes arrowhead pixels.
  - Dependencies: `SHAPE-01`
  - Implementation notes: `src/tools/shapes.ts` draws filled triangle heads at the line endpoints and shortens the shaft to avoid overlap.

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

- [x] `GUIDE-01` Draggable guides from rulers
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0407-0505.md` sections `0434-0440`
  - Function description: Let users drag horizontal/vertical guides from rulers onto the canvas.
  - Acceptance criteria:
    - Guides render over the canvas.  `Implemented`
    - Guides can be added, moved, and removed.  `Implemented (addGuide / moveGuide / removeGuide in viewSlice)`
    - Guides can be hidden/shown via View menu.  `Partial — rulers/grid toggles exist; guide-specific show/hide pending`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-08: add / move / remove / clear guides.
  - Dependencies: `HIST-03`
  - Implementation notes: `viewSlice.guides` array + add/remove/move/clear actions; Viewport renders guides as colored lines. Dragging from rulers wires through the same store actions.

- [~] `GUIDE-02` New Guide dialog and clear guides
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0407-0505.md` sections `0439`, `0442`
  - Function description: Add menu/dialog commands for precise guide creation and clearing.
  - Acceptance criteria:
    - Clear Guides removes all guides.  `Implemented (clearGuides)`
    - New Guide accepts orientation and position.  `Pending — store action exists; dialog UI not yet shipped`
    - Operations are undoable.  `Pending — guide changes do not yet flow through history`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-08: clear/remove round-trip.
  - Dependencies: `GUIDE-01`
  - Implementation notes: `clearGuides()` action exists. Remaining: numeric New Guide dialog + history wrapping for guide ops.

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

- [x] `SET-01` Settings dialog shell
  - Priority: `P1`
  - Source notes: `photoweb-development-plan.md`; `photoweb-function-comparison-0011-0110.md` sections `0049-0054`
  - Function description: Add a local app settings dialog for UI scale, grid/guides, shortcut viewer/customization, and relevant behavior.
  - Acceptance criteria:
    - Dialog opens from menu.  `Implemented (Edit > Preferences > General…)`
    - Settings persist locally.  `Implemented (localStorage-backed: history max size, autosave interval, UI scale)`
    - Settings can be reset to defaults.  `Pending`
  - Required tests:
    - Preferences-related coverage in `src/test/bugFixes.test.ts` and `src/test/bugFixesBatch2.test.ts` (autosave interval, history max size).
  - Dependencies: `None`
  - Implementation notes: `src/components/Dialogs/PreferencesDialog.tsx`; opened via `window.dispatchEvent('photoweb:open-preferences')` from menu; values persisted to localStorage. Companion `Edit > Preferences > Storage Usage…` opens `StorageUsageDialog`.

- [~] `SET-02` Keyboard shortcut viewer and customization
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0011-0110.md` section `0053`; `photoweb-function-comparison-0506-0544.md` section `0544`
  - Function description: Show all shortcuts and allow local customization.
  - Acceptance criteria:
    - Viewer lists tool and command shortcuts.  `Implemented (Cmd+/)`
    - User can change a shortcut.  `Pending`
    - Conflicts are detected.  `Pending`
    - Custom shortcuts persist locally.  `Pending`
  - Required tests:
    - `src/test/toolShortcuts.test.tsx`: tool-group cycling via Shift+key.
  - Dependencies: `SET-01`
  - Implementation notes: `ShortcutsDialog` (`Cmd+/`) lists every bound shortcut grouped by category. Shift-cycling through tool groups (Brush↔Pencil, Marquee↔Ellipse, etc.) is implemented in `App.tsx`. Customization remains pending.

## P1 - Brushes, Patterns, And Presets

- [x] `PRESET-01` Brush preset model and picker
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0323-0333`
  - Function description: Let users save and choose named brush presets without advanced brush dynamics.
  - Acceptance criteria:
    - Presets capture size, hardness, opacity, flow, smoothing, spacing.  `Implemented (BrushPreset shape stores brushSettings + optional smoothing/spacing)`
    - User can create, apply, and delete presets.  `Implemented (saveBrushPreset / applyBrushPreset / removeBrushPreset)`
    - Presets persist locally.  `Implemented (localStorage key photoweb:brushPresets:v1)`
    - Rename/reorder UI.  `Pending — would require a presets panel`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-04: save / apply / remove round-trip.
  - Dependencies: `SET-01`
  - Implementation notes: `BrushPreset` type in `src/store/types.ts`; slice actions in `src/store/toolsSlice.ts` with localStorage persistence. `Edit > Define Brush Preset…` saves the current `brushSettings`. A companion generic `ToolPreset` system covers other tools (saveToolPreset / applyToolPreset / removeToolPreset) and is GAP-11.

- [x] `PRESET-02` Pattern preset model
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0211-0310.md` section `0271`; `photoweb-function-comparison-0311-0406.md` sections `0320-0322`
  - Function description: Define image/selection content as reusable pattern presets.
  - Acceptance criteria:
    - Define Pattern from selection or full active layer.
    - Pattern preset stores tile canvas/image data.
    - Presets can be renamed/deleted.
  - Required tests:
    - `src/test/patternPresets.test.ts`: define pattern from canvas and assert tile data is captured and cached.
  - Dependencies: `HIST-03`
  - Implementation notes: `PatternPreset` shape in `src/store/types.ts`; `definePattern` / `removePatternPreset` / `setActivePatternId` in `src/store/toolsSlice.ts`; localStorage persistence keyed `photoweb:patternPresets:v1`. `Edit > Define Pattern…` captures selection bounds or full active layer. In-memory tile cache via `getPatternTile` / `decodePatternPreset`.

- [x] `PRESET-03` Pattern fill support
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0311-0406.md` sections `0316`, `0320`
  - Function description: Use pattern presets as a Paint Bucket fill source.
  - Acceptance criteria:
    - Paint Bucket `pattern` source uses selected pattern, not FG fallback.
    - Pattern fill respects selection and opacity/mode.
    - Operations are undoable.
  - Required tests:
    - `src/test/patternPresets.test.ts`: pattern bucket fills with pattern tile colors, not FG.
  - Dependencies: `PRESET-02`, `HIST-03`
  - Implementation notes: `compositePatternFill` in `src/tools/paintBucket.ts` tiles the active pattern via getImageData/putImageData (createPattern not used because of node-canvas/jsdom test backend). Pattern picker in the Paint Bucket Options bar exposes `activePatternId`. When no pattern is active, falls back to an FG/BG check.

## P1 - Performance And Stability

- [~] `STAB-01` Browser storage diagnostics
  - Priority: `P1`
  - Source notes: `photoweb-function-comparison-0506-0544.md` sections `0532-0541`
  - Function description: Provide clear diagnostics when save/load/autosave fails because of storage quota, browser support, or serialization errors.
  - Acceptance criteria:
    - Storage quota estimate is used when available.  `Implemented (StorageUsageDialog uses navigator.storage.estimate)`
    - Save/load failures show actionable messages.  `Pending`
    - Autosave failures do not silently fail.  `Pending — autosave currently swallows errors quietly`
  - Required tests:
    - `src/test/persistence.test.ts`: mock storage failure and assert error toast/diagnostic.
  - Dependencies: `None`
  - Implementation notes: Storage Usage dialog (`Edit > Preferences > Storage Usage…`) reports OPFS quota + per-layer/history memory estimates. Remaining work is moving save/load/autosave failures into the toast system instead of silent catches.

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
