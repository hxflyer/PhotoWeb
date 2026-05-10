# Photoweb vs Photoshop Notes: Function Comparison 0011-0110

Scope: generated Photoshop study notes `0011` through `0110`.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes Adobe product/documentation infrastructure rather than an editor function.

Relevant Photoweb code areas:
- App shell, keyboard shortcuts, dialogs, transforms, file open/import/export: `src/App.tsx`
- Menu system: `src/components/layout/MenuBar.tsx`
- Main workspace layout: `src/components/layout/MainLayout.tsx`
- Toolbar and contextual options: `src/components/Panels/Toolbar.tsx`, `src/components/Panels/OptionsBar.tsx`
- Panel dock: `src/components/Panels/RightPanelDock.tsx`
- Layers and layer operations: `src/components/Panels/LayersPanel.tsx`, `src/store/layersSlice.ts`, `src/core/Layer.ts`
- History: `src/components/Panels/HistoryPanel.tsx`, `src/store/historySlice.ts`
- Documents and image/canvas operations: `src/store/documentSlice.ts`
- Adjustments and fill layers: `src/adjustments/*`, `src/core/fillLayer.ts`
- Filters: `src/filters/*`

## 0011 - Use The Graphics Processor

Source note: `pages/0011-use-the-graphics-processor.md`

Function group: graphics processor preference and acceleration.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Enable or disable GPU acceleration`: `Missing`. Photoweb uses browser rendering and a Canvas 2D compositor, but it has no user-facing GPU preference.
- `Advanced GPU drawing modes`: `Missing`. There is no Basic/Normal/Advanced GPU mode or equivalent rendering pipeline selector.
- `GPU troubleshooting workflow`: `Missing`. Photoweb does not expose GPU diagnostics, reset steps, or feature-disable guidance.

Implementation notes:
- Related rendering code exists in `src/compositor/Canvas2DCompositor.ts`, but it is not a Photoshop-style GPU preference system.

## 0012 - Graphics Processor (GPU) Card Usage

Source note: `pages/0012-graphics-processor-gpu-card-usage.md`

Function group: GPU requirements, compatibility, and feature dependency.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `GPU compatibility detection`: `Missing`. Photoweb does not inspect GPU model, driver, VRAM, or browser graphics capabilities.
- `Feature dependency mapping`: `Missing`. Photoshop lists functions that require GPU support; Photoweb does not gate features by graphics hardware.
- `Performance mode guidance`: `Missing`. There is no performance panel or GPU usage report.

Implementation notes:
- Browser-level GPU behavior may happen under the hood, but Photoweb does not control or document it.

## 0013 - Windows HEIF And HEVC Codecs

Source note: `pages/0013-windows-heif-and-hevc-codecs.md`

Function group: operating-system codec support for image/video formats.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `HEIF image opening`: `Partial`. Photoweb opens images through an HTML file input and browser image decoding. If the browser supports the file, it may load; Photoweb does not install or manage Windows codecs.
- `HEVC video decoding`: `Missing`. Photoweb has no video import or video layer pipeline.
- `Codec installation guidance`: `Missing`. There is no OS-specific codec help flow.

Implementation notes:
- File import is routed through `loadImage` and `openImageAsDocument`, so format support is browser-dependent rather than app-defined.

## 0014 - Photoshop Language Availability

Source note: `pages/0014-photoshop-language-availability.md`

Function group: product localization and language support.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Localized UI languages`: `Missing`. Photoweb strings are hard-coded in English.
- `Language switching`: `Missing`. There is no language selector or i18n system.
- `Regional documentation mapping`: `Missing`. Photoweb has no localized help/documentation layer.

Implementation notes:
- Adding this would require a string catalog and locale-aware rendering across menus, panels, dialogs, and tooltips.

## 0015 - Learn The Basics

Source note: `pages/0015-learn-the-basics.md`

Function group: basic onboarding and learning hub.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Basic workspace introduction`: `Present with differences`. Photoweb has a Photoshop-like workspace with menu bar, toolbar, canvas, options bar, panels, and status bar, but it does not explain them in-app.
- `Beginner task walkthroughs`: `Missing`. There are no guided tutorials for opening files, using layers, selecting, painting, or exporting.
- `Learning resources navigation`: `Missing`. The Help menu does not route to a learning hub.

Implementation notes:
- This is mostly documentation/UI onboarding work rather than core editor functionality.

## 0016 - Adobe Photoshop On Desktop FAQ

Source note: `pages/0016-adobe-photoshop-on-desktop-faq.md`

Function group: product FAQ and support reference.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Licensing and installation FAQ`: `Not applicable`. Photoweb is a local web app project, not an Adobe subscription product.
- `Feature availability FAQ`: `Missing`. Photoweb has no in-app FAQ explaining feature support or limitations.
- `Support routing`: `Missing`. There is no support/help center integration.

Implementation notes:
- If needed, this belongs in project documentation or a Help dialog, not the editing engine.

## 0017 - Home Screen Overview

Source note: `pages/0017-home-screen-overview.md`

Function group: home screen, recent files, and entry workflows.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Home screen`: `Missing`. Photoweb launches directly into the editor workspace.
- `Recent documents`: `Missing`. There is no recent-file list or cloud document list.
- `New/open entry points`: `Present with differences`. Photoweb supports New, Open, Save, Save As, Import, and Export through menu actions and hidden file inputs.
- `Autosave recovery prompt`: `Partial`. Photoweb has autosave detection and recovery logic, but not a full Photoshop Home screen.

Implementation notes:
- Relevant file entry behavior is in `src/App.tsx` and document state is in `src/store/documentSlice.ts`.

## 0018 - Workspace Overview

Source note: `pages/0018-workspace-overview.md`

Function group: editor workspace anatomy.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Menu bar`: `Present with differences`. Photoweb has a Photoshop-like menu bar with File, Edit, Image, Layer, Type, Select, Filter, View, Window, and Help menus, but many Photoshop commands are disabled or absent.
- `Tools panel`: `Present with differences`. Photoweb has grouped tools and flyouts similar to Photoshop.
- `Options bar`: `Present with differences`. Photoweb changes options by active tool, but does not cover all Photoshop controls.
- `Panels`: `Present with differences`. Photoweb has Color, Swatches, Adjustments, Character, Paragraph, Layers, Channels, Paths, and History panels in a fixed right dock.
- `Document window`: `Partial`. Photoweb has one canvas viewport, not multi-document tabs/floating windows.

Implementation notes:
- The main shell is implemented by `MainLayout`, `MenuBar`, `Toolbar`, `OptionsBar`, `RightPanelDock`, `Viewport`, and `StatusBar`.

## 0019 - Access The Discover Panel

Source note: `pages/0019-access-the-discover-panel.md`

Function group: searchable help and in-app discovery.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Discover/search panel`: `Missing`. Photoweb has no command/help search panel.
- `Tutorial recommendations`: `Missing`. No contextual learning cards or related-topic suggestions exist.
- `Quick action launcher`: `Missing`. There is no Discover-style one-click workflow launcher.

Implementation notes:
- A command palette could cover part of this need, but there is no current implementation.

## 0020 - Save Custom Workspaces

Source note: `pages/0020-save-custom-workspaces.md`

Function group: workspace layout persistence.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save current panel layout`: `Missing`. Photoweb has a fixed layout and does not persist custom panel positions.
- `Save keyboard shortcuts or menus with workspace`: `Missing`. There is no shortcut/menu customization system.
- `Named workspace presets`: `Missing`. No workspace preset model exists.

Implementation notes:
- The current right panel tab state is local component state, not a saved workspace.

## 0021 - Switch Workspaces

Source note: `pages/0021-switch-workspaces.md`

Function group: workspace preset switching.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Workspace menu presets`: `Missing`. Photoweb does not offer Essentials, Photography, Painting, or custom workspace presets.
- `Switch active layout`: `Missing`. The app layout is static.
- `Remember selected workspace`: `Missing`. No workspace preference is persisted.

Implementation notes:
- The Window menu exists, but its panel/workspace items are placeholders compared with Photoshop.

## 0022 - Delete Workspaces

Source note: `pages/0022-delete-workspaces.md`

Function group: workspace preset deletion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Delete custom workspace`: `Missing`. Photoweb has no custom workspace records.
- `Protect default workspaces`: `Missing`. There are no default workspace definitions to protect.
- `Workspace management dialog`: `Missing`. No dialog exists.

Implementation notes:
- This depends on first adding saved workspace presets.

## 0023 - Restore Workspaces

Source note: `pages/0023-restore-workspaces.md`

Function group: reset workspace layout to default.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reset active workspace`: `Missing`. Photoweb has no command to restore panel positions.
- `Restore deleted default workspaces`: `Missing`. There are no workspace presets.
- `Panel layout recovery`: `Partial`. Reloading the app returns the fixed layout, but this is not a workspace restore feature.

Implementation notes:
- The current fixed layout naturally avoids workspace drift, but it also removes user customization.

## 0024 - Boost Workflows With The Contextual Task Bar

Source note: `pages/0024-boost-workflows-with-the-contextual-task-bar.md`

Function group: contextual command surface.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Contextual Task Bar`: `Partial`. Photoweb has an `OptionsBar` that changes with the active tool, but it is fixed at the top and not a floating smart command bar.
- `Selection/layer-aware action suggestions`: `Missing`. Photoweb does not show adaptive suggested actions such as remove background, select subject, or generative fill.
- `Pin/hide task bar`: `Missing`. The options bar cannot be pinned, hidden, or moved like Photoshop's Contextual Task Bar.

Implementation notes:
- The closest implementation is `src/components/Panels/OptionsBar.tsx`.

## 0025 - Rearrange Document Windows

Source note: `pages/0025-rearrange-document-windows.md`

Function group: document window arrangement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Tabbed documents`: `Missing`. Photoweb supports a single active document workspace.
- `Floating document windows`: `Missing`. The canvas viewport is fixed in the main layout.
- `Arrange all/tile/cascade`: `Missing`. No multi-document arrangement commands exist.

Implementation notes:
- Adding this would require multiple document state instances, document tabs, and a window layout system.

## 0026 - Hide Or Show All Panels

Source note: `pages/0026-hide-or-show-all-panels.md`

Function group: global panel visibility.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Hide/show all panels`: `Missing`. Photoweb does not implement Photoshop's Tab behavior to hide all panels/toolbars.
- `Collapse panel groups`: `Partial`. The right dock has collapsible top and text groups.
- `Preserve editing canvas while panels are hidden`: `Missing`. There is no dedicated distraction-free panel toggle.

Implementation notes:
- Right dock group collapse lives in `RightPanelDock`, but the main layout does not support global panel visibility modes.

## 0027 - Dock Or Undock Panels

Source note: `pages/0027-dock-or-undock-panels.md`

Function group: panel docking.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Undock panels into floating windows`: `Missing`. All panels are fixed in the right dock.
- `Redock floating panels`: `Missing`. No drag/drop docking target exists.
- `Panel drag handles`: `Missing`. Panel tabs switch content but cannot be dragged.

Implementation notes:
- The current panel architecture is simpler and static.

## 0028 - Move Panels

Source note: `pages/0028-move-panels.md`

Function group: panel repositioning.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Drag panels between docks`: `Missing`. Photoweb has no panel movement.
- `Move panel groups`: `Missing`. Top/text/bottom panel groups are fixed.
- `Move panels to floating stacks`: `Missing`. Floating stacks are not implemented.

Implementation notes:
- `RightPanelDock` stores active tabs and collapse state, not layout coordinates.

## 0029 - Add And Remove Panels

Source note: `pages/0029-add-and-remove-panels.md`

Function group: panel visibility management.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Open panels from Window menu`: `Partial`. Photoweb has a Window menu, but panel items are disabled placeholders.
- `Close panels`: `Missing`. Users cannot remove a panel from the dock.
- `Restore closed panels`: `Missing`. There is no panel registry or visibility state.

Implementation notes:
- Panels exist as hard-coded tabs in `RightPanelDock`.

## 0030 - Stack Floating Panels

Source note: `pages/0030-stack-floating-panels.md`

Function group: floating panel stacks.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create floating panel stacks`: `Missing`. Photoweb does not support floating panels.
- `Reorder panels inside a floating stack`: `Missing`.
- `Collapse floating stacks`: `Missing`.

Implementation notes:
- This is outside the current static workspace model.

## 0031 - Expand Or Collapse Panel Icons

Source note: `pages/0031-expand-or-collapse-panel-icons.md`

Function group: icon-mode panel dock.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Collapse panels to icons`: `Missing`. Photoweb does not provide Photoshop's icon-only panel column.
- `Expand icon panels to full panels`: `Missing`.
- `Collapse panel sections`: `Partial`. Top and text groups in the right dock can collapse, but they do not become icon panels.

Implementation notes:
- A true icon dock would require a separate panel presentation mode.

## 0032 - Change Text Size In Panels And Tooltips

Source note: `pages/0032-change-text-size-in-panels-and-tooltips.md`

Function group: UI text size preference.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Panel font size preference`: `Missing`. Photoweb has no UI scaling or text size setting.
- `Tooltip text size preference`: `Missing`. Browser/tooltips use fixed app/browser behavior.
- `Restart/apply preference flow`: `Missing`.

Implementation notes:
- This would belong in a Preferences dialog and CSS variable system.

## 0033 - Use Simple Math In Number Fields

Source note: `pages/0033-use-simple-math-in-number-fields.md`

Function group: numeric field expression parsing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Arithmetic in numeric inputs`: `Missing`. Photoweb numeric fields use normal HTML number inputs and do not parse expressions like `100/2` or `12+8`.
- `Unit-aware calculations`: `Missing`.
- `Apply computed values on commit`: `Missing`.

Implementation notes:
- Supporting this would require replacing or wrapping numeric input handlers across dialogs and options controls.

## 0034 - High-Density Monitor Support And Per-Monitor Scaling

Source note: `pages/0034-high-density-monitor-support-and-per-monitor-scaling.md`

Function group: high-DPI display behavior.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `High-DPI rendering`: `Partial`. Browser canvas/CSS rendering can benefit from device pixel ratio, but Photoweb has no explicit high-DPI settings surface.
- `Per-monitor UI scaling`: `Missing`. There is no app-level per-monitor scaling behavior.
- `UI scale preferences`: `Missing`. No preference controls exist for scaling.

Implementation notes:
- Any high-DPI behavior is mostly inherited from the browser and CSS.

## 0035 - Arrange And Group Panels

Source note: `pages/0035-arrange-and-group-panels.md`

Function group: panel grouping and arrangement.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Grouped panels`: `Present with differences`. Photoweb has fixed tab groups: Color/Swatches/Adjustments, Character/Paragraph, and Layers/Channels/Paths/History.
- `User-arranged panel groups`: `Missing`. Users cannot create or rearrange panel groups.
- `Persistent custom panel layout`: `Missing`.

Implementation notes:
- The grouping is structural code in `RightPanelDock`, not a user-customizable workspace feature.

## 0036 - Set Up Toolbars And Panels

Source note: `pages/0036-set-up-toolbars-and-panels.md`

Function group: workspace setup.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Toolbar availability`: `Present with differences`. Photoweb has a grouped Photoshop-like toolbar.
- `Panel availability`: `Present with differences`. Photoweb has major right-side panels, but not the full Photoshop panel inventory.
- `User setup and saving`: `Missing`. Users cannot save layout setup.

Implementation notes:
- This is implemented as fixed UI composition rather than a configurable workspace.

## 0037 - Customize Toolbar

Source note: `pages/0037-customize-toolbar.md`

Function group: toolbar customization.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Tool groups and flyouts`: `Present with differences`. Photoweb has grouped tools with flyouts and remembers the active tool per group during the session.
- `Customize toolbar contents/order`: `Missing`. Users cannot add, remove, hide, or reorder tools.
- `Extra tools area`: `Missing`. There is no overflow/extra tools bucket.
- `Save custom toolbar`: `Missing`.

Implementation notes:
- Tool definitions are hard-coded in `Toolbar.tsx`.

## 0038 - Tooltips Overview

Source note: `pages/0038-tooltips-overview.md`

Function group: tooltips and rich tooltip help.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Basic tooltips`: `Partial`. Many controls expose browser `title` text or visible labels.
- `Rich tooltips with images/videos`: `Missing`. Photoweb has no rich tooltip component.
- `Tooltip preference`: `Missing`. There is no setting to show/hide rich tooltips.

Implementation notes:
- Tooltips are incidental UI affordances, not a documented help system.

## 0039 - Create Tool Presets

Source note: `pages/0039-create-tool-presets.md`

Function group: saved tool settings.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save current tool settings as preset`: `Missing`. Brush, gradient, magic wand, clone stamp, and other options are not saved as named presets.
- `Load tool presets`: `Missing`.
- `Preset management`: `Missing`. No rename/delete/import/export workflow exists.

Implementation notes:
- Some tool settings are stored in Zustand state or module-level options, but not as user-managed presets.

## 0040 - Use Spring-Loaded Shortcuts

Source note: `pages/0040-use-spring-loaded-shortcuts.md`

Function group: temporary tool switching by holding shortcut keys.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Hold key to temporarily switch tools`: `Missing`. Photoweb shortcut keys switch tools persistently.
- `Release key to return to previous tool`: `Missing`.
- `Shortcut conflict handling with typing`: `Partial`. Photoweb avoids tool shortcuts while typing into inputs or text editing, but does not implement spring-loaded behavior.

Implementation notes:
- Keyboard handling is in `src/App.tsx`.

## 0041 - Use Undo And Redo Commands

Source note: `pages/0041-use-undo-and-redo-commands.md`

Function group: undo and redo.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Undo`: `Present with differences`. Photoweb supports undo via menu and keyboard shortcuts using its history store.
- `Redo`: `Present with differences`. Redo is available through menu and shortcuts.
- `Step backward/forward style history`: `Partial`. History states exist, but the behavior is simpler than Photoshop's full history model.

Implementation notes:
- Relevant code lives in `historySlice`, `HistoryPanel`, and App/MenuBar shortcut handling.

## 0042 - History Panel Settings

Source note: `pages/0042-history-panel-settings.md`

Function group: history panel configuration.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `History panel state list`: `Present with differences`. Photoweb has a History panel with clickable history entries.
- `History state limit/preferences`: `Missing`. No preference controls for number of history states or memory behavior exist.
- `Snapshot/display settings`: `Partial`. Photoweb has snapshot creation, but not full Photoshop panel options.

Implementation notes:
- History UI exists, but the settings layer is mostly absent.

## 0043 - Set History Log Preferences

Source note: `pages/0043-set-history-log-preferences.md`

Function group: history log recording.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Enable History Log`: `Missing`. Photoweb does not write operation logs to metadata or text files.
- `Log item detail levels`: `Missing`.
- `Metadata/text-file targets`: `Missing`.

Implementation notes:
- History state is for undo/redo, not audit logging.

## 0044 - View History Logs

Source note: `pages/0044-view-history-logs.md`

Function group: reading recorded history logs.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `View history metadata`: `Missing`.
- `Open external history log`: `Missing`.
- `Inspect detailed edit log`: `Missing`.

Implementation notes:
- There is no history log source to view.

## 0045 - Use Snapshots In The History Panel

Source note: `pages/0045-use-snapshots-in-the-history-panel.md`

Function group: history snapshots.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Create snapshot`: `Partial`. Photoweb has a New Snapshot action in the History panel.
- `Use snapshot as restore point`: `Partial`. History entries can be selected/reverted, but Photoshop's richer snapshot controls are not mirrored.
- `Name/manage snapshots`: `Missing`. There is no full snapshot management workflow.

Implementation notes:
- Snapshot behavior is tied to the history implementation, not a separate Photoshop-equivalent snapshot model.

## 0046 - Paint With Image States From The History Panel

Source note: `pages/0046-paint-with-image-states-from-the-history-panel.md`

Function group: History Brush source painting.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select history source for painting`: `Missing`.
- `History Brush tool`: `Missing`. Photoweb has brush, clone stamp, eraser, and retouch tools, but no History Brush.
- `Art History Brush behavior`: `Missing`.

Implementation notes:
- This would require storing image-state sources and brush operations that sample previous states.

## 0047 - Manage Image States

Source note: `pages/0047-manage-image-states.md`

Function group: history state management.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Select previous state`: `Present with differences`. Photoweb can click history entries to revert.
- `Delete specific history states`: `Missing`. There is no individual state delete UI.
- `Create document from state`: `Missing`.
- `Clear history`: `Partial`. The store contains history management behavior, but the UI is not as complete as Photoshop.

Implementation notes:
- Current history is useful for undo/redo, but not full state lifecycle management.

## 0048 - Restore Parts Of An Image To A Previous State

Source note: `pages/0048-restore-parts-of-an-image-to-a-previous-state.md`

Function group: selective restoration from history.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `History Brush selective restore`: `Missing`.
- `Choose source state`: `Missing`.
- `Blend previous-state pixels into current image`: `Missing`.

Implementation notes:
- Layer masks can hide/show current layer content, but they do not restore pixels from a previous history state.

## 0049 - Settings And Preferences

Source note: `pages/0049-settings-and-preferences.md`

Function group: application preferences.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Preferences dialog`: `Missing`. Photoweb has no central settings/preferences dialog.
- `Category-based preferences`: `Missing`.
- `Persistent app preferences`: `Partial`. Some state can persist through document/autosave behavior, but there is no user settings system.

Implementation notes:
- Preferences would need a new store slice, persistence, and UI.

## 0050 - Adjust Preferences

Source note: `pages/0050-adjust-preferences.md`

Function group: editing application preferences.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Preferences`: `Missing`.
- `Change preference categories`: `Missing`.
- `Apply/restart preference changes`: `Missing`.

Implementation notes:
- Existing dialogs are task-specific, not preference dialogs.

## 0051 - Backup And Restore Preferences

Source note: `pages/0051-backup-and-restore-preferences.md`

Function group: preference backup and restoration.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Backup preference files`: `Missing`.
- `Restore preference files`: `Missing`.
- `Migrate preferences between versions`: `Missing`.

Implementation notes:
- There are no preference files to back up.

## 0052 - Reset Preferences

Source note: `pages/0052-reset-preferences.md`

Function group: reset app preferences to defaults.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reset preferences on launch`: `Missing`.
- `Reset through Preferences dialog`: `Missing`.
- `Recover from corrupt preferences`: `Missing`.

Implementation notes:
- Reloading the app resets non-persisted UI state, but that is not equivalent to a preferences reset command.

## 0053 - View Keyboard Shortcuts

Source note: `pages/0053-view-keyboard-shortcuts.md`

Function group: keyboard shortcut reference.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Implemented shortcuts`: `Present with differences`. Photoweb implements common shortcuts for undo/redo, transform, view toggles, quick mask, select all, tool switching, brush size, colors, and filters.
- `Shortcut viewer`: `Missing`. There is no dialog listing all shortcuts.
- `Shortcut editor`: `Missing`. Users cannot customize shortcuts.

Implementation notes:
- Shortcuts are handled mainly in `src/App.tsx` and shown selectively in `MenuBar`.

## 0054 - Change Tool Pointers

Source note: `pages/0054-change-tool-pointers.md`

Function group: cursor and tool pointer preferences.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Standard/precise cursor preference`: `Missing`.
- `Brush tip cursor preference`: `Missing`.
- `Crosshair display options`: `Missing`.

Implementation notes:
- Photoweb may use CSS cursors in some tools, but there is no pointer preference system.

## 0055 - Generative AI In Photoshop

Source note: `pages/0055-generative-ai-in-photoshop.md`

Function group: generative AI feature family.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generative Fill`: `Missing`.
- `Generative Expand`: `Missing`.
- `Generate Image`: `Missing`.
- `Reference image guided generation`: `Missing`.
- `Cloud model/credit/account workflow`: `Missing`.

Implementation notes:
- Photoweb currently performs local browser image editing only.

## 0056 - Generative AI Features In Photoshop On Desktop FAQ

Source note: `pages/0056-generative-ai-features-in-photoshop-on-desktop-faq.md`

Function group: generative AI FAQ and policy guidance.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `AI availability FAQ`: `Missing`.
- `Generative credit explanation`: `Not applicable`.
- `Commercial use and content credentials`: `Not applicable`.

Implementation notes:
- No generative AI features exist, so the related FAQ has no app counterpart.

## 0057 - Generative AI Features Overview

Source note: `pages/0057-generative-ai-features-overview.md`

Function group: overview of AI creation/editing features.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Prompt-based image generation`: `Missing`.
- `Prompt-based object insertion/removal`: `Missing`.
- `AI variation generation`: `Missing`.
- `AI model selection`: `Missing`.

Implementation notes:
- Local filters and adjustments are present, but they are not generative AI.

## 0058 - Select An AI Model For Generative Control

Source note: `pages/0058-select-an-ai-model-for-generative-control.md`

Function group: choosing AI generation models.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Model picker`: `Missing`.
- `Partner model selection`: `Missing`.
- `Model-specific variation behavior`: `Missing`.

Implementation notes:
- Photoweb has no AI model registry or remote generation backend.

## 0059 - Get New Variations Of Generated Content

Source note: `pages/0059-get-new-variations-of-generated-content.md`

Function group: AI variation management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generate more variations`: `Missing`.
- `Variation thumbnails/history`: `Missing`.
- `Apply selected variation non-destructively`: `Missing`.

Implementation notes:
- History entries track edits, not generated alternatives.

## 0060 - Use Firefly Boards With Photoshop

Source note: `pages/0060-use-firefly-boards-with-photoshop.md`

Function group: Firefly Boards integration.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open/send content to Firefly Boards`: `Missing`.
- `Board asset management`: `Missing`.
- `Adobe account/service integration`: `Missing`.

Implementation notes:
- Photoweb has no external creative-service integration.

## 0061 - Create, Open, And Import Images

Source note: `pages/0061-create-open-and-import-images.md`

Function group: document creation and image input.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create new document`: `Present with differences`. Photoweb has a New Document dialog and document store creation.
- `Open image as document`: `Present with differences`. Photoweb opens browser-supported images into a document.
- `Import image as layer`: `Present with differences`. Photoweb can import an image into the current document as a new layer.
- `Adobe/cloud/recent workflows`: `Missing`. No cloud documents, templates, or recent list exist.

Implementation notes:
- This is one of the stronger overlaps, implemented through App file inputs, `loadImage`, and document/layer store actions.

## 0062 - Import Files

Source note: `pages/0062-import-files.md`

Function group: importing external files into a document.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Import raster image`: `Present with differences`. Browser-supported image files can be imported as layers.
- `Place embedded/linked files`: `Missing`. Photoweb does not model linked or embedded placed assets as Smart Objects.
- `Import PDF/vector/video`: `Missing`.
- `Drag-and-drop import`: `Missing` unless provided indirectly by browser/file input behavior.

Implementation notes:
- Import is image-only and rasterized.

## 0063 - Browse, Select, And Import Adobe Stock Assets

Source note: `pages/0063-browse-select-and-import-adobe-stock-assets.md`

Function group: Adobe Stock asset browsing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Adobe Stock search/browse`: `Missing`.
- `License/select Stock assets`: `Missing`.
- `Import Stock preview/final asset`: `Missing`.

Implementation notes:
- Photoweb only imports local files.

## 0064 - Create Images

Source note: `pages/0064-create-images.md`

Function group: image creation workflows.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Blank document creation`: `Present with differences`. Photoweb can create a blank document.
- `Template/preset creation`: `Partial`. New document fields exist, but there is no rich template marketplace or preset library.
- `AI image creation`: `Missing`.

Implementation notes:
- Photoweb covers local blank-document creation, not Photoshop's full create workflow ecosystem.

## 0065 - Generate An Image With Descriptive Text Prompts

Source note: `pages/0065-generate-an-image-with-descriptive-text-prompts.md`

Function group: text-to-image generation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Prompt input`: `Missing`.
- `Generate image from prompt`: `Missing`.
- `Generated variation gallery`: `Missing`.
- `Content credentials/AI metadata`: `Missing`.

Implementation notes:
- No prompt-generation UI or model integration exists.

## 0066 - Edit Images With Generative Fill

Source note: `pages/0066-edit-images-with-generative-fill.md`

Function group: AI selection-based fill/editing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generative Fill command`: `Missing`.
- `Prompt-based object addition/removal`: `Missing`.
- `Variation selection`: `Missing`.
- `Non-destructive generated layer result`: `Missing`.

Implementation notes:
- Photoweb has selections, fill tools, and layers, but not AI fill.

## 0067 - Generate Sharper Variations With Enhance Detail

Source note: `pages/0067-generate-sharper-variations-with-enhance-detail.md`

Function group: AI variation enhancement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Enhance Detail for generated variations`: `Missing`.
- `Model-side refinement`: `Missing`.
- `Variation comparison`: `Missing`.

Implementation notes:
- Sharpen filters exist separately, but they are local image filters and not AI variation refinement.

## 0068 - Explore Beyond The Canvas With Generative Expand

Source note: `pages/0068-explore-beyond-the-canvas-with-generative-expand.md`

Function group: AI canvas expansion.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Expand canvas bounds`: `Present with differences`. Photoweb can resize the canvas through a Canvas Size dialog.
- `Generate new content outside original image`: `Missing`. Added canvas area is not AI-filled.
- `Prompt-guided expansion`: `Missing`.

Implementation notes:
- `resizeCanvas` handles geometry, not generative content synthesis.

## 0069 - Use Reference Images For Consistent Results

Source note: `pages/0069-use-reference-images-for-consistent-results.md`

Function group: reference images for AI consistency.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Upload/select reference image for generation`: `Missing`.
- `Style/composition guidance`: `Missing`.
- `Consistent generated results`: `Missing`.

Implementation notes:
- Imported images become ordinary raster layers, not AI conditioning references.

## 0070 - Generate Images Guided By A Reference Image

Source note: `pages/0070-generate-images-guided-by-a-reference-image.md`

Function group: reference-guided image generation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reference-guided prompt generation`: `Missing`.
- `Multiple reference inputs`: `Missing`.
- `Generated output management`: `Missing`.

Implementation notes:
- There is no generation backend or reference input pipeline.

## 0071 - Create And Manage Layers

Source note: `pages/0071-create-and-manage-layers.md`

Function group: layer creation and management.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create layers`: `Present with differences`. Photoweb can add raster, type, fill, and adjustment layers.
- `Delete layers`: `Present with differences`. Layers can be removed.
- `Rename/reorder layers`: `Present with differences`. Layers panel supports renaming and drag reorder.
- `Layer visibility/opacity/blend mode`: `Present with differences`. These controls exist, but Photoshop has deeper controls and effects.
- `Layer groups/smart objects/video layers`: `Missing`.

Implementation notes:
- Core behavior lives in `layersSlice`, `Layer.ts`, and `LayersPanel`.

## 0072 - Get Started With Layers

Source note: `pages/0072-get-started-with-layers.md`

Function group: basic layer workflow.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Layer stack editing`: `Present with differences`. Photoweb supports stacking, selection, visibility, opacity, and blending.
- `Add image content to layers`: `Present with differences`. Imported images create layers.
- `Non-destructive editing concepts`: `Partial`. Adjustment/fill layers and masks exist, but Smart Objects and full layer styles are absent.

Implementation notes:
- Photoweb covers practical layer basics but not the full Photoshop layer ecosystem.

## 0073 - Layers Overview

Source note: `pages/0073-layers-overview.md`

Function group: layer model overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Layer types`: `Partial`. Photoweb models raster, type, shape, adjustment, fill, and group kinds, but group behavior is not fully operational.
- `Layer stack compositing`: `Present with differences`. Canvas 2D compositing handles visible layers, opacity, and blend modes.
- `Layer masks`: `Partial`. Mask data and operations exist, but UI/workflow depth is below Photoshop.
- `Layer effects`: `Missing`. Types exist, but no practical layer style UI/rendering is implemented.

Implementation notes:
- `LayerKind` includes more types than the current UI fully supports.

## 0074 - Organize Layers With Layer Groups

Source note: `pages/0074-organize-layers-with-layer-groups.md`

Function group: layer groups.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create group`: `Missing`. The Layer menu group command is disabled and layer grouping is not operational.
- `Nest layers in groups`: `Missing`.
- `Group visibility/opacity/blend handling`: `Missing`.
- `Ungroup`: `Missing`.

Implementation notes:
- The data model mentions `group`, but no full group workflow is wired.

## 0075 - Work With The Layers Panel

Source note: `pages/0075-work-with-the-layers-panel.md`

Function group: Layers panel controls.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Select active layer`: `Present with differences`. Clicking layer rows selects the active layer.
- `Visibility toggle`: `Present with differences`. Eye/visibility controls exist.
- `Opacity, fill, blend mode`: `Present with differences`. Controls are available in the Layers panel.
- `Lock controls and color labels`: `Present with differences`. Photoweb supports several lock/color-tag style controls.
- `Advanced Photoshop panel menu`: `Partial`. Some context/menu actions exist, but the full Photoshop panel menu is not present.

Implementation notes:
- This is a strong overlap area, though simplified.

## 0076 - Video Layers Overview

Source note: `pages/0076-video-layers-overview.md`

Function group: video layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Import video as layer`: `Missing`.
- `Timeline/video frame editing`: `Missing`.
- `Paint/retouch video frames`: `Missing`.
- `Export video`: `Missing`.

Implementation notes:
- Photoweb is currently still-image focused.

## 0077 - Convert Background And Regular Layers

Source note: `pages/0077-convert-background-and-regular-layers.md`

Function group: background layer conversion.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Locked Background layer concept`: `Missing`. Photoweb does not distinguish a special Photoshop Background layer from regular layers.
- `Convert Background to normal layer`: `Missing`. Not needed under the current model.
- `Convert layer to Background`: `Missing`.
- `Layer locks`: `Partial`. Photoweb has lock controls, but not Photoshop's background-layer rules.

Implementation notes:
- Imported/opened images are editable layer content rather than a Photoshop-style locked Background.

## 0078 - Duplicate Layers

Source note: `pages/0078-duplicate-layers.md`

Function group: layer duplication.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Duplicate layer`: `Partial`. Photoweb supports layer via copy/cut and may duplicate content through layer operations, but it does not expose the full Photoshop Duplicate Layer dialog behavior.
- `Duplicate to another document`: `Missing`. Photoweb has only one active document.
- `Duplicate layer by drag/menu shortcuts`: `Missing` or limited compared with Photoshop.

Implementation notes:
- Related operations are in `layersSlice`, but UX parity is incomplete.

## 0079 - Create Document From Layer Or Group

Source note: `pages/0079-create-document-from-layer-or-group.md`

Function group: new document from selected layer/group.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `New document from layer`: `Missing`.
- `New document from group`: `Missing`.
- `Preserve transparency/bounds from source`: `Missing`.

Implementation notes:
- Photoweb can create new documents, but not from layer selection.

## 0080 - Change Transparency Preferences

Source note: `pages/0080-change-transparency-preferences.md`

Function group: transparency grid preferences.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Transparency grid display`: `Partial`. Photoweb uses checkerboard-style transparency in relevant UI/canvas contexts.
- `Grid size/color preferences`: `Missing`.
- `Gamut warning color preferences`: `Missing`.

Implementation notes:
- Transparency display is visual styling, not a configurable preference.

## 0081 - Sample From All Visible Layers

Source note: `pages/0081-sample-from-all-visible-layers.md`

Function group: multi-layer sampling.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Sample all layers for selection tools`: `Present with differences`. Magic Wand and Quick Selection options include `sampleAllLayers`.
- `Sample all layers for fill tools`: `Present with differences`. Paint Bucket includes a `sampleAllLayers` option.
- `Clone/retouch sample modes`: `Partial`. Clone Stamp has sample mode options, but Photoshop has broader sample-layer controls across retouching tools.

Implementation notes:
- Related controls are in `OptionsBar` and tool modules such as `magicWand`, `quickSelection`, `paintBucket`, and `cloneStamp`.

## 0082 - Transform And Manipulate Layers

Source note: `pages/0082-transform-and-manipulate-layers.md`

Function group: layer transforms.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Free Transform`: `Present with differences`. Photoweb supports a free-transform overlay for active layers.
- `Warp`: `Present with differences`. A warp overlay exists, but it is simpler than Photoshop's transform/warp ecosystem.
- `Rotate/scale/skew`: `Partial`. Core transform controls exist, but not every Photoshop command or interpolation option.
- `Transform multiple layers/groups`: `Missing`. No multi-layer/group transform workflow exists.

Implementation notes:
- See `FreeTransformOverlay`, `WarpOverlay`, and App transform state.

## 0083 - Select Layers

Source note: `pages/0083-select-layers.md`

Function group: layer selection.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Select layer in Layers panel`: `Present with differences`.
- `Auto-select layer with Move tool`: `Partial`. The UI has Move tool options, but Photoshop's full auto-select/layer bounds behavior is not matched.
- `Select multiple layers`: `Missing` or very limited. Photoweb primarily tracks a single active layer.
- `Find/filter layers`: `Missing`.

Implementation notes:
- Active layer state is central to most layer operations.

## 0084 - Group And Ungroup Layers

Source note: `pages/0084-group-and-ungroup-layers.md`

Function group: grouping selected layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Group selected layers`: `Missing`.
- `Ungroup layers`: `Missing`.
- `Nested groups`: `Missing`.
- `Group shortcut/menu command`: `Missing`. Related menu command is disabled.

Implementation notes:
- This overlaps with note `0074`; the data type exists, but not the workflow.

## 0085 - Link And Unlink Layers

Source note: `pages/0085-link-and-unlink-layers.md`

Function group: linked layer movement/transform.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Link selected layers`: `Missing`.
- `Move linked layers together`: `Missing`.
- `Unlink layers`: `Missing`.
- `Linked layer indicators`: `Missing`.

Implementation notes:
- Photoweb currently operates on the active layer, not linked selections.

## 0086 - Display Layer Edges And Handles

Source note: `pages/0086-display-layer-edges-and-handles.md`

Function group: layer bounds and transform handles.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Transform handles`: `Present with differences`. Free Transform shows handles while transform mode is active.
- `Layer edges outside transform mode`: `Missing`. There is no general View > Show > Layer Edges equivalent.
- `Toggle controls from Move tool`: `Partial`. Move tool options show a controls checkbox, but behavior is not full Photoshop parity.

Implementation notes:
- Bounds/handles mainly appear through transform overlays, not a persistent layer-edge display option.

## 0087 - Clean Up Image Layers

Source note: `pages/0087-clean-up-image-layers.md`

Function group: layer cleanup automation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Trim/remove empty transparent pixels per layer`: `Missing`.
- `Remove hidden/unused layers automatically`: `Missing`.
- `Automated cleanup suggestions`: `Missing`.

Implementation notes:
- Photoweb has manual delete/merge operations, not layer cleanup automation.

## 0088 - Color Adjustment And Fill Layers

Source note: `pages/0088-color-adjustment-and-fill-layers.md`

Function group: adjustment and fill layer workflows.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Adjustment layers`: `Present with differences`. Photoweb supports many adjustment layer types.
- `Fill layers`: `Partial`. Solid Color and Gradient fill layers exist; Pattern fill is missing.
- `Non-destructive stack behavior`: `Partial`. Adjustment/fill layer data exists, but Photoshop's properties/presets/masks ecosystem is larger.

Implementation notes:
- See `addAdjustmentLayer`, `addFillLayer`, `adjustments/*`, and `fillLayer.ts`.

## 0089 - Adjustment And Fill Layers Overview

Source note: `pages/0089-adjustment-and-fill-layers-overview.md`

Function group: non-destructive color/fill layers.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Adjustment layer catalog`: `Present with differences`. Photoweb includes Brightness/Contrast, Levels, Curves, Exposure, Vibrance, Hue/Saturation, Color Balance, Black & White, Photo Filter, Channel Mixer, Invert, Posterize, Threshold, Gradient Map, and auto adjustments.
- `Fill layer catalog`: `Partial`. Solid color and gradient are available; pattern is absent.
- `Properties editing`: `Partial`. Creation is supported, but full Photoshop Properties panel editing is not complete.

Implementation notes:
- The Adjustments panel provides quick creation buttons.

## 0090 - Work With Adjustment Layers

Source note: `pages/0090-work-with-adjustment-layers.md`

Function group: creating and using adjustment layers.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create adjustment layer from menu/panel`: `Present with differences`.
- `Clip adjustment to layer below`: `Missing`. Photoweb does not clearly implement clipping-mask adjustment behavior.
- `Edit adjustment properties later`: `Partial`. Adjustment parameters exist, but the UI is not Photoshop-equivalent.
- `Use masks with adjustment layers`: `Partial`. Layer mask infrastructure exists.

Implementation notes:
- The core adjustment engine is present; advanced workflow polish is the gap.

## 0091 - Use Layer Masks To Target Adjustment Or Fill Layers

Source note: `pages/0091-use-layer-masks-to-target-adjustment-or-fill-layers.md`

Function group: masks on adjustment/fill layers.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Add mask to layer`: `Present with differences`. Layer mask operations exist.
- `Use selection to initialize mask`: `Partial`. Some menu actions imply reveal/hide selection behavior, but Photoshop's mask panel workflow is broader.
- `Enable/disable/link/invert/apply mask`: `Partial`. Store actions exist for several mask operations, but UI parity is incomplete.
- `Properties panel mask controls`: `Missing`.

Implementation notes:
- Mask data is in the layer model and operations are in `layersSlice`.

## 0092 - Create Adjustment Layers

Source note: `pages/0092-create-adjustment-layers.md`

Function group: adjustment layer creation.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Layer > New Adjustment Layer`: `Present with differences`. Photoweb menu actions create adjustment layers.
- `Adjustments panel buttons`: `Present with differences`. The right dock includes an Adjustments tab.
- `Name/mode/opacity options at creation`: `Partial`. Photoweb can later edit layer name/opacity/blend mode, but does not match Photoshop's new-layer dialog flow.

Implementation notes:
- Adjustment creation is one of the better-covered Photoshop feature groups.

## 0093 - Merging Adjustment Or Fill Layers

Source note: `pages/0093-merging-adjustment-or-fill-layers.md`

Function group: merging non-destructive layers into pixel results.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Merge down`: `Present with differences`. Photoweb has merge operations.
- `Merge visible/stamp visible/flatten`: `Present with differences`. Related operations exist in the layer store/menu.
- `Adjustment/fill-specific merge behavior`: `Partial`. Photoweb can merge rasterized results, but does not document or expose Photoshop's full nuance around adjustment/fill layers.

Implementation notes:
- Merge operations live in `layersSlice`.

## 0094 - Adjustment Presets Overview

Source note: `pages/0094-adjustment-presets-overview.md`

Function group: adjustment presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Built-in adjustment presets`: `Missing`. Photoweb adjustments have defaults, but no preset browser/library.
- `Preset categories`: `Missing`.
- `Apply preset to adjustment`: `Missing`.

Implementation notes:
- This would need preset data, UI, and serialization.

## 0095 - Create Custom Presets

Source note: `pages/0095-create-custom-presets.md`

Function group: user-defined adjustment presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save adjustment settings as preset`: `Missing`.
- `Name/manage custom preset`: `Missing`.
- `Reuse custom presets`: `Missing`.

Implementation notes:
- No preset persistence exists for adjustment settings.

## 0096 - Correct Color Balance With Color And Vibrance

Source note: `pages/0096-correct-color-balance-with-color-and-vibrance.md`

Function group: color balance and vibrance correction.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Color Balance adjustment`: `Present with differences`. Photoweb includes Color Balance.
- `Vibrance adjustment`: `Present with differences`. Photoweb includes Vibrance.
- `Temperature/Tint style controls`: `Missing` unless approximated manually with existing color adjustments.
- `Photoshop Properties panel workflow`: `Partial`. Photoweb uses simpler adjustment dialogs/panels.

Implementation notes:
- Related adjustment modules are registered through `src/adjustments/colorAdjustments.ts`.

## 0097 - Create Fill Layers

Source note: `pages/0097-create-fill-layers.md`

Function group: solid, gradient, and pattern fill layers.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Solid Color fill layer`: `Present with differences`.
- `Gradient fill layer`: `Present with differences`.
- `Pattern fill layer`: `Missing`.
- `Fill layer mask and edit controls`: `Partial`.

Implementation notes:
- Fill layer types are defined in `src/core/fillLayer.ts`.

## 0098 - Adjustment Layer Options

Source note: `pages/0098-adjustment-layer-options.md`

Function group: available adjustment types and options.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Common tonal/color adjustments`: `Present with differences`. Many core adjustments are implemented.
- `Specialized Camera Raw-style options`: `Missing`. Clarity, Dehaze, Grain, and some modern controls are not present as adjustment layers.
- `Option UI parity`: `Partial`. Photoweb uses simpler dialogs and parameter models.

Implementation notes:
- Adjustment coverage is broad but not Photoshop-complete.

## 0099 - Change Adjustment And Fill Layer Options

Source note: `pages/0099-change-adjustment-and-fill-layer-options.md`

Function group: editing existing adjustment/fill layer settings.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Change adjustment parameters after creation`: `Partial`. Data exists for adjustment parameters, but UI for revisiting and editing all options is limited.
- `Change fill color/gradient after creation`: `Partial`. Fill layer data exists, but the full Photoshop Properties workflow is absent.
- `Change blend/opacity`: `Present with differences`. Layers panel supports blend mode, opacity, and fill.

Implementation notes:
- A Properties panel exists in the codebase, but the active workflow is not Photoshop-equivalent.

## 0100 - Adjust Contrast With Clarity And Dehaze

Source note: `pages/0100-adjust-contrast-with-clarity-and-dehaze.md`

Function group: clarity and dehaze adjustment.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Clarity adjustment`: `Missing`.
- `Dehaze adjustment`: `Missing`.
- `Camera Raw-style contrast controls`: `Missing`.

Implementation notes:
- Photoweb has Brightness/Contrast, Curves, Levels, Exposure, and sharpening filters, but not these named controls.

## 0101 - Adjust Texture With Grain

Source note: `pages/0101-adjust-texture-with-grain.md`

Function group: grain adjustment.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Grain amount/size/roughness controls`: `Missing`.
- `Non-destructive grain adjustment layer`: `Missing`.
- `Camera Raw-style texture grain workflow`: `Missing`.

Implementation notes:
- Noise filters may add pixel noise, but they are not the same as a non-destructive Grain adjustment layer.

## 0102 - Apply Layer Effects

Source note: `pages/0102-apply-layer-effects.md`

Function group: layer effects.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Apply effects such as shadow/glow/bevel`: `Missing`.
- `Layer effects rendering`: `Missing`. The layer model has an `effects` field, but behavior/UI is not implemented as a usable feature.
- `Effects dialog`: `Missing`.

Implementation notes:
- Treat this as a data-model placeholder, not a shipped Photoweb function.

## 0103 - Add Layer Styles

Source note: `pages/0103-add-layer-styles.md`

Function group: layer styles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Layer Style dialog`: `Missing`.
- `Add drop shadow, stroke, overlay, glow, bevel`: `Missing`.
- `Multiple effects per layer`: `Missing`.

Implementation notes:
- No layer style UI is present in menus or panels.

## 0104 - Work With Preset Styles

Source note: `pages/0104-work-with-preset-styles.md`

Function group: preset layer styles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Styles panel`: `Missing`.
- `Apply preset style`: `Missing`.
- `Style thumbnails/library`: `Missing`.

Implementation notes:
- This depends on first implementing layer styles/effects.

## 0105 - Layer Style Effects And Options Overview

Source note: `pages/0105-layer-style-effects-and-options-overview.md`

Function group: layer style effect catalog.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Drop Shadow/Inner Shadow`: `Missing`.
- `Outer Glow/Inner Glow`: `Missing`.
- `Bevel and Emboss`: `Missing`.
- `Stroke/Color Overlay/Gradient Overlay/Pattern Overlay`: `Missing`.
- `Blending options for styles`: `Missing`.

Implementation notes:
- Photoweb blend modes are layer compositing modes, not layer style effects.

## 0106 - Manage Preset Styles

Source note: `pages/0106-manage-preset-styles.md`

Function group: style preset management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create/save style preset`: `Missing`.
- `Rename/delete style preset`: `Missing`.
- `Organize style libraries`: `Missing`.

Implementation notes:
- No style preset system exists.

## 0107 - Display Or Hide Layer Styles

Source note: `pages/0107-display-or-hide-layer-styles.md`

Function group: layer style visibility toggles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Toggle all effects on a layer`: `Missing`.
- `Toggle individual effects`: `Missing`.
- `Show/hide style indicators in Layers panel`: `Missing`.

Implementation notes:
- Layer visibility is supported, but style-specific visibility is not.

## 0108 - Copy And Paste Layer Styles

Source note: `pages/0108-copy-and-paste-layer-styles.md`

Function group: transferring layer styles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Copy layer style`: `Missing`.
- `Paste layer style`: `Missing`.
- `Clear layer style`: `Missing`.

Implementation notes:
- No implemented style data workflow exists to copy or paste.

## 0109 - Import Preset Style Libraries

Source note: `pages/0109-import-preset-style-libraries.md`

Function group: importing style libraries.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Import ASL/style library`: `Missing`.
- `Load external preset library`: `Missing`.
- `Persist imported styles`: `Missing`.

Implementation notes:
- Photoweb does not parse Photoshop preset formats.

## 0110 - Manage Contours

Source note: `pages/0110-manage-contours.md`

Function group: contours used by layer effects.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Contour editor`: `Missing`.
- `Contour presets`: `Missing`.
- `Use contours in shadow/glow/bevel effects`: `Missing`.

Implementation notes:
- Since layer effects are not implemented, contour management is also absent.

## Summary

High-overlap areas:
- Workspace shell anatomy: Photoweb has a Photoshop-like menu, toolbar, options bar, canvas, status bar, and right panel dock.
- Layers: Photoweb supports a practical subset of layer creation, ordering, visibility, opacity, blend modes, masks, adjustment layers, fill layers, and merge operations.
- History: Photoweb has undo/redo, a History panel, and basic snapshots.
- Image input: Photoweb can create a new document, open local images, import images as layers, save, and export.
- Transform and local editing: Photoweb includes Free Transform, Warp, filters, adjustments, selections, paint/fill tools, type tools, and common view toggles.

Major missing areas:
- Generative AI: notes `0055` through `0070` are almost entirely absent except for non-AI canvas resize and local image creation/open/import.
- Workspace customization: notes `0020` through `0037` are mostly missing because Photoweb uses a fixed workspace.
- Preferences and product infrastructure: notes `0011` through `0017`, `0032` through `0034`, and `0049` through `0054` lack central preferences, localization, GPU settings, codec guidance, home screen, shortcut viewer, and pointer settings.
- Advanced Photoshop layer systems: layer groups, linked layers, video layers, Smart Object-like placement, full layer effects/styles, style presets, and contours are missing.
- History Brush/history log: undo/history exists, but Photoshop's history logging and previous-state painting are missing.

Recommended implementation priorities if Photoweb wants closer Photoshop parity:
- Add workspace state first: hide/show panels, panel visibility, saved workspace presets, and a Window menu that can actually open panels.
- Add a Preferences dialog with UI scale, shortcut reference, tool pointer settings, and transparency grid settings.
- Improve layer architecture with multi-select, groups, linked layers, duplicate-layer dialog behavior, and create-document-from-layer.
- Build Properties editing for existing adjustment/fill layers before adding more adjustment types.
- Treat generative AI as a separate large product track because it requires backend/model/account decisions, not just UI.
