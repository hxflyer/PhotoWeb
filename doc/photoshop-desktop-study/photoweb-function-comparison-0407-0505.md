# Photoweb vs Photoshop Notes: Function Comparison 0407-0505

Scope: 100 generated Photoshop study note files in sorted order, from `0407` through `0505`. This batch includes both `0498` macOS spelling variants present in the source folder.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes Adobe product/platform behavior more than an editor function.

Relevant Photoweb code areas:
- Filters: `src/filters/*`, `src/components/Dialogs/FilterDialog.tsx`
- Warp and transforms: `src/components/Canvas/WarpOverlay.tsx`, `src/core/imageTransforms.ts`
- View grid/rulers/snap: `src/store/viewSlice.ts`, `src/components/Canvas/Viewport.tsx`, `src/components/layout/MenuBar.tsx`
- Save/load/autosave/export: `src/core/persistence.ts`, `src/store/documentSlice.ts`, `src/components/Dialogs/ExportDialog.tsx`, `src/App.tsx`
- History panel: `src/components/Panels/HistoryPanel.tsx`

## 0407 - Sharpen Images With The Unsharp Mask

Source note: `pages/0407-sharpen-images-with-the-unsharp-mask.md`

Function group: Unsharp Mask.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Unsharp Mask filter`: `Present with differences`.
- `Amount/radius/threshold`: `Present with differences`.
- `Photoshop preview and color-mode nuances`: `Partial`.

Implementation notes:
- Implemented in `src/filters/sharpenFilters.tsx`.

## 0408 - Sharpen A Selection

Source note: `pages/0408-sharpen-a-selection.md`

Function group: selection-limited sharpening.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Apply filter through active selection`: `Present with differences`.
- `Sharpen only selected pixels`: `Present with differences`.
- `Photoshop selection edge parity`: `Partial`.
- `Layer mask supported in filter application`: `Present`. `applyFilterToLayer` now combines the active selection with the layer's raster mask so sharpening obeys both constraints.

Implementation notes:
- `applyFilterToLayer` blends filtered output through the selection mask combined with any layer mask.

## 0409 - Sharpen Image Using Edge Mask

Source note: `pages/0409-sharpen-image-using-edge-mask.md`

Function group: edge-mask sharpening workflow.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Sharpen/high-pass primitives`: `Present with differences`.
- `Create edge mask workflow`: `Missing`.
- `Channels-based edge mask technique`: `Missing`.

Implementation notes:
- High Pass and sharpening filters exist, but not a guided edge-mask workflow.

## 0410 - Blur And Sharpen Filters

Source note: `pages/0410-blur-and-sharpen-filters.md`

Function group: blur and sharpen filter catalog.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Gaussian/Box/Motion/Surface Blur`: `Present with differences`.
- `Unsharp Mask/Smart Sharpen`: `Present with differences`.
- `Full Photoshop blur/sharpen family`: `Partial`.

Implementation notes:
- This is a strong filter overlap area.

## 0411 - Overview Of Adding Blur To Images

Source note: `pages/0411-overview-of-adding-blur-to-images.md`

Function group: blur workflows.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Apply blur filter`: `Present with differences`.
- `Blur selected areas`: `Present with differences`. `applyFilterToLayer` now respects the layer mask combined with the active selection, so blur honors both constraints.
- `Blur Gallery/Lens Blur/field blur workflows`: `Missing`.

Implementation notes:
- Blur support is conventional raster filtering.

## 0412 - Create Depth Of Field With Lens Blur

Source note: `pages/0412-create-depth-of-field-with-lens-blur.md`

Function group: Lens Blur depth of field.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Lens Blur filter`: `Missing`.
- `Depth map/alpha channel source`: `Missing`.
- `Iris/specular/noise controls`: `Missing`.

Implementation notes:
- Gaussian/Motion/Surface blur are available, but Lens Blur is not.

## 0413 - Soften Hard Edges Or Reduce Detail With The Blur Tool

Source note: `pages/0413-soften-hard-edges-or-reduce-detail-with-the-blur-tool.md`

Function group: Blur tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Blur brush tool`: `Missing`.
- `Strength/sample all layers options`: `Missing`.
- `Localized brush-based blur`: `Missing`.

Implementation notes:
- Photoweb has blur filters, not a Blur tool.

## 0414 - Enhance Edge Contrast With The Sharpen Tool

Source note: `pages/0414-enhance-edge-contrast-with-the-sharpen-tool.md`

Function group: Sharpen tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Sharpen brush tool`: `Missing`.
- `Protect detail option`: `Missing`.
- `Localized brush-based sharpen`: `Missing`.

Implementation notes:
- Sharpening exists as filters only.

## 0415 - Artistic And Stylize Filters

Source note: `pages/0415-artistic-and-stylize-filters.md`

Function group: artistic/stylize filter effects.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Stylize Find Edges/Emboss`: `Present with differences`.
- `Artistic Filter Gallery effects`: `Missing`.
- `Texture/sketch/brush stroke categories`: `Missing`.

Implementation notes:
- Photoweb has a small stylize subset.

## 0416 - Reshape And Distort Images With Transform Warp

Source note: `pages/0416-reshape-and-distort-images-with-transform-warp.md`

Function group: Transform Warp.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Warp overlay mesh`: `Present with differences`.
- `Warp presets`: `Present with differences`.
- `Photoshop advanced warp controls`: `Partial`.

Implementation notes:
- `WarpOverlay` provides a 4x4 mesh workflow.

## 0417 - Warp A Layer With Cylindrical Transform

Source note: `pages/0417-warp-a-layer-with-cylindrical-transform.md`

Function group: cylindrical transform warp.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Cylindrical Transform Warp`: `Missing`.
- `Bottle/cylinder wrap behavior`: `Missing`.
- `Dedicated cylindrical controls`: `Missing`.

Implementation notes:
- General warp presets exist, but not cylindrical transform.

## 0418 - Get Precise Distortions With Split Warp

Source note: `pages/0418-get-precise-distortions-with-split-warp.md`

Function group: Split Warp.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Add split warp lines`: `Missing`.
- `Distort isolated mesh regions`: `Missing`.
- `Split warp precision controls`: `Missing`.

Implementation notes:
- Photoweb's mesh is fixed and simpler.

## 0419 - Distort Specific Image Areas With Puppet Warp

Source note: `pages/0419-distort-specific-image-areas-with-puppet-warp.md`

Function group: Puppet Warp.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Puppet mesh`: `Missing`.
- `Pins and pin rotation`: `Missing`.
- `Density/expansion/show mesh controls`: `Missing`.

Implementation notes:
- No pin-based deformation system exists.

## 0420 - Overview Of Liquify Filter

Source note: `pages/0420-overview-of-liquify-filter.md`

Function group: Liquify filter overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Liquify workspace`: `Missing`.
- `Push/twirl/pucker/bloat tools`: `Missing`.
- `Face-Aware Liquify`: `Missing`.

Implementation notes:
- Distort filters exist, but Liquify does not.

## 0421 - Overview Of Distortion Tools

Source note: `pages/0421-overview-of-distortion-tools.md`

Function group: Liquify distortion tools.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Forward Warp/Reconstruct/Smooth/Twirl/Pucker/Bloat`: `Missing`.
- `Freeze/Thaw Mask tools`: `Missing`.
- `Mesh/backdrop options`: `Missing`.

Implementation notes:
- General Warp is not a Liquify workspace.

## 0422 - Use Liquify To Distort An Image

Source note: `pages/0422-use-liquify-to-distort-an-image.md`

Function group: applying Liquify.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Liquify and paint distortions`: `Missing`.
- `Brush pressure/size/density/rate`: `Missing`.
- `Commit/cancel Liquify result`: `Missing`.

Implementation notes:
- No Liquify editor exists.

## 0423 - Freeze Or Thaw Areas

Source note: `pages/0423-freeze-or-thaw-areas.md`

Function group: Liquify freeze/thaw masks.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Freeze Mask tool`: `Missing`.
- `Thaw Mask tool`: `Missing`.
- `Protect areas from Liquify`: `Missing`.

Implementation notes:
- Depends on missing Liquify.

## 0424 - Work With Meshes

Source note: `pages/0424-work-with-meshes.md`

Function group: Liquify mesh save/load.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save/load Liquify mesh`: `Missing`.
- `Show mesh`: `Missing`.
- `Mesh size/color options`: `Missing`.

Implementation notes:
- Warp mesh is transient and not Liquify mesh management.

## 0425 - Work With Backdrops

Source note: `pages/0425-work-with-backdrops.md`

Function group: Liquify backdrops.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Show backdrop layer`: `Missing`.
- `Backdrop opacity/blend mode`: `Missing`.
- `Use backdrop for alignment`: `Missing`.

Implementation notes:
- Liquify workspace is absent.

## 0426 - Reconstruct Distortions

Source note: `pages/0426-reconstruct-distortions.md`

Function group: Liquify reconstruction.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reconstruct tool`: `Missing`.
- `Reconstruct all/restore areas`: `Missing`.
- `Reconstruction options`: `Missing`.

Implementation notes:
- No Liquify deformation state exists.

## 0427 - Replace The Sky In Images

Source note: `pages/0427-replace-the-sky-in-images.md`

Function group: Sky Replacement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Sky Replacement command`: `Missing`.
- `Detect sky area`: `Missing`.
- `Blend new sky with foreground`: `Missing`.

Implementation notes:
- Manual compositing is possible, but no sky detection/replacement tool exists.

## 0428 - Select And Manage Sky Presets

Source note: `pages/0428-select-and-manage-sky-presets.md`

Function group: sky preset library.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Sky preset picker`: `Missing`.
- `Import/manage sky presets`: `Missing`.
- `Sky groups/libraries`: `Missing`.

Implementation notes:
- Depends on absent Sky Replacement.

## 0429 - Enhance Images With Generative AI Filters

Source note: `pages/0429-enhance-images-with-generative-ai-filters.md`

Function group: generative AI filters.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generative AI filter workflow`: `Missing`.
- `Cloud model processing`: `Missing`.
- `AI output options`: `Missing`.

Implementation notes:
- Photoweb has local filters only.

## 0430 - Neural Filters

Source note: `pages/0430-neural-filters.md`

Function group: Neural Filters.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Neural Filters panel`: `Missing`.
- `Download/apply neural models`: `Missing`.
- `AI filter outputs`: `Missing`.

Implementation notes:
- No neural model runtime or service is present.

## 0431 - Overview Of Neural Filters

Source note: `pages/0431-overview-of-neural-filters.md`

Function group: Neural Filters overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Featured/beta neural filters`: `Missing`.
- `Cloud/device neural processing`: `Missing`.
- `Filter availability management`: `Missing`.

Implementation notes:
- Feature family is absent.

## 0432 - Use Neural Filters To Enhance Images

Source note: `pages/0432-use-neural-filters-to-enhance-images.md`

Function group: applying neural filters.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Neural Filters`: `Missing`.
- `Adjust neural filter sliders`: `Missing`.
- `Output to current/new layer/smart filter`: `Missing`.

Implementation notes:
- No AI filter panel exists.

## 0433 - Neural Filter Categories And Output Options

Source note: `pages/0433-neural-filter-categories-and-output-options.md`

Function group: neural filter organization.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Filter categories`: `Missing`.
- `Download/beta labels`: `Missing`.
- `Output options`: `Missing`.

Implementation notes:
- No neural filter registry exists.

## 0434 - Use Grids And Measurement Guides

Source note: `pages/0434-use-grids-and-measurement-guides.md`

Function group: grids and measurement guides.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Grid display`: `Present with differences`.
- `Rulers`: `Present with differences`.
- `Measurement guides/guide layouts`: `Missing`.

Implementation notes:
- Rulers/grid are viewport overlays; measurement tools are absent.

## 0435 - Alignment Grids And Guides

Source note: `pages/0435-alignment-grids-and-guides.md`

Function group: alignment aids.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Grid`: `Present with differences`.
- `Snap`: `Present with differences`.
- `Guides and smart guides`: `Missing`.

Implementation notes:
- The View menu exposes grid/ruler/snap toggles.

## 0436 - Overview Of Navigation And Measuring Tools

Source note: `pages/0436-overview-of-navigation-and-measuring-tools.md`

Function group: navigation and measurement tools.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Hand and Zoom tools`: `Present with differences`.
- `Rulers`: `Present with differences`.
- `Ruler/Count/measurement tools`: `Missing`.

Implementation notes:
- Navigation is implemented; measuring is not.

## 0437 - Overview Of Guides, Grids, And Smart Guides

Source note: `pages/0437-overview-of-guides-grids-and-smart-guides.md`

Function group: guides/grids/smart guides.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Grid`: `Present with differences`.
- `Rulers`: `Present with differences`.
- `Guides`: `Missing`.
- `Smart Guides`: `Missing`.

Implementation notes:
- No draggable guide model exists.

## 0438 - Show Or Hide Guides, Grids, And Smart Guides

Source note: `pages/0438-show-or-hide-guides-grids-and-smart-guides.md`

Function group: visibility toggles for alignment aids.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Show/hide grid`: `Present with differences`.
- `Show/hide rulers`: `Present with differences`.
- `Show/hide guides/smart guides`: `Missing`.

Implementation notes:
- `viewSlice` contains grid/ruler/snap state only.

## 0439 - Create Guides

Source note: `pages/0439-create-guides.md`

Function group: guide creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Drag guide from ruler`: `Missing`.
- `New Guide/New Guide Layout`: `Missing`.
- `Guide position units`: `Missing`.

Implementation notes:
- Rulers are display-only.

## 0440 - Move Guides

Source note: `pages/0440-move-guides.md`

Function group: guide movement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select/move guide`: `Missing`.
- `Lock/unlock guide movement`: `Missing`.
- `Snap guide to objects`: `Missing`.

Implementation notes:
- No guide objects exist.

## 0441 - Edit Guides

Source note: `pages/0441-edit-guides.md`

Function group: guide editing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Edit guide position/color`: `Missing`.
- `Guide layout dialog`: `Missing`.
- `Lock/clear selected guides`: `Missing`.

Implementation notes:
- No guide editing UI exists.

## 0442 - Remove Guides

Source note: `pages/0442-remove-guides.md`

Function group: guide deletion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Clear guide`: `Missing`.
- `Clear all guides`: `Missing`.
- `Delete selected guide`: `Missing`.

Implementation notes:
- No guide model exists.

## 0443 - Set Guide And Grid Preferences

Source note: `pages/0443-set-guide-and-grid-preferences.md`

Function group: guide/grid preferences.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Grid size state`: `Partial`. A grid size value exists.
- `Guide/grid color/style preferences`: `Missing`.
- `Preference dialog persistence`: `Missing`.

Implementation notes:
- Grid display is implemented, but not a Photoshop preference system.

## 0444 - Work Efficiently With Smart Guides

Source note: `pages/0444-work-efficiently-with-smart-guides.md`

Function group: smart guides.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Smart alignment guides`: `Missing`.
- `Object spacing/measurement hints`: `Missing`.
- `Smart guide preferences`: `Missing`.

Implementation notes:
- Snap exists, but not smart guide visualization.

## 0445 - Measure And Scale

Source note: `pages/0445-measure-and-scale.md`

Function group: measurement tools.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Ruler measurement tool`: `Missing`.
- `Set measurement scale`: `Missing`.
- `Measurement log`: `Missing`.

Implementation notes:
- Screen rulers are not measurement tools.

## 0446 - Manage Measurement Scales

Source note: `pages/0446-manage-measurement-scales.md`

Function group: measurement scale presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Set custom scale`: `Missing`.
- `Scale presets`: `Missing`.
- `Scale Marker support`: `Missing`.

Implementation notes:
- No measurement subsystem exists.

## 0447 - Manage Scale Markers

Source note: `pages/0447-manage-scale-markers.md`

Function group: scale markers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Place scale marker`: `Missing`.
- `Edit marker appearance`: `Missing`.
- `Associate marker with measurement scale`: `Missing`.

Implementation notes:
- Feature family is absent.

## 0448 - Use The Measurement Log For Performing Measurements

Source note: `pages/0448-use-the-measurement-log-for-performing-measurements.md`

Function group: measurement log.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Record measurements`: `Missing`.
- `Measurement Log panel`: `Missing`.
- `Export log data`: `Missing`.

Implementation notes:
- No measurement logging exists.

## 0449 - Measurement Data Points Overview

Source note: `pages/0449-measurement-data-points-overview.md`

Function group: measurement data points.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Data point presets`: `Missing`.
- `Measure area/perimeter/gray values/etc.`: `Missing`.
- `Analysis measurement fields`: `Missing`.

Implementation notes:
- Photoweb has no scientific measurement tools.

## 0450 - Create, Edit, And Delete Data Point Presets

Source note: `pages/0450-create-edit-and-delete-data-point-presets.md`

Function group: measurement preset management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create data point preset`: `Missing`.
- `Edit/delete preset`: `Missing`.
- `Apply preset to measurement log`: `Missing`.

Implementation notes:
- Depends on absent measurement log.

## 0451 - Manage Measurement Logs

Source note: `pages/0451-manage-measurement-logs.md`

Function group: measurement log management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save/export measurement log`: `Missing`.
- `Clear log`: `Missing`.
- `Select log columns`: `Missing`.

Implementation notes:
- No measurement log state exists.

## 0452 - About The Measurement Scale And Scale Markers

Source note: `pages/0452-about-the-measurement-scale-and-scale-markers.md`

Function group: measurement scale concepts.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Measurement scale explanation`: `Not applicable`.
- `Scale marker feature`: `Missing`.
- `Scientific imaging workflow`: `Missing`.

Implementation notes:
- Outside current Photoweb scope.

## 0453 - Add Video And Animation

Source note: `pages/0453-add-video-and-animation.md`

Function group: video and animation overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Timeline panel`: `Missing`.
- `Video layers`: `Missing`.
- `Frame animation`: `Missing`.

Implementation notes:
- Photoweb is still-image focused.

## 0454 - Create Animation Frames

Source note: `pages/0454-create-animation-frames.md`

Function group: frame animation creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create Frame Animation`: `Missing`.
- `Frame list/timeline`: `Missing`.
- `Layer visibility per frame`: `Missing`.

Implementation notes:
- No animation state model exists.

## 0455 - Create Frame-Based Animations

Source note: `pages/0455-create-frame-based-animations.md`

Function group: frame-based animation workflow.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Frame animation timeline`: `Missing`.
- `Frame duplicate/reorder`: `Missing`.
- `Preview playback`: `Missing`.

Implementation notes:
- No animation playback/export pipeline exists.

## 0456 - Add Frames To Animations

Source note: `pages/0456-add-frames-to-animations.md`

Function group: adding animation frames.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Add/duplicate frame`: `Missing`.
- `Frame layer states`: `Missing`.
- `Frame thumbnail list`: `Missing`.

Implementation notes:
- Animation frames are absent.

## 0457 - Select Animation Frames

Source note: `pages/0457-select-animation-frames.md`

Function group: frame selection.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select single/multiple frames`: `Missing`.
- `Frame range editing`: `Missing`.
- `Timeline frame commands`: `Missing`.

Implementation notes:
- No timeline panel exists.

## 0458 - Edit Animation Frames

Source note: `pages/0458-edit-animation-frames.md`

Function group: editing frame animation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Change frame layer visibility/position/effects`: `Missing`.
- `Edit selected frames`: `Missing`.
- `Frame-specific properties`: `Missing`.

Implementation notes:
- Layer state is document-wide, not frame-specific.

## 0459 - Unify Layer Properties In Animation Frames

Source note: `pages/0459-unify-layer-properties-in-animation-frames.md`

Function group: unifying animation frame layer properties.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Unify layer position/visibility/style`: `Missing`.
- `Frame animation layer property sync`: `Missing`.
- `Timeline property controls`: `Missing`.

Implementation notes:
- Animation frames are absent.

## 0460 - Copy Frames With Layer Properties

Source note: `pages/0460-copy-frames-with-layer-properties.md`

Function group: copying animation frames.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Copy/paste animation frames`: `Missing`.
- `Preserve layer properties`: `Missing`.
- `Paste frames before/after selection`: `Missing`.

Implementation notes:
- No animation frame model exists.

## 0461 - Create Frames Using Tweening

Source note: `pages/0461-create-frames-using-tweening.md`

Function group: tweening.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Tween command`: `Missing`.
- `Generate in-between frames`: `Missing`.
- `Tween opacity/position/effects`: `Missing`.

Implementation notes:
- No animation interpolation system exists.

## 0462 - Manage Layer Visibility In Animation Frames

Source note: `pages/0462-manage-layer-visibility-in-animation-frames.md`

Function group: frame-specific layer visibility.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Visibility per frame`: `Missing`.
- `New layer visibility in frames`: `Missing`.
- `Propagate frame visibility`: `Missing`.

Implementation notes:
- Layer visibility is global.

## 0463 - Specify A Delay Time In Frame Animations

Source note: `pages/0463-specify-a-delay-time-in-frame-animations.md`

Function group: frame delay timing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Frame delay dropdown`: `Missing`.
- `Per-frame timing`: `Missing`.
- `Playback timing`: `Missing`.

Implementation notes:
- No frame timeline exists.

## 0464 - Choose A Frame Disposal Method

Source note: `pages/0464-choose-a-frame-disposal-method.md`

Function group: animation frame disposal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Disposal method setting`: `Missing`.
- `GIF-style frame disposal behavior`: `Missing`.
- `Export disposal metadata`: `Missing`.

Implementation notes:
- GIF export exists as static canvas export only if browser supports encoding path, not animation.

## 0465 - Specify Looping In Frame Animations

Source note: `pages/0465-specify-looping-in-frame-animations.md`

Function group: animation looping.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Loop count controls`: `Missing`.
- `Forever/once/custom loops`: `Missing`.
- `Animation preview/export loop metadata`: `Missing`.

Implementation notes:
- No animated export workflow exists.

## 0466 - Delete Animations

Source note: `pages/0466-delete-animations.md`

Function group: deleting animation frames/timelines.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Delete frame animation`: `Missing`.
- `Delete timeline/video tracks`: `Missing`.
- `Convert animation back to static document`: `Missing`.

Implementation notes:
- No animation state exists to delete.

## 0467 - Use Keyframes

Source note: `pages/0467-use-keyframes.md`

Function group: timeline keyframes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Timeline keyframes`: `Missing`.
- `Animate position/opacity/style`: `Missing`.
- `Keyframe interpolation`: `Missing`.

Implementation notes:
- No timeline animation system exists.

## 0468 - Create A Timeline Animation Workflow

Source note: `pages/0468-create-a-timeline-animation-workflow.md`

Function group: timeline animation workflow.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Video Timeline`: `Missing`.
- `Tracks and keyframes`: `Missing`.
- `Timeline playback/export`: `Missing`.

Implementation notes:
- Photoweb does not include timeline UI.

## 0469 - Overview Of Animating Layer Properties

Source note: `pages/0469-overview-of-animating-layer-properties.md`

Function group: layer property animation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Animate transform/opacity/style`: `Missing`.
- `Layer property keyframes`: `Missing`.
- `Timeline interpolation`: `Missing`.

Implementation notes:
- Layer properties are static document state.

## 0470 - Automate Tasks

Source note: `pages/0470-automate-tasks.md`

Function group: automation overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Actions`: `Missing`.
- `Batch/Image Processor/Droplets`: `Missing`.
- `Scripts/automation commands`: `Missing`.

Implementation notes:
- Photoweb has no macro or batch-processing engine.

## 0471 - Create And Record Actions

Source note: `pages/0471-create-and-record-actions.md`

Function group: Actions recording.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Actions panel`: `Missing`.
- `Record command sequence`: `Missing`.
- `Action set management`: `Missing`.

Implementation notes:
- History is not a recordable action system.

## 0472 - Record An Action

Source note: `pages/0472-record-an-action.md`

Function group: recording an action.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Start/stop recording`: `Missing`.
- `Capture menu/tool operations`: `Missing`.
- `Replay action`: `Missing`.

Implementation notes:
- No automation recorder exists.

## 0473 - Record A Path

Source note: `pages/0473-record-a-path.md`

Function group: recording paths in actions.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Record path command in action`: `Missing`.
- `Replay path creation`: `Missing`.
- `Action/path integration`: `Missing`.

Implementation notes:
- Paths exist, but actions do not.

## 0474 - Insert A Stop

Source note: `pages/0474-insert-a-stop.md`

Function group: action stops.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Insert Stop in action`: `Missing`.
- `Prompt message during playback`: `Missing`.
- `Allow continue option`: `Missing`.

Implementation notes:
- Depends on absent Actions panel.

## 0475 - Change Settings When Playing An Action

Source note: `pages/0475-change-settings-when-playing-an-action.md`

Function group: modal controls during action playback.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Toggle dialog for action step`: `Missing`.
- `Change settings during playback`: `Missing`.
- `Action playback control`: `Missing`.

Implementation notes:
- No action playback exists.

## 0476 - Exclude Commands From An Action

Source note: `pages/0476-exclude-commands-from-an-action.md`

Function group: disabling action steps.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Enable/disable action command`: `Missing`.
- `Skip step during playback`: `Missing`.
- `Action step list`: `Missing`.

Implementation notes:
- No action step model exists.

## 0477 - Insert A Non-Recordable Menu Command

Source note: `pages/0477-insert-a-non-recordable-menu-command.md`

Function group: inserting menu commands into actions.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Insert Menu Item`: `Missing`.
- `Record non-recordable commands`: `Missing`.
- `Action command metadata`: `Missing`.

Implementation notes:
- Automation is absent.

## 0478 - Overwrite A Single Command

Source note: `pages/0478-overwrite-a-single-command.md`

Function group: editing action commands.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Overwrite action step`: `Missing`.
- `Re-record command`: `Missing`.
- `Preserve surrounding steps`: `Missing`.

Implementation notes:
- No Actions panel exists.

## 0479 - Add Commands To An Action

Source note: `pages/0479-add-commands-to-an-action.md`

Function group: extending actions.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Add step to existing action`: `Missing`.
- `Record additional command`: `Missing`.
- `Action step insertion point`: `Missing`.

Implementation notes:
- No action recording model exists.

## 0480 - Rearrange Commands Within An Action

Source note: `pages/0480-rearrange-commands-within-an-action.md`

Function group: action step ordering.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Drag command in action list`: `Missing`.
- `Reorder playback sequence`: `Missing`.
- `Nested action/set management`: `Missing`.

Implementation notes:
- Automation UI is absent.

## 0481 - Record An Action Again

Source note: `pages/0481-record-an-action-again.md`

Function group: re-recording actions.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Re-record action`: `Missing`.
- `Replace action contents`: `Missing`.
- `Action version management`: `Missing`.

Implementation notes:
- No action system exists.

## 0482 - Process A Batch Of Files

Source note: `pages/0482-process-a-batch-of-files.md`

Function group: batch processing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Batch command`: `Missing`.
- `Run action on folder/files`: `Missing`.
- `Destination naming/error options`: `Missing`.

Implementation notes:
- Photoweb operates on one document at a time.

## 0483 - Image Processor Overview

Source note: `pages/0483-image-processor-overview.md`

Function group: Image Processor.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Image Processor command`: `Missing`.
- `Resize/convert many files`: `Missing`.
- `Batch save JPEG/PSD/TIFF`: `Missing`.

Implementation notes:
- No multi-file processor exists.

## 0484 - Convert Files With The Image Processor

Source note: `pages/0484-convert-files-with-the-image-processor.md`

Function group: file conversion batch.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Batch convert files`: `Missing`.
- `Resize during conversion`: `Missing`.
- `Apply actions during conversion`: `Missing`.

Implementation notes:
- Export works only for the current document.

## 0485 - Batch Process Files

Source note: `pages/0485-batch-process-files.md`

Function group: batch command.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Batch source/destination selection`: `Missing`.
- `Run action against files`: `Missing`.
- `Override save/open commands`: `Missing`.

Implementation notes:
- No batch automation exists.

## 0486 - Create A Droplet From An Action

Source note: `pages/0486-create-a-droplet-from-an-action.md`

Function group: droplets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create Droplet`: `Missing`.
- `Drag files onto droplet`: `Missing`.
- `Action-powered standalone processor`: `Missing`.

Implementation notes:
- Not applicable to current browser app architecture.

## 0487 - Batch And Droplet Processing Options

Source note: `pages/0487-batch-and-droplet-processing-options.md`

Function group: batch/droplet options.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `File naming options`: `Missing`.
- `Error handling/logging`: `Missing`.
- `Destination override options`: `Missing`.

Implementation notes:
- Depends on absent batch/droplet systems.

## 0488 - Automation Settings And Presets

Source note: `pages/0488-automation-settings-and-presets.md`

Function group: automation presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Automation preset management`: `Missing`.
- `Save/load batch settings`: `Missing`.
- `Action/droplet settings`: `Missing`.

Implementation notes:
- No automation settings store exists.

## 0489 - Overview Of Actions

Source note: `pages/0489-overview-of-actions.md`

Function group: Actions overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Action sets/actions/commands`: `Missing`.
- `Record/playback`: `Missing`.
- `Button mode`: `Missing`.

Implementation notes:
- History entries are not reusable actions.

## 0490 - Use The Actions Panel

Source note: `pages/0490-use-the-actions-panel.md`

Function group: Actions panel UI.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Actions panel`: `Missing`.
- `Action list and controls`: `Missing`.
- `Panel menu/import/export actions`: `Missing`.

Implementation notes:
- No panel exists in `RightPanelDock`.

## 0491 - Apply Actions In The Actions Panel

Source note: `pages/0491-apply-actions-in-the-actions-panel.md`

Function group: action playback.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Play selected action`: `Missing`.
- `Play single command`: `Missing`.
- `Playback speed/step mode`: `Missing`.

Implementation notes:
- No action playback engine exists.

## 0492 - Save And Export

Source note: `pages/0492-save-and-export.md`

Function group: save/export overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Save Photoweb document`: `Present with differences`.
- `Save As`: `Present with differences`.
- `Quick Export PNG`: `Present with differences`.
- `Export PNG/JPEG/WebP/GIF`: `Present with differences`.
- `PSD/PDF/cloud/video/export artboards`: `Missing`.

Implementation notes:
- Photoweb has practical local save/export, but not Photoshop format breadth.

## 0493 - Save Files

Source note: `pages/0493-save-files.md`

Function group: saving documents.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Save`: `Present with differences`. Photoweb saves a `.pwbdoc`-style document through OPFS persistence.
- `Save As`: `Present with differences`.
- `Photoshop PSD/PSB/TIFF save options`: `Missing`.

Implementation notes:
- Persistence is app-specific, not Adobe Photoshop file format compatible.

## 0494 - Save Your Work

Source note: `pages/0494-save-your-work.md`

Function group: general save workflow.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Manual save`: `Present with differences`.
- `Autosave recovery`: `Present with differences`.
- `Creative Cloud/cloud document save`: `Missing`.

Implementation notes:
- Autosave recovery banner is implemented in `App.tsx`.

## 0495 - Save Large Documents

Source note: `pages/0495-save-large-documents.md`

Function group: large document saving.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `PSB/Large Document Format`: `Missing`.
- `Large format warnings/options`: `Missing`.
- `Huge canvas file handling controls`: `Missing`.

Implementation notes:
- Photoweb does not implement Photoshop large-document file formats.

## 0496 - Revert To Legacy Save As Options

Source note: `pages/0496-revert-to-legacy-save-as-options.md`

Function group: legacy Save As preference.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Legacy Save As preference`: `Missing`.
- `macOS Save a Copy behavior`: `Missing`.
- `Preference-controlled save UI`: `Missing`.

Implementation notes:
- Photoweb has a simpler save dialog.

## 0497 - File Saving Properties And Preferences

Source note: `pages/0497-file-saving-properties-and-preferences.md`

Function group: save preferences.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Autosave behavior`: `Present with differences`.
- `File compatibility/image preview preferences`: `Missing`.
- `Save location/version compatibility preferences`: `Missing`.

Implementation notes:
- No central Preferences dialog exists.

## 0498 - Mac OS Image Preview Options

Source note: `pages/0498-mac-os-image-preview-options.md`

Function group: macOS image preview save options.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `macOS Photoshop preview resources`: `Not applicable`.
- `Platform-specific preview save options`: `Missing`.
- `Finder thumbnail/resource fork behavior`: `Not applicable`.

Implementation notes:
- Browser export does not expose these macOS-specific save options.

## 0498 - macOS Image Preview Options

Source note: `pages/0498-macos-image-preview-options.md`

Function group: macOS image preview save options duplicate source note.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `macOS preview compatibility`: `Not applicable`.
- `Preview preference controls`: `Missing`.
- `Photoshop platform save behavior`: `Not applicable`.

Implementation notes:
- Duplicate source note; Photoweb has no platform-specific preview settings.

## 0499 - Common Questions On Photoshop Cloud Documents

Source note: `pages/0499-common-questions-on-photoshop-cloud-documents.md`

Function group: cloud document FAQ.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Cloud documents`: `Missing`.
- `Sync/versioning/offline cloud behavior`: `Missing`.
- `Adobe account storage`: `Missing`.

Implementation notes:
- Photoweb uses local browser storage/file export.

## 0500 - Save As Photoshop PDF

Source note: `pages/0500-save-as-photoshop-pdf.md`

Function group: Photoshop PDF export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save As Photoshop PDF`: `Missing`.
- `PDF options/compression/security`: `Missing`.
- `Preserve Photoshop editing capabilities`: `Missing`.

Implementation notes:
- PDF export is not implemented.

## 0501 - Save For Web

Source note: `pages/0501-save-for-web.md`

Function group: Save for Web.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Export web image formats`: `Present with differences`.
- `Quality control for JPEG/WebP`: `Present with differences`.
- `Legacy Save for Web preview/slices/metadata/color table`: `Missing`.

Implementation notes:
- `ExportDialog` covers modern simple export, not Photoshop Save for Web.

## 0502 - Export Files To Different Formats

Source note: `pages/0502-export-files-to-different-formats.md`

Function group: exporting formats.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `PNG/JPEG/WebP/GIF export`: `Present with differences`.
- `Quick Export as PNG`: `Present with differences`.
- `PSD/TIFF/PDF/SVG/video/format-specific options`: `Missing`.

Implementation notes:
- Export uses browser canvas encoding.

## 0503 - Video And Animation Export Formats

Source note: `pages/0503-video-and-animation-export-formats.md`

Function group: video/animation export formats.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Render Video`: `Missing`.
- `Image sequence export`: `Missing`.
- `Animated GIF/video format options`: `Missing`.

Implementation notes:
- No timeline/animation model exists.

## 0504 - Enhance Animation Frames

Source note: `pages/0504-enhance-animation-frames.md`

Function group: animation frame enhancement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Optimize/enhance frame animation`: `Missing`.
- `Frame cleanup or enhancement`: `Missing`.
- `Animation-specific filters`: `Missing`.

Implementation notes:
- Animation frames are absent.

## 0505 - Flatten Frames Into Layers

Source note: `pages/0505-flatten-frames-into-layers.md`

Function group: converting animation frames to layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Flatten frames into layers`: `Missing`.
- `One layer per frame`: `Missing`.
- `Preserve frame order/timing`: `Missing`.

Implementation notes:
- No frame animation document structure exists.

## Summary

High-overlap areas:
- Raster filters are a useful Photoweb strength: blur, sharpen, noise, distort, stylize, render, High Pass, Unsharp Mask, and Smart Sharpen exist in simplified form.
- Transform Warp exists with mesh/preset behavior.
- Rulers, grid, snap, save, autosave recovery, Save As, Quick Export PNG, and PNG/JPEG/WebP/GIF export are implemented in practical web-app form.

Major missing areas:
- Brush-based Blur/Sharpen tools, Lens Blur, Liquify, Puppet Warp, Split Warp, cylindrical transform, Sky Replacement, Neural Filters, and generative filters are missing.
- Guides, Smart Guides, measurement scales, measurement logs, scale markers, and scientific measurement tools are missing.
- Video layers, frame animation, timeline animation, keyframes, and animation/video export are missing.
- Actions, automation, batch processing, Image Processor, droplets, and action presets are missing.
- Photoshop-specific file formats and save options such as PSD/PSB/PDF/TIFF/cloud documents/platform preview settings are missing.

Recommended implementation priorities:
- Add draggable guides and guide preferences before measurement tooling.
- Improve export metadata/format support only after deciding whether Photoweb should remain browser-canvas oriented or support Photoshop-compatible file formats.
- Treat animation/timeline and automation/actions as large independent product tracks.
- Expand filters incrementally with Lens Blur or Liquify only if brush-style pixel editors are prioritized.
