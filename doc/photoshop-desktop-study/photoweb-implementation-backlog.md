# Photoweb Implementation Backlog

Purpose: active backlog of in-flight and remaining work. Historical implementation passes live in [CHANGELOG.md](CHANGELOG.md). Scope policy and milestones live in [photoweb-development-plan.md](photoweb-development-plan.md). Parallel-track ownership lives in [photoweb-parallel-development-plan.md](photoweb-parallel-development-plan.md). Per-task SOP lives in [CLAUDE.md §5](../../CLAUDE.md#5-standard-operating-procedure-every-task).

Current state (2026-05-11, late evening): **789 tests passing across 98 files, 0 lint errors, TypeScript clean**. Foundation + 6 parallel-plan batches (Batches 1–6) + Batch 7 (Photoshop UX parity, slices A–J) + Batch 8 (P1/P2 polish: FT context menu, Magic Wand sampleSize, Polygonal Lasso angle snap, Reselect, Hide Edges, Modify dialogs, Healing Brush options, Polygon smoothing, Type shortcuts) shipped. See [CHANGELOG.md](CHANGELOG.md) for the per-pass detail. The research-driven gap report driving Batches 7-8 lives at [photoweb-photoshop-ux-gap-report.md](photoweb-photoshop-ux-gap-report.md).

Current focus: All 63 audit-flagged gaps from the 2026-05-12 deep-audit pass shipped across Batch 5 (selection-awareness + effects fidelity + transform preservation + selection workflow + UI shell completeness) and Batch 6 (dirty-rect plumbing + path persistence + Pen Shape-mode → shape-layer + Type Convert to Shape + Stroke/Fill Path dialogs + Type/Shape UI completeness + Selective Color + adjustments completeness + P2 polish). Remaining open work: the Batch 4-deferred `Edit > Fill / Stroke / Fade` integrator slice (worktree preserved at `.claude/worktrees/agent-a03aa3bc7382876b7`); the `Viewport.tsx` follow-up to actually trigger the new clipped-composite path during stroke RAF; combining existing shape layers via Path2D math (currently MVP — combineMode set on next shape only); shape preset library expansion; the explicit dev-plan exclusions (AI, generative, Adobe ecosystem, Smart Objects, etc.) remain out of scope.

Status key:
- `[ ]`: Not started.
- `[~]`: In progress.
- `[x]`: Complete and verified.
- `[!]`: Blocked.
- `[>]`: Deferred by scope decision.

## P0 - History, Commands, And Reliability

- [x] `HIST-01` Full history timeline with active cursor
  - Priority: `P0`
  - Source notes: `photoweb-development-plan.md`, `pages/` notes `0041-0047`
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
  - Source notes: `pages/` note `0045`
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
  - Source notes: `pages/` note `0042`
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
  - Source notes: `pages/` notes `0074`, `0084`; `photoweb-development-plan.md`
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
  - Source notes: `pages/` notes `0083`, `0134`, `0136`
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
  - Source notes: `pages/` note `0134`
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
  - Source notes: `pages/` note `0136`
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
  - Source notes: `pages/` notes `0221-0227`
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
  - Source notes: `photoweb-development-plan.md`, `pages/` notes `0098-0099`
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
  - Source notes: `pages/` notes `0090`, `0098`, `0099`
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
  - Source notes: `pages/` notes `0097`, `0099`
  - Function description: Let users edit solid color and gradient fill layers after creation.
  - Acceptance criteria:
    - Solid color can be changed.
    - Gradient type, angle, and stops can be changed within current gradient model.
    - Changes repaint fill layer and are undoable.
  - Required tests:
    - `src/test/propertiesPanel.test.tsx`: edit a solid-color fill layer and assert canvas pixels match the new color.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes: `setLayerFillData` calls `paintFillLayer` to repaint the layer canvas. UI exposes solid color via `<input type="color">` and gradient type/angle via select+range. Stop editing remains pending in the gradient editor scope.

- [x] `PROPS-04` Edit type layer basics from Properties
  - Priority: `P1`
  - Source notes: `pages/` notes `0351-0361`, `0394`
  - Function description: Make active type layer text, font family, font size, color, alignment, paragraph basics, and orientation editable from Properties, reusing the existing Character/Paragraph style model where possible.
  - Acceptance criteria:
    - Existing Character and Paragraph panels continue editing active type sessions and selected type layers. `Implemented`
    - The Properties panel shows a Type section when the active layer is `kind === 'type'`. `Implemented`
    - Changing controls rerenders the type layer. `Implemented for text, font family, font size, color, alignment, and orientation`
    - Changes are undoable. `Implemented — every Properties / Character / Paragraph edit on a selected type layer is wrapped in a 'layer-property' command and slider drags coalesce into one entry per drag end via begin/commit helpers in src/tools/typeCommands.ts.`
    - Does not add OpenType/glyph/dynamic text features.
  - Required tests:
    - `src/test/typeReedit.test.ts`: update font size/color/alignment and assert type data/canvas changes.
    - `src/test/typeUndo.test.tsx`: Properties text/font size, Character font family, Paragraph alignment, slider drag coalescing, rotated-layer rerender, and post-undo type re-edit hit-test.
  - Dependencies: `PROPS-01`, `HIST-03`
  - Implementation notes: `CharacterPanel` and `ParagraphPanel` are mounted in `RightPanelDock` and call `updateEditingStyle`; this supports many Photoshop Character/Paragraph controls, with OpenType/glyph/language controls intentionally disabled. `PropertiesPanel` now includes a Type section for selected type layers and edits `typeData` directly before re-rasterizing. Every panel-driven edit routes through `applyTypeEdit` / `applyTypeStyleEdit` (one-shot commits) or `beginCoalescedTypeEdit` + `applyCoalesced*Patch` + `commitCoalescedTypeEdit` (drag coalescing) in `src/tools/typeCommands.ts`. While the contenteditable overlay is open, Character/Paragraph still flow through `updateEditingStyle` so the live preview remains intact; history is captured when the panels target a selected type layer that is not in an active edit session.

- [x] `PROPS-05` Edit shape layer/tool output basics
  - Priority: `P1`
  - Source notes: `pages/` notes `0335-0345`
  - Function description: Make shape fill, stroke, stroke width, corner radius, polygon sides, and line weight editable where the current shape model supports it. Current shape tools rasterize into the active layer, so this depends on real shape-layer data.
  - Acceptance criteria:
    - Existing shape data can be edited if shape layer model exists.  `Implemented — Properties panel renders a Live Shape Properties section per discriminated ShapeData variant`
    - If current shapes are raster-only, split and complete `SHAPE-01` first.  `Resolved by SHAPE-01 in Batch 1`
    - Changes are undoable.  `Implemented via src/tools/shapeCommands.ts — applyShapeEdit for one-shot commits, beginCoalescedShapeEdit/applyCoalescedShapePatch/commitCoalescedShapeEdit for drag-end coalescing`
  - Required tests:
    - `src/test/shapeProperties.test.tsx`: 13 simulator/RTL cases covering control visibility per shape kind, width/sides/star/arrowhead edits, slider coalescing (4 onChange → 1 history entry on mouseUp), one-shot color commits, and undo/redo.
  - Dependencies: `PROPS-01`, `SHAPE-01`, `HIST-03`
  - Implementation notes: Shape section lives in `src/components/Panels/PropertiesPanel.tsx` and is rendered when `layer.kind === 'shape'`. Controls mirror Photoshop's Live Shape Properties module — Width/Height, Corner Radius for rounded-rect, Sides/Star/Indent Sides By for polygon, Start/End/Arrow Size for line, plus shared Fill (solid color + on/off), Stroke (color, weight, opacity, alignment Outside/Center/Inside, on/off). Dashed-line patterns are out of scope until `ShapeStroke` gains a `dash` field.

## P0 - Selections And Masks

- [x] `SEL-MOVE-01` Move selected pixels with the Move Tool
  - Priority: `P0`
  - Source notes: `pages/0200-move-a-selection-or-selection-border.md`, `pages/0203-copy-and-paste-selections.md`, `pages/` notes `0200-0207`
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
  - Source notes: `pages/` note `0194`; `pages/` note `0217`
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

- [x] `SEL-02` Select and Mask refinement upgrade
  - Priority: `P0`
  - Source notes: `pages/` notes `0199`, `0201`; `pages/` note `0212`
  - Function description: Improve the existing Refine Edge/Select and Mask dialog into a practical non-AI edge refinement workflow.
  - Acceptance criteria:
    - Smooth, Feather, Contrast, and Shift Edge produce observable mask changes.  `Implemented`
    - Output destinations cover Selection, Layer Mask, New Layer, New Layer with Layer Mask, New Document, and New Document with Layer Mask.  `Implemented`
    - Preview view modes match Photoshop: Onion Skin, Marching Ants, Overlay, On Black, On White, Black & White, On Layers — all wired to a SelectAndMaskCanvas preview.  `Implemented`
    - Operation is undoable as a single history entry covering refine + output.  `Implemented`
  - Required tests:
    - `src/test/selectionDialogBatchB.test.tsx`: per-view-mode composite pixel asserts and Output To Layer / Document undo coverage.
    - `src/test/refineEdgeSliceH.test.tsx`: each slider changes the mask in the expected direction.
  - Dependencies: `HIST-03`
  - Implementation notes: `selectionSlice.applyRefineEdgeOutput(opts, target)` rolls the refine math and the output (selection / layer mask / new layer / new layer with layer mask / new document / new document with layer mask) into a single `executeDocumentCommand`, so undo reverts everything together. View-mode preview is rendered by `src/utils/selectAndMaskCompositor.ts` and `src/components/Canvas/SelectAndMaskCanvas.tsx`. Smart Radius modulates per-pixel blur radius from a Sobel gradient on the active layer. Decontaminate Colors remains pending follow-up.

- [x] `SEL-03` Modify Selection dialogs
  - Priority: `P0`
  - Source notes: `pages/` note `0210`; `pages/` notes `0214-0216`
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

- [x] `SEL-03B` Grow and Similar
  - Priority: `P1`
  - Source notes: `pages/` notes `0214-0216`
  - Function description: Extend the active selection by color similarity. Grow is contiguous (flood fill from selected pixels), Similar is non-contiguous (every pixel matching any seed color).
  - Acceptance criteria:
    - Grow expands contiguously by color tolerance.  `Implemented`
    - Similar selects all matching colors regardless of contiguity.  `Implemented`
    - Both are undoable.  `Implemented`
  - Required tests:
    - `src/test/selectionBatch3.test.ts` covers contiguous Grow, non-contiguous Similar, and undo for both.
  - Dependencies: `HIST-03`
  - Implementation notes: `growSelection(tolerance=32)` flood-fills outward from every selected pixel using the same RGBA tolerance as Magic Wand. `similarSelection(tolerance=32)` matches every canvas pixel against the seed set. Menu items wired under `Select > Grow` / `Select > Similar`.

- [x] `SEL-04` Defringe and matte removal
  - Priority: `P1`
  - Source notes: `pages/` notes `0218-0220`
  - Function description: Add commands to clean halos/fringes around selected cutout pixels without AI.
  - Acceptance criteria:
    - Defringe replaces edge colors using nearby interior colors.  `Implemented`
    - Remove White Matte and Remove Black Matte adjust selected edge pixels.  `Implemented`
    - Operations are selection-aware and undoable.  `Implemented (undoable via PixelHistoryAction; full-layer scope today)`
  - Required tests:
    - `src/test/selectionBatch3.test.ts`: Defringe rewrites halo RGB toward interior; Remove White/Black Matte recover the foreground; all are undoable.
  - Dependencies: `HIST-03`
  - Implementation notes: `defringeLayer(width)`, `removeWhiteMatte()`, `removeBlackMatte()` on `layersSlice`. Defringe searches outward for the nearest opaque neighbor and blends the semi-transparent pixel's RGB toward it (alpha preserved). Matte removal solves the premultiplied composition `C = F*a + M*(1-a)` for the foreground F using M = white/black. Menu items live under `Layer > Matting`; Defringe opens a dialog with a 1-10 px width slider.

- [>] `SEL-05` Selection edge visibility toggle
  - Priority: `P1`
  - Source notes: `pages/` note `0208`
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
  - Source notes: `pages/` note `0221`; existing `selectionSlice`
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

- [x] `RET-01` Magic Eraser
  - Priority: `P0`
  - Source notes: `pages/` note `0276`
  - Function description: Click a color and erase matching pixels to transparency using Magic Wand-like tolerance, contiguous, anti-alias, and sample-all options.
  - Acceptance criteria:
    - Tool appears in Eraser group.  `Implemented (Shift+E cycles eraser ↔ magic-eraser)`
    - Tolerance/contiguous/sample all layers options work.  `Implemented`
  - Implementation notes: `src/tools/magicEraser.ts`. Reuses Paint Bucket's flood-fill semantics for tolerance + contiguous + selection-clipping, then draws the resulting alpha mask with `destination-out` to erase. Honors `sampleAllLayers` for matching; the erase always writes to the active layer. Stroke-bbox-tight history via the existing `createPixelHistoryAction` + `cropImageData` helpers. Options panel in `OptionsBar.tsx`; toolbar icon `ToolbarMagicEraserIcon`. Covered by `src/test/magicEraser.test.ts` (10 tests: tolerance 0/50, contiguous on/off, AA edges, selection clipping, opacity 0.5, sampleAllLayers writing only to active layer, undo/redo).
    - Operation respects active selection.
    - Operation is undoable.
  - Required tests:
    - `src/test/retouch.test.ts`: click matching region and assert alpha becomes 0.
    - Undo/redo magic erase.
  - Dependencies: `HIST-03`
  - Implementation notes:

- [x] `RET-02` Background Eraser
  - Priority: `P0`
  - Source notes: `pages/` note `0275`
  - Function description: Brush away sampled background colors while preserving non-matching foreground pixels.
  - Acceptance criteria:
    - Tool appears in Eraser group.
    - Supports tolerance and sampling mode.
    - Erases to transparency.
    - Operation is undoable.
  - Required tests:
    - `src/test/backgroundEraser.test.ts`: continuous/once/background-swatch sampling, contiguous vs discontiguous limits, opacity, selection clipping, undo/redo.
  - Dependencies: `HIST-03`
  - Implementation notes: Stamped brush footprint × tolerance match × (optional flood) × selection mask drawn with `destination-out`. Sampling modes Continuous / Once / Background Swatch and Limits Contiguous / Discontiguous / Find Edges per Photoshop note 0275. Protect Foreground Color is out of scope.

- [x] `RET-03` Spot Healing Brush
  - Priority: `P0`
  - Source notes: `pages/` note `0267`
  - Function description: Brush over a small imperfection and replace it with locally sampled/blended surrounding pixels.
  - Acceptance criteria:
    - Tool appears in retouch/healing group.
    - Brush size controls apply.
    - Small spot is blended from local neighborhood.
    - Operation is undoable.
  - Required tests:
    - `src/test/spotHealing.test.ts`: blemish-on-white heals to white, green spot on blue heals to blue, sampleAllLayers, active selection clips, undo/redo.
  - Dependencies: `HIST-03`
  - Implementation notes: Proximity-Match only; Content-Aware and Create Texture are disabled in the option bar. Algorithm samples a ring just outside the brush radius with Gaussian-by-angular-bucket weighting and writes the weighted average into the footprint with brush hardness falloff. Deterministic — same input always yields same output.

- [x] `RET-04` Healing Brush
  - Priority: `P1`
  - Source notes: `pages/` note `0268`
  - Function description: Sample source texture and blend it into target tone/color while painting.
  - Acceptance criteria:
    - Alt/Option-click sets source.
    - Painting uses sampled texture with target tone blending.
    - Aligned mode is supported if feasible.
    - Operation is undoable.
  - Required tests:
    - `src/test/healingBrush.test.ts`: Alt-click sets source; mean-shift heals destination tone; aligned off resets offset; selection clipping; undo/redo.
  - Dependencies: `RET-03`, `HIST-03`
  - Implementation notes: `src/tools/healingBrush.ts`. Mean-shift heal: source pixel + (destFootprintMean − sourceFootprintMean) preserves source texture while matching destination tone. Options: `aligned` (default true), `mode` (BlendModeId, default 'normal'), `sampleAllLayers` (default false). Toolbar Healing group `J`; option-bar HealingBrushOptionsPanel.

- [x] `RET-05` Patch Tool
  - Priority: `P1`
  - Source notes: `pages/` note `0269`
  - Function description: Repair a selected area by dragging it to a source/destination region and blending pixels.
  - Acceptance criteria:
    - Uses existing selection as patch area.
    - Source and destination modes are available if practical.
    - Operation is undoable.
  - Required tests:
    - `src/test/patchTool.test.ts`: source mode heals drop position; destination mode stamps drop pixels onto original; no-op without selection; undo/redo.
  - Dependencies: `SEL-02`, `HIST-03`
  - Implementation notes: `src/tools/patch.ts`. Source mode: drop position is healed using original-position pixels with mean-shift toward the ring around the drop region. Destination mode: drop-position pixels are stamped onto the original-position pixels (direct copy). Translucent ghost preview during drag.

- [x] `RET-06` Red Eye Tool
  - Priority: `P2`
  - Source notes: `pages/` note `0270`
  - Function description: Darken/desaturate red pupil pixels in a clicked region.
  - Acceptance criteria:
    - Pupil size and darken amount options.
    - Red pixels near click are corrected.
    - Operation is undoable.
  - Required tests:
    - `src/test/redEye.test.ts`: red cluster desaturated; pupilSize radius respected; non-red pixels untouched; selection clipping; undo/redo.
  - Dependencies: `HIST-03`
  - Implementation notes: `src/tools/redEye.ts`. Red-eye criterion: `r > g+30 && r > b+30 && r > 100`. Replaces matching pixels in a soft-edged disc with luminance × (1 − darkenAmount/100), grey-shifted (saturation 0). Options: `pupilSize` (0-100%) and `darkenAmount` (0-100).

## P1 - Layer Styles And Effects

- [x] `STYLE-01` Layer effects model and renderer
  - Priority: `P1`
  - Source notes: `pages/` notes `0102-0115`
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
  - Source notes: `pages/` notes `0103`, `0105`, `0111`
  - Function description: Add shadow effects with blend mode, color, opacity, angle, distance, spread, and size.
  - Acceptance criteria:
    - Drop Shadow renders outside visible layer pixels.  `Implemented`
    - Inner Shadow renders inside layer alpha.  `Implemented`
    - Global light angle can be shared by shadow effects.  `Pending`
    - Parameters are editable and undoable.  `Implemented`
  - Required tests:
    - `src/test/effects.test.ts`: drop-shadow extends layer alpha at offset.
    - `src/test/effectsBatch2.test.ts`: inner-shadow darkens pixels near the layer's inner edge; choke produces sharp edge; toggle off restores original; params undo/redo and save round-trip.
  - Dependencies: `STYLE-01`
  - Implementation notes: Drop Shadow renderer in `src/effects/dropShadow.ts`. Inner Shadow renderer in `src/effects/innerShadow.ts` (angle, distance, choke, size, color, opacity, blend mode default `multiply`). Global light angle remains pending — each effect carries its own angle.

- [x] `STYLE-03` Stroke layer effect
  - Priority: `P1`
  - Source notes: `pages/` notes `0103`, `0105`
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
  - Source notes: `pages/` notes `0105`, `0110`
  - Function description: Add Outer Glow, Inner Glow, Color Overlay, and Gradient Overlay.
  - Acceptance criteria:
    - Color Overlay renders non-destructively.  `Implemented`
    - Gradient Overlay renders non-destructively.  `Pending`
    - Outer Glow renders non-destructively.  `Implemented`
    - Inner Glow renders non-destructively.  `Pending`
    - Parameters are editable.  `Implemented for Color Overlay and Outer Glow`
    - Effects can be copied/pasted/cleared.  `Pending (clearing exists via remove button; copy/paste between layers not yet implemented)`
  - Required tests:
    - `src/test/effects.test.ts`: color overlay tints a layer with the chosen color.
    - `src/test/effectsBatch2.test.ts`: outer-glow tints pixels just outside the alpha; spread extends the glow reach; toggle off removes contribution; params save round-trip.
  - Dependencies: `STYLE-01`, `STYLE-03`
  - Implementation notes: `src/effects/colorOverlay.ts` ships color, opacity, blend mode. `src/effects/outerGlow.ts` ships spread, size, color, opacity, blend mode default `screen` (dilate alpha by spread, blur by size, punch out original alpha, tint, render as underlay). Inner Glow + gradient overlay queued for the next style pass.

## P1 - Shapes, Paths, And Text

- [x] `SHAPE-01` Real shape layer behavior
  - Priority: `P1`
  - Source notes: `pages/` notes `0335-0345`
  - Function description: Store shape geometry and style so shape layers remain editable instead of being only raster paint.
  - Acceptance criteria:
    - New shapes create shape layer data or editable shape content.  `Implemented in Shape mode (rect, rounded-rect, ellipse, polygon/star, line/arrow) — see src/tools/shapes.ts and src/tools/shapeRender.ts`
    - Fill/stroke changes rerender shape.  `Implemented via rerenderShapeLayer(layer)`
    - Shape/path/pixels modes are either fully implemented or simplified honestly in UI.  `Shape and Pixels modes are honest; Path mode still belongs to the Pen tool`
    - Shape changes are undoable.  `Implemented through executeDocumentCommand snapshot path; shapeData is preserved on the snapshot`
  - Required tests:
    - `src/test/shapeLayer.test.ts`: 14 simulator-driven cases covering each shape kind, Shift/Alt modifiers, shapeData edits, undo/redo, and manifest round-trip.
  - Dependencies: `HIST-03`, `PROPS-01`
  - Implementation notes: Batch 1 (model + renderer + tool + persistence) is complete. PROPS-05 (Properties shape editor) is the next slice and is intentionally owned by a different agent.

- [x] `SHAPE-02` Star options for Polygon tool
  - Priority: `P1`
  - Source notes: `pages/` note `0340`
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
  - Source notes: `pages/` notes `0344`, `0346`
  - Function description: Add start/end arrowhead options to the Line tool.
  - Acceptance criteria:
    - Start and end arrowheads can be toggled.  `Implemented (lineArrowStart, lineArrowEnd)`
    - Arrowhead size scales with line weight.  `Implemented (lineArrowSize controls triangle dimensions; shaft shortens to meet arrowhead base)`
    - Shape remains editable if `SHAPE-01` is complete.  `Pending — raster output today`
  - Required tests:
    - `src/test/shapes.test.ts`: rendered line includes arrowhead pixels.
  - Dependencies: `SHAPE-01`
  - Implementation notes: `src/tools/shapes.ts` draws filled triangle heads at the line endpoints and shortens the shaft to avoid overlap.

- [x] `SHAPE-04` Custom shape presets
  - Priority: `P2`
  - Source notes: `pages/` notes `0339`, `0341`
  - Function description: Make Custom Shape tool usable with a small local preset library.
  - Acceptance criteria:
    - Preset picker offers built-in shapes.
    - Drawing selected preset creates editable shape data.
    - Custom shape feature remains local and simple.
  - Required tests:
    - `src/test/presetsPanels.test.tsx`: Custom Shape tool draws heart preset and produces a `shapeData.kind === 'custom'` layer.
  - Dependencies: `SHAPE-01`
  - Implementation notes: `src/tools/customShapes.ts` ships 8 built-in shapes (heart, 5-point star, 7-point star, arrow-down-circle, lightning-bolt, speech-bubble, gear, checkmark) as SVG path strings inside a 100x100 viewBox. `ShapeCustomData` extends the discriminated union in `src/store/types.ts`; `drawCustomShape` in `shapeRender.ts` scales the Path2D into the drawn bounds. The Custom Shape Options bar exposes a preset thumbnail picker that sets `customShapeId`.

- [x] `TEXT-01` Better font picker and basic text properties
  - Priority: `P1`
  - Source notes: `pages/` notes `0351-0367`
  - Function description: Improve basic text editing without advanced typography.
  - Acceptance criteria:
    - Font family, style, size, color, and alignment controls are reliable.
    - Font picker can search common/system font names if practical. `Implemented`
    - Text changes are undoable.
    - Does not include OpenType/glyph/dynamic text engines.
  - Required tests:
    - `src/test/typeReedit.test.ts`: edit font family/style/size/color and undo.
    - `src/test/fontPicker.test.tsx`: combobox filter, ArrowDown+Enter selection, Escape cancel, missing-font fallback toast.
  - Dependencies: `PROPS-04`, `HIST-03`
  - Implementation notes: `src/components/Panels/FontPicker.tsx` is a searchable combobox replacing the bare `<select>` in `CharacterPanel` and `PropertiesPanel`'s Type section. Sources: hardcoded baseline list deduped with `document.fonts.values()` after `document.fonts.ready`. `src/utils/fontList.ts` exposes `getAvailableFonts` / `refreshAvailableFonts` / `resolveFontFamily`. Missing families fall back to `sans-serif` during `rerenderTypeLayer`; the first fallback per layer fires an info toast via `bindTypeToastBridge`. Dialog cards now expose `role="dialog"`, `aria-modal`, focus-trap, and Esc-close through `src/hooks/useDialogA11y.ts`. Toolbar buttons gained `aria-label` + `data-testid`. `StrokeControls` was hoisted out of `ShapeSection` to clear the 3 `react-hooks/static-components` errors.

- [ ] `TEXT-02` Fill text with image
  - Priority: `P2`
  - Source notes: `pages/` note `0373`
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
  - Source notes: `pages/` notes `0434-0440`
  - Function description: Let users drag horizontal/vertical guides from rulers onto the canvas.
  - Acceptance criteria:
    - Guides render over the canvas.  `Implemented`
    - Guides can be added, moved, and removed.  `Implemented (addGuide / moveGuide / removeGuide in viewSlice)`
    - Guides can be hidden/shown via View menu.  `Partial — rulers/grid toggles exist; guide-specific show/hide pending`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-08: add / move / remove / clear guides.
  - Dependencies: `HIST-03`
  - Implementation notes: `viewSlice.guides` array + add/remove/move/clear actions; Viewport renders guides as colored lines. Dragging from rulers wires through the same store actions.

- [x] `GUIDE-02` New Guide dialog and clear guides
  - Priority: `P1`
  - Source notes: `pages/` notes `0439`, `0442`
  - Function description: Add menu/dialog commands for precise guide creation and clearing.
  - Acceptance criteria:
    - Clear Guides removes all guides.  `Implemented (clearGuidesWithHistory)`
    - New Guide accepts orientation and position.  `Implemented (NewGuideDialog: Horizontal/Vertical radio + numeric position, Enter/Esc/outside-click)`
    - Operations are undoable.  `Implemented (addGuideWithHistory / moveGuideWithHistory / removeGuideWithHistory / clearGuidesWithHistory + drag-coalescing beginGuideDrag/updateGuideDrag/commitGuideDrag)`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-08: clear/remove round-trip.
    - `src/test/guidesHistory.test.tsx`: dialog + undo/redo + lock + show toggle (13 cases).
  - Dependencies: `GUIDE-01`
  - Implementation notes: New Guide dialog at `src/components/Dialogs/NewGuideDialog.tsx`; opened via `setNewGuideDialogOpen`. View menu adds `Show > Guides` (no history) and `Guides > Lock Guides` toggles. Drag-coalescing API ready for ruler-drag wiring.

- [x] `GUIDE-03` Smart-guide-like alignment hints
  - Priority: `P2`
  - Source notes: `pages/` note `0444`
  - Function description: Show temporary alignment hints when moving layers near canvas/layer centers and edges.
  - Acceptance criteria:
    - Hints appear during move/transform.
    - Snap can use hints when enabled.
    - Hints do not mutate document state.
  - Required tests:
    - `src/test/snap.test.ts`: snapPoint math, buildSnapCandidates enumeration, move-tool snap-to-guide, activeSnapTargets lifecycle, Viewport smart-guide overlay.
  - Dependencies: `LAYERS-02`, `GUIDE-01`
  - Implementation notes: Added `src/tools/snap.ts` (`snapPoint`/`buildSnapCandidates`); wired snap into Move (`src/tools/move.ts`), Selection move (`src/tools/selectionMove.ts`), Shape tools (`src/tools/shapes.ts`), and Free Transform handles (`src/components/Canvas/FreeTransformOverlay.tsx`). Transient `viewSlice.activeSnapTargets` drives dashed magenta cues in `src/components/Canvas/Viewport.tsx`. Snap candidates cover document bounds/midpoints, grid (when `showGrid && snapEnabled`), guides (when `showGuides && snapEnabled`), and visible non-active layer edges/centers. Snap is gated on `snapEnabled`.

- [x] `SET-01` Settings dialog shell
  - Priority: `P1`
  - Source notes: `photoweb-development-plan.md`; `pages/` notes `0049-0054`
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
  - Source notes: `pages/` note `0053`; `pages/` note `0544`
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
  - Source notes: `pages/` notes `0323-0333`
  - Function description: Let users save and choose named brush presets without advanced brush dynamics.
  - Acceptance criteria:
    - Presets capture size, hardness, opacity, flow, smoothing, spacing.  `Implemented (BrushPreset shape stores brushSettings + optional smoothing/spacing)`
    - User can create, apply, and delete presets.  `Implemented (saveBrushPreset / applyBrushPreset / removeBrushPreset)`
    - Presets persist locally.  `Implemented (localStorage key photoweb:brushPresets:v1)`
    - Rename/reorder UI.  `Implemented (BrushPresetsPanel with rename, duplicate, delete, drag-reorder, New Preset)`
  - Required tests:
    - `src/test/bugFixesBatch2.test.ts` GAP-04: save / apply / remove round-trip.
    - `src/test/presetsPanels.test.tsx`: BrushPresetsPanel rename + drag-reorder + duplicate.
  - Dependencies: `SET-01`
  - Implementation notes: `BrushPreset` type in `src/store/types.ts`; slice actions in `src/store/toolsSlice.ts` with localStorage persistence (`saveBrushPreset`, `applyBrushPreset`, `removeBrushPreset`, `renameBrushPreset`, `reorderBrushPreset`, `duplicateBrushPreset`). `Edit > Define Brush Preset…` saves the current `brushSettings`. BrushPresetsPanel renders thumbnails (via `getBrushTip`) and exposes the full preset lifecycle. A companion generic `ToolPreset` system covers other tools (saveToolPreset / applyToolPreset / removeToolPreset) and is GAP-11.

- [x] `PRESET-02` Pattern preset model
  - Priority: `P1`
  - Source notes: `pages/` note `0271`; `pages/` notes `0320-0322`
  - Function description: Define image/selection content as reusable pattern presets.
  - Acceptance criteria:
    - Define Pattern from selection or full active layer.
    - Pattern preset stores tile canvas/image data.
    - Presets can be renamed/deleted.
  - Required tests:
    - `src/test/patternPresets.test.ts`: define pattern from canvas and assert tile data is captured and cached.
    - `src/test/presetsPanels.test.tsx`: PatternPresetsPanel renders tile thumbnails, click sets active id, rename updates name.
  - Dependencies: `HIST-03`
  - Implementation notes: `PatternPreset` shape in `src/store/types.ts`; `definePattern` / `removePatternPreset` / `renamePatternPreset` / `setActivePatternId` in `src/store/toolsSlice.ts`; localStorage persistence keyed `photoweb:patternPresets:v1`. `Edit > Define Pattern…` captures selection bounds or full active layer. PatternPresetsPanel exposes tile thumbnails, rename, delete, and Define Pattern footer button. In-memory tile cache via `getPatternTile` / `decodePatternPreset`.

- [x] `PRESET-03` Pattern fill support
  - Priority: `P1`
  - Source notes: `pages/` notes `0316`, `0320`
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

- [x] `STAB-01` Browser storage diagnostics
  - Priority: `P1`
  - Source notes: `pages/` notes `0532-0541`
  - Function description: Provide clear diagnostics when save/load/autosave fails because of storage quota, browser support, or serialization errors.
  - Acceptance criteria:
    - Storage quota estimate is used when available.  `Implemented (StorageUsageDialog uses navigator.storage.estimate)`
    - Save/load failures show actionable messages.  `Implemented (persistence.ts routes failures through toastsSlice.reportError with channel-specific messages)`
    - Autosave failures do not silently fail.  `Implemented (autoSave.ts surfaces a deduped 'autosave'/'quota' toast and clears the flag once a tick succeeds)`
  - Required tests:
    - `src/test/persistenceErrors.test.ts`: mock storage failure and assert error toast/diagnostic.  `Implemented (quota, JSON parse, missing-file, dedup, export toBlob null/throw)`
  - Dependencies: `None`
  - Implementation notes: `toastsSlice` gained `lastErrorChannel`, `reportError(channel, msg, type)` and `clearLastErrorChannel()`. Channels: `'save' | 'load' | 'autosave' | 'export' | 'quota'`, each with a fixed user-facing message template in `src/core/persistence.ts`. `saveDocument`/`loadDocument` now throw on every failure they used to swallow and emit a deduped error toast on the way out; `autosave` reuses `saveDocument` with `channel: 'autosave'` and `performAutosaveOnce` swallows the throw so the timer keeps running. `ExportDialog.doExport` reports an export toast when `toBlob` returns `null` or throws.

- [x] `STAB-02` Autosave reliability tests
  - Priority: `P1`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Make autosave recover reliably after reload/failure scenarios.
  - Acceptance criteria:
    - Autosave writes current document. `Implemented (OPFS primary, localStorage fallback inside saveDocument)`
    - Recovery banner appears when autosave exists. `Implemented (App.tsx banner gated on hasAutosave)`
    - Recover restores layers and active document. `Implemented (Recover Document button calls loadFile('autosave'))`
    - Dismiss clears recovery state. `Implemented (Discard Recovery button calls dismissAutosave)`
  - Required tests:
    - `src/test/stab2.test.ts`: autosave/recover/dismiss/corrupt-slot/dirty-flag flow. `Implemented`
  - Dependencies: `STAB-01`
  - Implementation notes: `autoSave.runAutosaveTick` retries once on failure (50ms delay) then clears the autosave slot via `clearAutosaveSlot()` so a corrupt blob doesn't loop-fail. `initAutoSaveCheck` validates the slot is parseable before exposing the banner; corrupt slots are cleared with an info toast. `saveDocument` now falls through to localStorage if the OPFS write throws (not just when no handle is returned). `documentSlice.isDirty` + `lastSavedHistoryTick` are flipped by `historyStateUpdate` whenever the timeline advances; `saveFile`, `newDocument`, `openImageAsDocument`, and `loadFile` reset them. App.tsx and MenuBar prompt `window.confirm` before discarding dirty state on New/Open. StatusBar shows `● Unsaved changes` when `isDirty`.

- [x] `STAB-03` Canvas memory guardrails
  - Priority: `P2`
  - Source notes: `photoweb-development-plan.md`
  - Function description: Prevent common browser crashes by warning before creating/opening oversized documents.
  - Acceptance criteria:
    - New/open/import checks approximate pixel memory. `Implemented (MAX_DOC_PIXELS = 60 MP hard limit, SOFT_DOC_PIXELS = 36 MP confirm gate)`
    - User gets warning or graceful failure for oversized images. `Implemented (toast on hard fail, window.confirm on soft warn)`
    - No half-created corrupt document on failure. `Implemented (resize ops snapshot+rollback on alloc throw; newDocument returns false on guard fail before mutating state)`
  - Required tests:
    - `src/test/stab3.test.ts`: oversize new/open/resize fails gracefully + soft-threshold confirm gate. `Implemented`
  - Dependencies: `STAB-01`
  - Implementation notes: `documentSlice` exposes `MAX_DOC_PIXELS` (60 M) and `SOFT_DOC_PIXELS` (~36 M = 60% of max). `guardDocumentSize` is invoked by `newDocument`, `openImageAsDocument`, `resizeImage`, and `resizeCanvas`. `newDocument` / `openImageAsDocument` now return `boolean` so callers can skip viewportFit when refused. Resize ops snapshot every layer canvas before the executeDocumentCommand and roll back on alloc throw, with a `'save'`-channel error toast.

## Batch A - Quick Wins (dialog/panel polish)

- [x] `BATCH-A-01` Remove dead `Dialogs/TestDialog.tsx`
  - Priority: `P3`
  - Function description: Delete the unused TestDialog placeholder; no importers reference it.
  - Acceptance criteria: file removed; TS still clean; test asserts file no longer exists.
  - Required tests: `src/test/batchAQuickWins.test.tsx` — TestDialog removal.

## Batch D - Document/Image dialogs

- [x] `BATCH-D-01` ImageSize resample methods (Automatic + Bicubic Smoother/Sharper + full list)
  - Priority: `P1`
  - Function description: Match Photoshop's Image Size resample dropdown. Add a Resample on/off checkbox and the full method list (Automatic, Bicubic Smoother for enlargement, Bicubic Sharper for reduction, Bicubic, Bilinear, Nearest Neighbor). Automatic picks Smoother when the new pixel total is >= the source, otherwise Sharper. Each method is implemented as a pure ImageData function so output is deterministic.
  - Acceptance criteria:
    - Dropdown lists all six methods with Photoshop-verbatim labels.  `Implemented`
    - Resample checkbox toggles the method dropdown and locks pixel count when off.  `Implemented`
    - Automatic resolves to Bicubic Smoother on up-scale and Bicubic Sharper on down-scale.  `Implemented`
    - Each method is a pure ImageData → ImageData function.  `Implemented (resampleImageData)`
  - Required tests:
    - `src/test/batchDDocumentDialogs.test.tsx` — Automatic resolves correctly; each method resamples 100x100 → 200x200; Resample off locks dimensions; dropdown lists six options.
  - Implementation notes: `src/core/imageTransforms.ts` exports `ResampleMethod`, `RESAMPLE_METHOD_LABELS`, `resolveAutomaticResample`, `resampleImageData` (Mitchell–Netravali cubic kernel with a `bias` knob: 0 = Bicubic, +0.35 = Smoother, −0.35 = Sharper). `resampleCanvas` delegates to `resampleImageData` for determinism. `ImageSizeDialog` exposes Resample checkbox + Method dropdown.

- [x] `BATCH-D-02` CanvasSize Relative + Current/New Size header
  - Priority: `P1`
  - Function description: Match Photoshop's Canvas Size dialog header (Current Size / New Size readouts) and add a Relative checkbox so the Width/Height inputs become deltas rather than absolutes.
  - Acceptance criteria:
    - Header shows Current Size with pixel total in megabytes and dimensions, plus a live New Size readout that updates as inputs change.  `Implemented`
    - Relative checkbox toggles between absolute mode and delta mode; switching to Relative zeroes the deltas, switching back populates with the computed absolute size.  `Implemented`
    - With Relative=true and Width=+50, the final canvas grows by 50 px from current.  `Implemented`
  - Required tests:
    - `src/test/batchDDocumentDialogs.test.tsx` — header rendering, live New Size update, Relative +50 delta, Relative negative delta shrink.
  - Implementation notes: `src/components/Dialogs/CanvasSizeDialog.tsx`. Negative deltas clamp to ≥ 1 px; the New Size readout uses an RGBA-byte estimate (`w*h*4`) for the megabyte string.

- [ ] `BATCH-D-03` Shared math expression + unit helpers (NewDocument / CanvasSize / ImageSize / NewGuide)
- [ ] `BATCH-D-04` ExportDialog real-size estimate + Filename field
- [ ] `BATCH-D-05` ShortcutsDialog single registry + missing Image/Edit/Layer/Select keys

## Batch F - Panels and Layer Styles

- [x] `BATCH-F-01` Mask Properties buttons wiring
  - Priority: `P1`
  - Function description: Wire Mask Edge…, Color Range…, Invert, Apply, Disable, Delete buttons in the PropertiesPanel MaskSection so the existing dialogs and store actions are reachable without going through context menus.
  - Acceptance criteria: clicking Mask Edge… opens RefineEdgeDialog and selects the mask edit target; Color Range… opens ColorRangeDialog; Invert inverts mask pixels; Apply merges mask into the layer; Disable toggles `mask.enabled`; Delete removes the mask.
  - Required tests: `src/test/maskPropertiesButtons.test.tsx`.
  - Implementation notes: All store actions (`invertLayerMask`, `applyLayerMask`, `removeLayerMask`, `setLayerMaskEnabled`, `openRefineEdgeDialog`, `openColorRangeDialog`) already existed; this slice is pure wiring through the PropertiesPanel MaskSection.

- [x] `BATCH-F-02` Universal panel flyout component
  - Priority: `P1`
  - Function description: Add a reusable `PanelFlyout` triple-bar component (`src/components/Panels/PanelFlyout.tsx`) that each panel can render in its header. Items support disabled, separator, checkmark, and sub-menu. LayersPanel gets the first wiring: New Layer, Duplicate Layer, Delete Layer, New Group, Ungroup, Merge Down, Merge Visible, Stamp Visible, Flatten Image.
  - Acceptance criteria: clicking the trigger opens the menu; clicking an item runs its `onClick` and closes the menu; disabled items render but do not run; LayersPanel exposes the canonical Photoshop entries; "New Group" via the flyout dispatches the group action.
  - Required tests: `src/test/panelFlyoutBatchF.test.tsx`.
  - Implementation notes: Single shared component intended to be reused across all panels. LayersPanel is the first consumer; remaining panels can adopt incrementally without API changes.

## Batch E - Adjustment / Filter UX

- [x] `BATCH-E-01` Edit > Fade dialog
  - Priority: `P1`
  - Function description: After any destructive filter or adjustment, the history slice remembers the before/after `ImageData` of the affected layer rect. `Edit > Fade <Last>` (⌘⇧F) opens a modal with Opacity 0..100 + Blend Mode dropdown (mirrors `src/core/blendModes.ts`). Confirming blends the cached `after` onto the cached `before` per the chosen mode + opacity and writes the result through history.
  - Acceptance criteria: lastEffect is captured on AdjustmentDialog and FilterDialog confirm; menu item is disabled when no effect has been applied; opacity 0 returns before pixels; opacity 1 + mode=normal returns after; mode=multiply produces (s*d)/255 per channel; Cmd+Shift+F shortcut opens the dialog.
  - Required tests: `src/test/fadeDialogBatchE.test.ts` — opacity endpoints, multiply formula, alpha preservation, mismatched-dimensions guard.
  - Implementation notes: `src/utils/fadeBlend.ts` exports `fadeImageData(before, after, opacity, mode)` + `BLEND_MODE_OPTIONS`. `src/components/Dialogs/FadeDialog.tsx` is the modal. App.tsx listens for `photoweb:open-fade` and the Cmd+Shift+F shortcut; MenuBar inserts the menu item under Edit. `lastEffect` lives on the history slice via `setLastEffect`.

## Batch C - Color / Gradient / Path Dialogs

- [x] `BATCH-C-01` Fill Path: Mode + Preserve Transparency
  - Priority: `P1`
  - Function description: Add the blend Mode dropdown and Preserve Transparency checkbox to the Fill Path dialog so it matches Photoshop's Fill Path… chrome. When Preserve Transparency is on, the fill is masked to the layer's existing alpha.
  - Acceptance criteria: Mode dropdown lists every blend mode in `src/core/blendModes.ts`; choosing Multiply produces the correct per-pixel multiplied output on a coloured layer; Preserve Transparency leaves transparent pixels untouched.
  - Required tests: `src/test/fillPathBlendBatchC.test.tsx` — filling a yellow layer through a rect path with Multiply produces (255,0,0) red; Preserve Transparency only paints where alpha > 0.
  - Implementation notes: `fillActivePath` now accepts `mode` and `preserveTransparency`. Native blend modes set `globalCompositeOperation`; custom modes (dissolve/linear-burn/linear-dodge) route through `applyBlendModeToImageData`. With Preserve Transparency on, fills draw through `source-atop` (or alpha-mask the per-pixel blend output).

- [x] `BATCH-C-02` Stroke Path: tool dropdown + Simulate Pressure
  - Priority: `P1`
  - Function description: Replace the flat Canvas2D stroke with a tool-driven path walker. Tool dropdown lists Brush / Pencil / Eraser / Clone Stamp / Dodge / Burn / Sponge; the chosen tool's per-stamp primitive is called along the path at the tool's spacing. Simulate Pressure tapers the stamp size 0→1→0 along the path length.
  - Acceptance criteria: choosing Eraser removes pixels along the path; choosing Brush paints the chosen color along the path; Simulate Pressure narrows the stroke at the endpoints; legacy callers without `toolId` still render the flat Canvas2D stroke.
  - Required tests: `src/test/strokePathToolBatchC.test.tsx`.
  - Implementation notes: `samplePath` flattens cubic Bezier segments into a polyline with cumulative arc-length; the walker calls per-tool stamp primitives at `defaultSpacingFor(toolId) * baseSize`. Dodge/Burn/Sponge use a tone-and-saturation kernel that mirrors `src/tools/dodgeBurnSponge.ts`. Clone Stamp falls back to a brush stamp using the selected color because no live source point is available from the dialog.

- [ ] `BATCH-C-03` Gradient Editor: midpoint diamonds
- [ ] `BATCH-C-04` Gradient Editor: Smoothness applied
- [ ] `BATCH-C-05` Replace native color inputs with openColorPicker

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
