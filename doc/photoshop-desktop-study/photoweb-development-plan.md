# Photoweb Development Plan

Purpose: continue Photoweb as a focused browser-based photo editor, using the Photoshop comparison documents as a feature source while intentionally excluding features that do not fit this project.

Decision source: user Q&A on 2026-05-10.

## Product Scope

Photoweb should be a browser photo-editing app, not a full Photoshop clone.

Core direction:
- Focus on photo editing, compositing, layers, masks, selections, retouching, text, shapes, guides, settings, brush presets, and stable history.
- Prioritize practical browser-native workflows over Adobe ecosystem parity.
- Prefer incremental, testable feature slices over large all-at-once systems.

Exclude for now:
- AI and generative features.
- Cloud collaboration, projects, accounts, and Adobe integrations.
- Print-production features: CMYK, spot colors, separations, printer resolution, print workflows.
- Video, timeline animation, frame animation, and animated export.
- Actions, batch processing, droplets, and automation.
- Help, documentation, release notes, FAQ, product-support pages.
- Multi-document tabs/windows.
- Smart Objects.
- Non-destructive Smart Filters until layer architecture is stronger.
- Content-Aware Fill, Remove Tool, automatic background removal, and other complex AI/content synthesis.
- PSD import/export compatibility.
- Advanced export improvements such as layer export, scaled exports, metadata basics, and professional format settings.
- Advanced brush dynamics.

## Must Have

- Reliable undo/redo/history for all editing operations.
- Strong layer system: groups, multi-select, align/distribute, masks, properties editing.
- Strong selection system: Color Range, better Select and Mask/refine edge, cleanup, defringe, expand/contract/smooth dialogs.
- Core retouch tools: Spot Healing, Healing Brush, Patch, Red Eye, Background Eraser, Magic Eraser.
- Layer styles/effects: shadow, stroke, glow, bevel, visibility/editing controls.
- Shape improvements: better vector-like shapes, arrows, star options, custom shape workflow where practical.
- Text improvements: better basic text workflow, but not advanced OpenType/glyph/international/dynamic text systems.
- Guides and snapping: draggable guides, grid/ruler preferences, smart-guide-like alignment aids.
- Settings dialog: app behavior, UI scale, grid, shortcuts, export defaults where relevant.
- Keyboard shortcut viewer and customization.
- Brush presets.
- Pattern fills and pattern presets.
- Performance/stability work: autosave reliability, browser storage diagnostics, meaningful error reporting.

## Nice To Have

- Lightweight command palette if it helps keyboard workflow.
- Basic local preset import/export for brushes, patterns, and layer styles.
- Better filter preview UX.
- Simple before/after comparison for adjustments and filters.
- Optional local project/session browser if it stays offline and simple.

## Milestones

### Milestone 0 - Foundation: History, Commands, And Reliability

Goal: make every future editing feature safely undoable and testable.

Current state:
- Photoweb already has `undo`, `redo`, `HistoryPanel`, snapshots, keyboard shortcuts, and a global history stack.
- The current model should be upgraded before large feature expansion because many future features will touch layers, pixels, masks, selections, and properties.

Build:
- Replace the split undo/redo stack UI model with a full timeline plus active cursor, so the History panel can show past and redoable future states clearly.
- Add an initial document state entry, so users can revert to document start.
- Ensure every command records a history action: pixel edits, selections, masks, layer add/remove/reorder, layer groups, property changes, transforms, text edits, shape edits, adjustment/fill edits, guide edits, and settings changes where appropriate.
- Add compound history actions for multi-step operations, such as “Create layer group”, “Apply layer style”, or “Paste into mask”.
- Add snapshot behavior that actually restores document/layer state, not only labels it.
- Add tests for undo/redo of each major operation family.
- Add storage/quota error diagnostics and clearer save/autosave failure messages.

Deliverables:
- Robust History panel.
- Command/history infrastructure.
- Undo/redo test coverage.
- Autosave and storage reliability improvements.

### Milestone 1 - Layer System Upgrade

Goal: make Photoweb comfortable for real layered editing.

Build:
- Layer groups with create, rename, reorder, collapse/expand, group visibility, group opacity, and delete.
- Multi-layer selection in the Layers panel.
- Align and distribute selected layers.
- Layer duplicate improvements.
- Layer color labels and lock behavior polish.
- Better mask thumbnail UI and clear mask state indicators.
- Group-aware compositing.
- Layer context menu cleanup.

Dependencies:
- Milestone 0 history model.

Deliverables:
- Layer groups.
- Multi-select layers.
- Align/distribute.
- Stronger Layers panel UX.

### Milestone 2 - Properties Panel

Goal: make existing layer types editable after creation.

Build:
- Properties panel for raster, type, shape, fill, adjustment, and group layers.
- Edit existing adjustment layer parameters.
- Edit existing fill layer parameters.
- Edit type layer font, size, color, alignment, and paragraph basics.
- Edit shape fill, stroke, stroke width, corner radius, polygon sides, line weight.
- Edit mask density/feather-like basic controls if feasible without overcomplicating the mask engine.

Deliverables:
- Real Properties panel connected to active layer type.
- Existing adjustment/fill/type/shape layers become editable.

### Milestone 3 - Selection And Mask Refinement

Goal: make selections good enough for precise photo editing without AI.

Build:
- Color Range dialog with eyedropper sampling, add/subtract samples, fuzziness, preview, and selection output.
- Select and Mask improvements: smooth, feather, contrast, shift edge, output to selection/layer mask.
- Expand, contract, smooth, border, and feather dialogs.
- Defringe, remove white matte, remove black matte.
- Better selection edge visibility toggle.
- Better intersection behavior and tests.
- Save/load selection UI using the existing saved selection state.
- Mask from selection correctness improvements.

Excluded:
- Select Subject, Select People, Object Selection AI, Refine Hair AI, automatic object masks.

Deliverables:
- Strong non-AI selection workflow.
- Better mask creation from selections.

### Milestone 4 - Retouch Tools

Goal: add practical manual/non-AI photo cleanup tools.

Build:
- Spot Healing Brush using local neighborhood sampling.
- Healing Brush with sampled source plus tone/color blending.
- Patch Tool using selection source/destination workflow.
- Red Eye Tool.
- Background Eraser with tolerance, sampling, limits, and protect foreground color if practical.
- Magic Eraser using Magic Wand-like matching plus delete.
- Clone Stamp improvements: source overlay, scale/rotate source if feasible, better sample mode UI.

Excluded:
- Content-Aware Fill.
- Remove Tool.
- Automatic background removal.
- AI distraction removal.

Deliverables:
- Manual retouching toolset suitable for browser photo editing.

### Milestone 5 - Layer Styles And Effects

Goal: support common non-destructive visual styling.

Build:
- Layer style data model and renderer.
- Drop Shadow, Inner Shadow, Outer Glow, Inner Glow.
- Stroke.
- Color Overlay and Gradient Overlay.
- Basic Bevel and Emboss if feasible.
- Layer Effects UI in Properties or a dedicated Layer Style dialog.
- Toggle, copy, paste, clear layer styles.
- Scale effects.
- Preset styles if time allows.

Dependencies:
- Milestone 0 history.
- Milestone 2 Properties panel.

Deliverables:
- Common layer effects usable on raster/type/shape layers.

### Milestone 6 - Shapes, Paths, And Text Basics

Goal: improve design tools while avoiding advanced typography.

Build:
- Better shape layer behavior instead of mostly pixel drawing.
- Shape/path/pixels mode behavior made real or simplified honestly.
- Star options on Polygon tool.
- Arrowheads for Line tool.
- Custom shape presets if practical.
- Better path/shape selection and editing.
- Text quality improvements: reliable edit/move/resize/rotate, paragraph basics, better font picker, font search if browser-supported.
- Fill text with image through clipping/mask-style workflow if feasible.

Excluded:
- OpenType feature panel.
- Glyphs panel.
- Dynamic text.
- Text on path unless it becomes low-cost after path improvements.
- International text engine controls.

Deliverables:
- Better practical shapes and text for image design.

### Milestone 7 - Guides, Snapping, And Workspace Settings

Goal: make layout and precision editing easier.

Build:
- Draggable guides from rulers.
- New Guide dialog.
- Move/delete/clear guides.
- Lock guides.
- Guide and grid preferences.
- Smart-guide-like alignment hints for layer bounds and centers.
- Settings dialog with UI scale, grid/guides, shortcut viewer/customization, and relevant app behavior.
- Shortcut customization stored locally.

Deliverables:
- Precision layout aids.
- First real Preferences/Settings dialog.

### Milestone 8 - Brushes, Patterns, And Presets

Goal: improve creative painting/fill without advanced dynamics.

Build:
- Brush preset list.
- Save current brush as preset.
- Rename/delete/reorder brush presets.
- Basic import/export of Photoweb brush presets.
- Pattern preset model.
- Define pattern from selection/image.
- Pattern fill source for Paint Bucket.
- Pattern fill layer if compatible with fill layer model.

Excluded:
- Advanced brush dynamics, scattering, texture, dual brush, mixer brush.

Deliverables:
- Brush presets.
- Pattern fills and pattern presets.

### Milestone 9 - Performance And Stability

Goal: keep the app reliable as feature complexity grows.

Build:
- Better dirty-rect usage for large documents.
- Canvas memory guardrails.
- Browser storage quota diagnostics.
- Autosave reliability tests.
- Clear recovery flow after save/load/autosave failures.
- Performance profiling for compositor, filters, brush strokes, masks, and history.
- Optional Web Worker offloading for expensive filters if needed.

Deliverables:
- More stable large-image editing.
- Better user-facing diagnostics.

## Exclude For Now

These should not appear in near-term implementation tickets:
- AI generation, Firefly, neural filters, generative fill/expand/upscale, harmonize, reflection removal.
- Cloud documents, collaboration, projects, account sync.
- Print, CMYK, spot colors, ICC workflow, printer resolution.
- Video, animation, timeline, keyframes, video export.
- Actions, batch processing, droplets, scripting.
- Help/release notes/FAQ/product support features.
- Smart Objects and Smart Filters.
- PSD/PSB/PDF/TIFF professional compatibility.
- Export layer files, scaled exports, metadata/content credentials.

## Suggested Execution Order

1. Finish Milestone 0 first. History must be trustworthy before expanding features.
2. Build Milestones 1 and 2 together where possible because layer groups, multi-select, and Properties panel depend on each other.
3. Build Milestone 3 before retouching because healing/eraser tools rely on selections and masks.
4. Build Milestone 4 after selection/mask improvements.
5. Build Milestone 5 after layer/property architecture is stable.
6. Build Milestones 6, 7, and 8 based on user-facing priority.
7. Run Milestone 9 continuously, not only at the end.

## First Implementation Epic

Recommended first epic: `Reliable History And Command System`.

Why:
- It supports every future feature.
- Undo/redo is explicitly required.
- Current history exists but is not yet strong enough to treat as complete.

Initial tickets:
- Create full history timeline with active cursor.
- Show redoable future states in History panel.
- Add initial document baseline state.
- Add command wrapper for document/layer/selection/pixel/property actions.
- Convert high-use operations to command/history actions.
- Add tests for undo/redo: brush stroke, filter, adjustment, layer add/remove, layer reorder, layer property, selection change, transform, mask add/apply/delete.
- Fix snapshot restore behavior.
- Add history max-size setting.
- Add keyboard shortcut customization later in Settings milestone, but keep `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, and `Cmd/Ctrl+Y` reliable now.
