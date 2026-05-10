# Photoweb vs Photoshop Notes: Function Comparison 0111-0210

Scope: generated Photoshop study notes `0111` through `0210`.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes print/product theory more than an editor function.

Relevant Photoweb code areas:
- App shell, shortcuts, dialogs, file input, transforms: `src/App.tsx`
- Menus: `src/components/layout/MenuBar.tsx`
- Canvas and overlays: `src/components/Canvas/Viewport.tsx`, `src/components/Canvas/FreeTransformOverlay.tsx`, `src/components/Canvas/WarpOverlay.tsx`
- Crop and transforms: `src/tools/crop.ts`, `src/core/imageTransforms.ts`, `src/hooks/useFreeEdit.ts`
- Selection tools and state: `src/store/selectionSlice.ts`, `src/tools/marquee.ts`, `src/tools/lasso.ts`, `src/tools/magicWand.ts`, `src/tools/quickSelection.ts`
- Selection refinement: `src/components/Dialogs/RefineEdgeDialog.tsx`
- Layers and layer model: `src/store/layersSlice.ts`, `src/core/Layer.ts`, `src/components/Panels/LayersPanel.tsx`
- Image sizing/canvas sizing/trim dialogs: `src/components/Dialogs/ImageSizeDialog.tsx`, `src/components/Dialogs/CanvasSizeDialog.tsx`, `src/components/Dialogs/TrimDialog.tsx`

## 0111 - Set A Global Lighting Angle For All Layers

Source note: `pages/0111-set-a-global-lighting-angle-for-all-layers.md`

Function group: shared lighting angle for layer effects.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Global lighting angle`: `Missing`. Photoweb has no global light setting.
- `Use global light in layer effects`: `Missing`. Layer effects are not implemented as usable UI/rendered effects.
- `Synchronize shadows and bevels`: `Missing`.

Implementation notes:
- The layer model has an `effects` field, but layer-style rendering and global lighting are not wired.

## 0112 - Scale Layer Effects

Source note: `pages/0112-scale-layer-effects.md`

Function group: layer effect scaling.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Scale effect distances/sizes`: `Missing`.
- `Scale effects during image resize`: `Missing`.
- `Layer Style > Scale Effects command`: `Missing`.

Implementation notes:
- Photoweb can resize images/layers, but there are no active layer effects to scale.

## 0113 - Remove Layer Effects

Source note: `pages/0113-remove-layer-effects.md`

Function group: removing layer styles/effects.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Clear all layer effects`: `Missing`.
- `Remove individual effect`: `Missing`.
- `Layers panel effect controls`: `Missing`.

Implementation notes:
- Layer visibility and masks exist, but effects are not surfaced.

## 0114 - Work With Layer Styles

Source note: `pages/0114-work-with-layer-styles.md`

Function group: layer style editing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Layer Style dialog`: `Missing`.
- `Preview and edit style parameters`: `Missing`.
- `Save or reuse styles`: `Missing`.

Implementation notes:
- No Photoshop-style layer style workflow exists.

## 0115 - Convert Layer Styles To Image Layers

Source note: `pages/0115-convert-layer-styles-to-image-layers.md`

Function group: rasterizing layer effects into separate layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create layers from effects`: `Missing`.
- `Preserve visual effect as pixels`: `Missing`.
- `Edit converted effect layers`: `Missing`.

Implementation notes:
- This depends on implemented layer styles, which are currently absent.

## 0116 - Smart Objects

Source note: `pages/0116-smart-objects.md`

Function group: Smart Object feature family.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Smart Object layer type`: `Missing`. Photoweb has raster, type, shape, fill, adjustment, and group kind types, but no Smart Object kind.
- `Non-destructive embedded source`: `Missing`.
- `Linked external source`: `Missing`.
- `Smart Filters and replace/edit contents`: `Missing`.

Implementation notes:
- Imported files become ordinary raster layers.

## 0117 - Smart Objects Overview And Benefits

Source note: `pages/0117-smart-objects-overview-and-benefits.md`

Function group: Smart Object benefits and behavior.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Non-destructive transforms`: `Partial`. Photoweb has transform overlays, but transformed raster pixels are not Smart Object source-preserving transforms.
- `Reusable source content`: `Missing`.
- `Linked/embedded source management`: `Missing`.
- `Smart Filter stack`: `Missing`.

Implementation notes:
- Photoweb has useful local transforms, but not Smart Object architecture.

## 0118 - Create Embedded Smart Objects

Source note: `pages/0118-create-embedded-smart-objects.md`

Function group: embedded Smart Object creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Convert layer to Smart Object`: `Missing`.
- `Place Embedded`: `Missing`.
- `Embed source data inside document`: `Missing`.

Implementation notes:
- File import creates normal image layers only.

## 0119 - Create Linked Smart Objects

Source note: `pages/0119-create-linked-smart-objects.md`

Function group: linked Smart Object creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Place Linked`: `Missing`.
- `Track external file path`: `Missing`.
- `Warn for missing/modified links`: `Missing`.

Implementation notes:
- Browser file inputs do not create persistent linked asset references in Photoweb.

## 0120 - Update Linked Smart Objects

Source note: `pages/0120-update-linked-smart-objects.md`

Function group: updating linked Smart Object contents.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Update modified link`: `Missing`.
- `Relink missing source`: `Missing`.
- `Auto-refresh linked content`: `Missing`.

Implementation notes:
- No linked layer source model exists.

## 0121 - View Linked Smart Object Properties

Source note: `pages/0121-view-linked-smart-object-properties.md`

Function group: linked asset properties.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Show source path/file info`: `Missing`.
- `Show link status`: `Missing`.
- `Properties panel metadata`: `Missing`.

Implementation notes:
- Layers store names and pixel content, not external link metadata.

## 0122 - Embed Linked Smart Objects

Source note: `pages/0122-embed-linked-smart-objects.md`

Function group: converting linked Smart Objects to embedded.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Embed linked source`: `Missing`.
- `Remove dependency on external file`: `Missing`.
- `Preserve Smart Object editability`: `Missing`.

Implementation notes:
- There are no linked Smart Objects to embed.

## 0123 - Package And Locate Linked Smart Objects

Source note: `pages/0123-package-and-locate-linked-smart-objects.md`

Function group: collecting and locating linked assets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Package document with linked assets`: `Missing`.
- `Reveal linked file location`: `Missing`.
- `Collect missing links`: `Missing`.

Implementation notes:
- Photoweb has no document package/export bundle workflow.

## 0124 - Convert Embedded Smart Objects To Linked

Source note: `pages/0124-convert-embedded-smart-objects-to-linked.md`

Function group: converting embedded Smart Objects to linked assets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Convert to Linked`: `Missing`.
- `Choose external file target`: `Missing`.
- `Maintain editable source relationship`: `Missing`.

Implementation notes:
- No Smart Object conversion commands exist.

## 0125 - Filter The Layers Panel By Smart Objects

Source note: `pages/0125-filter-the-layers-panel-by-smart-objects.md`

Function group: layer filtering by Smart Object kind.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Filter Layers panel`: `Missing`. Photoweb does not have layer-kind filtering UI.
- `Smart Object filter criterion`: `Missing`.
- `Show only matching layers`: `Missing`.

Implementation notes:
- Layers panel is a direct stack list with controls, not a searchable/filterable panel.

## 0126 - Duplicate An Embedded Smart Object

Source note: `pages/0126-duplicate-an-embedded-smart-object.md`

Function group: Smart Object duplication semantics.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Duplicate Smart Object sharing same source`: `Missing`.
- `New Smart Object via Copy with independent source`: `Missing`.
- `Source instance relationship`: `Missing`.

Implementation notes:
- Layer duplication/copy behavior does not model shared source objects.

## 0127 - Edit The Contents Of A Smart Object

Source note: `pages/0127-edit-the-contents-of-a-smart-object.md`

Function group: editing Smart Object source content.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open Smart Object contents`: `Missing`.
- `Edit source in separate document`: `Missing`.
- `Save source updates back to parent`: `Missing`.

Implementation notes:
- Photoweb has one active document and no nested document editing.

## 0128 - Replace The Contents Of A Smart Object

Source note: `pages/0128-replace-the-contents-of-a-smart-object.md`

Function group: replacing Smart Object source.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Replace Contents`: `Missing`.
- `Preserve transforms/effects after replacement`: `Missing`.
- `Relink to different file`: `Missing`.

Implementation notes:
- Normal raster layers can be deleted/imported manually, but that is not Smart Object replacement.

## 0129 - Convert Smart Objects To Layers

Source note: `pages/0129-convert-smart-objects-to-layers.md`

Function group: expanding Smart Object contents into layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Convert Smart Object to Layers`: `Missing`.
- `Expose embedded layer structure`: `Missing`.
- `Preserve visual placement`: `Missing`.

Implementation notes:
- No Smart Object source structure exists to expand.

## 0130 - Rasterize Smart Objects

Source note: `pages/0130-rasterize-smart-objects.md`

Function group: rasterizing Smart Object layers.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Rasterize Smart Object`: `Missing`.
- `Commit Smart Filters/transforms to pixels`: `Missing`.
- `Remove source editability`: `Missing`.

Implementation notes:
- Imported image layers are already raster layers.

## 0131 - Export The Contents Of An Embedded Smart Object

Source note: `pages/0131-export-the-contents-of-an-embedded-smart-object.md`

Function group: exporting embedded Smart Object source.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Export embedded source`: `Missing`.
- `Preserve original asset format`: `Missing`.
- `Choose destination file`: `Missing`.

Implementation notes:
- Photoweb can export the composed image, not embedded layer source assets.

## 0132 - Reset Smart Object Transforms

Source note: `pages/0132-reset-smart-object-transforms.md`

Function group: resetting Smart Object transform metadata.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reset Smart Object transform`: `Missing`.
- `Return to original source scale/rotation`: `Missing`.
- `Keep source content intact`: `Missing`.

Implementation notes:
- Photoweb transforms raster content directly or through temporary overlay state, not persistent Smart Object transform metadata.

## 0133 - Create Layer Compositions

Source note: `pages/0133-create-layer-compositions.md`

Function group: layer comps.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save layer visibility/position/style states`: `Missing`.
- `Switch between layer comps`: `Missing`.
- `Update/export layer comps`: `Missing`.

Implementation notes:
- History snapshots are not equivalent to named Layer Comps.

## 0134 - Align Layers

Source note: `pages/0134-align-layers.md`

Function group: layer alignment.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Align selected layers to edges/centers`: `Missing`.
- `Align to canvas or selection`: `Missing`.
- `Multi-layer alignment controls`: `Missing`.

Implementation notes:
- Photoweb primarily tracks one active layer and has no alignment command set.

## 0135 - Auto-Align Image Layers

Source note: `pages/0135-auto-align-image-layers.md`

Function group: automatic layer alignment.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Analyze image content for alignment`: `Missing`.
- `Auto, perspective, cylindrical, spherical alignment`: `Missing`.
- `Panorama/source stack alignment`: `Missing`.

Implementation notes:
- No computer-vision layer alignment pipeline exists.

## 0136 - Distribute Layers

Source note: `pages/0136-distribute-layers.md`

Function group: layer distribution.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Distribute selected layers by spacing`: `Missing`.
- `Distribute centers/edges`: `Missing`.
- `Multi-layer selection prerequisite`: `Missing`.

Implementation notes:
- This depends on multi-select and layout commands that are not present.

## 0137 - Layout And Design Tools

Source note: `pages/0137-layout-and-design-tools.md`

Function group: layout aids for design work.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Rulers`: `Present with differences`. Photoweb can show rulers.
- `Grid and snapping`: `Present with differences`. Grid and snap toggles exist.
- `Guides/smart guides`: `Missing`. Photoweb does not provide draggable guide management or smart guide alignment.
- `Artboards/frames`: `Missing`.

Implementation notes:
- View toggles are in App/MenuBar; overlay rendering is in `Viewport`.

## 0138 - Get Started With Artboards

Source note: `pages/0138-get-started-with-artboards.md`

Function group: artboards.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Artboard layer/container`: `Missing`.
- `Multiple canvases in one document`: `Missing`.
- `Export artboards separately`: `Missing`.

Implementation notes:
- Photoweb has one canvas per document.

## 0139 - Artboard Properties And Behaviors

Source note: `pages/0139-artboard-properties-and-behaviors.md`

Function group: artboard properties.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Artboard size/position/background`: `Missing`.
- `Artboard nesting/clipping behavior`: `Missing`.
- `Artboard-specific export`: `Missing`.

Implementation notes:
- Canvas Size changes the whole document, not per-artboard bounds.

## 0140 - Create Artboard Documents

Source note: `pages/0140-create-artboard-documents.md`

Function group: new documents with artboards.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `New document with artboard enabled`: `Missing`.
- `Device/template artboard presets`: `Missing`.
- `Initial artboard layer`: `Missing`.

Implementation notes:
- New Document creates a single normal canvas.

## 0141 - Add Artboards To The Current Document

Source note: `pages/0141-add-artboards-to-the-current-document.md`

Function group: adding artboards after document creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Artboard tool`: `Missing`.
- `Add artboard beside existing artboard`: `Missing`.
- `Convert layer group to artboard`: `Missing`.

Implementation notes:
- No artboard tool or layer type exists.

## 0142 - Draw Frames

Source note: `pages/0142-draw-frames.md`

Function group: Frame tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Draw rectangular/elliptical frame`: `Missing`.
- `Frame placeholder layer`: `Missing`.
- `Mask-like clipping frame behavior`: `Missing`.

Implementation notes:
- Shape tools can draw rectangles/circles, but they are not Photoshop Frame layers.

## 0143 - Convert Shapes Or Text To Frames

Source note: `pages/0143-convert-shapes-or-text-to-frames.md`

Function group: converting existing content to frames.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Convert shape to frame`: `Missing`.
- `Convert text to frame`: `Missing`.
- `Preserve object bounds as placeholder`: `Missing`.

Implementation notes:
- Type and shape layers/tools exist, but frame conversion does not.

## 0144 - Place An Image Into A Frame

Source note: `pages/0144-place-an-image-into-a-frame.md`

Function group: frame image placement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Drop/place image into frame`: `Missing`.
- `Auto-fit content to frame`: `Missing`.
- `Swap frame contents`: `Missing`.

Implementation notes:
- Imported images become normal layers, not framed/clipped contents.

## 0145 - Select A Frame And Its Content

Source note: `pages/0145-select-a-frame-and-its-content.md`

Function group: frame and content selection.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select frame container`: `Missing`.
- `Select image inside frame separately`: `Missing`.
- `Transform frame vs frame content`: `Missing`.

Implementation notes:
- Photoweb does not model frame/container relationships.

## 0146 - Add A Stroke To A Frame

Source note: `pages/0146-add-a-stroke-to-a-frame.md`

Function group: frame stroke styling.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Frame stroke controls`: `Missing`.
- `Stroke color/width/alignment`: `Missing`.
- `Frame Properties panel`: `Missing`.

Implementation notes:
- Shape stroke UI is limited and separate from frame styling.

## 0147 - Crop, Resize, And Transform

Source note: `pages/0147-crop-resize-and-transform.md`

Function group: crop, resize, and transform overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Crop`: `Present with differences`. Photoweb has a crop tool with crop rectangle and overlay.
- `Image resize`: `Present with differences`. Image Size dialog supports pixel dimensions and resampling.
- `Canvas resize`: `Present with differences`. Canvas Size dialog supports anchor and extension color.
- `Transform`: `Present with differences`. Free Transform and Warp overlays exist.
- `Photoshop advanced modes`: `Partial`. Perspective crop, content-aware scale, and Smart Object-preserving transforms are absent.

Implementation notes:
- This is a strong local-editing overlap area.

## 0148 - Resize And Adjust Resolution

Source note: `pages/0148-resize-and-adjust-resolution.md`

Function group: image size and resolution changes.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Change pixel dimensions`: `Present with differences`.
- `Constrain proportions`: `Present with differences`.
- `Choose resampling method`: `Partial`. Nearest, bilinear, and bicubic are available.
- `Print resolution metadata`: `Missing`. Photoweb does not store/edit DPI/PPI metadata.

Implementation notes:
- Image Size is pixel-focused, not print-resolution focused.

## 0149 - Printed Image Resolution

Source note: `pages/0149-printed-image-resolution.md`

Function group: print resolution concept.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `PPI explanation`: `Not applicable`. This is educational guidance.
- `Print size calculation`: `Missing`. Photoweb does not calculate print dimensions from PPI.
- `Printer/output workflow`: `Missing`.

Implementation notes:
- Photoweb is screen/canvas editing oriented.

## 0150 - Set Image Size And Resolution

Source note: `pages/0150-set-image-size-and-resolution.md`

Function group: Image Size dialog.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Width and height fields`: `Present with differences`.
- `Constrain proportions`: `Present with differences`.
- `Resample toggle/method`: `Partial`. Method exists; Photoshop's full resample set and non-resample resolution workflow do not.
- `Resolution/unit fields`: `Missing`.

Implementation notes:
- See `ImageSizeDialog`.

## 0151 - Resample Option In The Image Size Dialog

Source note: `pages/0151-resample-option-in-the-image-size-dialog.md`

Function group: resampling controls.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Resample method selection`: `Present with differences`. Photoweb offers nearest, bilinear, and bicubic.
- `Disable resampling while changing print size`: `Missing`.
- `Photoshop named algorithms`: `Missing`. Preserve Details, Bicubic Smoother/Sharper, and Automatic are not represented.

Implementation notes:
- Browser canvas smoothing provides simpler resampling behavior.

## 0152 - Monitor Resolution And Image Display Size

Source note: `pages/0152-monitor-resolution-and-image-display-size.md`

Function group: display size and monitor resolution.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Zoom/display size`: `Present with differences`. Photoweb has zoom and viewport fitting.
- `Print Size view`: `Missing`.
- `Monitor resolution preference`: `Missing`.

Implementation notes:
- Photoweb uses browser/device display behavior rather than Photoshop print-size calibration.

## 0153 - File Size

Source note: `pages/0153-file-size.md`

Function group: image file size concepts.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Document pixel dimensions affect size`: `Present with differences`. Photoweb's canvas dimensions determine pixel data size.
- `Estimate compressed output size`: `Partial`. Export workflows exist, but there is no rich Photoshop-style file size explanation or estimate panel.
- `Bit depth/color mode effects`: `Missing`.

Implementation notes:
- Photoweb export is simpler and browser-driven.

## 0154 - Printer Resolution

Source note: `pages/0154-printer-resolution.md`

Function group: printer resolution concepts.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Printer DPI guidance`: `Not applicable`.
- `Halftone/screen frequency guidance`: `Missing`.
- `Print setup integration`: `Missing`.

Implementation notes:
- Photoweb does not include print production tooling.

## 0155 - Resolution Specs For Printing Images

Source note: `pages/0155-resolution-specs-for-printing-images.md`

Function group: print-resolution planning.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Recommended PPI calculation`: `Not applicable`.
- `Print output requirements`: `Missing`.
- `Resolution warnings`: `Missing`.

Implementation notes:
- This is outside current Photoweb scope.

## 0156 - Preserve Visual Content When Scaling Images

Source note: `pages/0156-preserve-visual-content-when-scaling-images.md`

Function group: content-aware scaling.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Content-Aware Scale`: `Missing`.
- `Protect important subjects while scaling`: `Missing`.
- `Skin tone protection`: `Missing`.

Implementation notes:
- Photoweb scales pixels uniformly; no seam-carving/content-aware resize engine exists.

## 0157 - Specify Content To Protect When Scaling

Source note: `pages/0157-specify-content-to-protect-when-scaling.md`

Function group: protected areas for content-aware scale.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Protect alpha channel/selection`: `Missing`.
- `Choose protected content in Content-Aware Scale`: `Missing`.
- `Preserve selected subject during scaling`: `Missing`.

Implementation notes:
- Saved selections exist in the store, but not as content-aware scale protection maps.

## 0158 - Resize Images

Source note: `pages/0158-resize-images.md`

Function group: image resizing.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Resize whole image`: `Present with differences`.
- `Constrain proportions`: `Present with differences`.
- `Select interpolation/resample`: `Partial`.
- `Resolution/print workflows`: `Missing`.

Implementation notes:
- Implemented in `ImageSizeDialog`, `documentSlice`, and `imageTransforms`.

## 0159 - Resampling Options In Photoshop

Source note: `pages/0159-resampling-options-in-photoshop.md`

Function group: resampling algorithm catalog.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Nearest Neighbor`: `Present with differences`.
- `Bilinear/Bicubic`: `Present with differences`.
- `Preserve Details and specialized Photoshop algorithms`: `Missing`.
- `Automatic algorithm choice`: `Missing`.

Implementation notes:
- Photoweb maps resampling to browser canvas smoothing quality.

## 0160 - Change The Pixel Dimensions Of Images

Source note: `pages/0160-change-the-pixel-dimensions-of-images.md`

Function group: pixel-dimension editing.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Set width/height in pixels`: `Present with differences`.
- `Maintain aspect ratio`: `Present with differences`.
- `Apply resample method`: `Partial`.
- `Units beyond pixels`: `Missing`.

Implementation notes:
- Pixel dimensions are the main supported sizing model.

## 0161 - Change Print Dimensions And Resolution

Source note: `pages/0161-change-print-dimensions-and-resolution.md`

Function group: print dimensions and resolution.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Print width/height units`: `Missing`.
- `Resolution/PPI field`: `Missing`.
- `Change print size without resampling`: `Missing`.

Implementation notes:
- Photoweb currently does not store print-resolution metadata.

## 0162 - Manage Image File Size

Source note: `pages/0162-manage-image-file-size.md`

Function group: file-size management.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Reduce pixel dimensions`: `Present with differences`. Image Size can reduce canvas pixels.
- `Export/compression choice`: `Partial`. Export exists, but Photoshop's mature export/compression previews are not fully matched.
- `Bit depth/color profile control`: `Missing`.

Implementation notes:
- File size is managed indirectly through resizing and export.

## 0163 - Resizing Parameters In Photoshop

Source note: `pages/0163-resizing-parameters-in-photoshop.md`

Function group: width, height, resolution, and resampling parameters.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Width/height`: `Present with differences`.
- `Aspect constraint`: `Present with differences`.
- `Resample method`: `Partial`.
- `Resolution and unit parameters`: `Missing`.

Implementation notes:
- Photoweb implements the screen-pixel subset.

## 0164 - Crop And Straighten

Source note: `pages/0164-crop-and-straighten.md`

Function group: crop and straighten overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Crop image`: `Present with differences`.
- `Crop overlay and handles`: `Present with differences`.
- `Straighten tilted photo`: `Missing` or placeholder-level. Crop options mention straighten, but no complete straighten workflow is implemented.
- `Perspective/content-aware crop`: `Missing`.

Implementation notes:
- Core crop is implemented in `src/tools/crop.ts`.

## 0165 - Resize The Canvas Using The Crop Tool

Source note: `pages/0165-resize-the-canvas-using-the-crop-tool.md`

Function group: using crop to change canvas bounds.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Crop inside existing canvas`: `Present with differences`.
- `Extend canvas using crop bounds`: `Partial`. Crop rectangle behavior can manipulate bounds, but Canvas Size is the clearer supported canvas extension path.
- `Fill new canvas area`: `Partial`. Canvas Size offers extension color; crop does not provide Photoshop's content-aware crop fill.

Implementation notes:
- Use Canvas Size for reliable canvas extension behavior in Photoweb.

## 0166 - Crop Photos

Source note: `pages/0166-crop-photos.md`

Function group: photo cropping.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Activate Crop tool`: `Present with differences`.
- `Drag crop bounds/handles`: `Present with differences`.
- `Commit/cancel crop`: `Present with differences`. Enter commits and Escape cancels.
- `Advanced Photoshop crop features`: `Partial`.

Implementation notes:
- Crop UI includes handles and overlay rendering.

## 0167 - Crop Tool Options

Source note: `pages/0167-crop-tool-options.md`

Function group: crop options.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Aspect ratio presets`: `Present with differences`. Crop options include free, 1:1, 4:3, 16:9, 3:2, 5:4, and custom.
- `Overlay choices`: `Partial`. Rule of thirds and overlay cycling exist; full Photoshop overlay behavior is not complete.
- `Delete cropped pixels`: `Partial`. Option state exists, but Smart Object/non-destructive crop parity is absent.
- `Straighten/content-aware`: `Missing` or placeholder-level.

Implementation notes:
- Crop option data is in `src/tools/crop.ts` and UI in `OptionsBar`.

## 0168 - Apply Content-Aware Fill While Cropping Images

Source note: `pages/0168-apply-content-aware-fill-while-cropping-images.md`

Function group: content-aware crop fill.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Content-Aware crop option`: `Missing`.
- `Generate pixels in expanded crop area`: `Missing`.
- `AI/algorithmic fill for transparent corners`: `Missing`.

Implementation notes:
- Photoweb can extend canvas with solid/transparent fill, not synthesize image content.

## 0169 - Straighten Tilted Photos

Source note: `pages/0169-straighten-tilted-photos.md`

Function group: photo straightening.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Arbitrary image rotation`: `Missing`. The Image Rotation menu supports fixed 90/180 degree rotations; arbitrary rotation is disabled.
- `Straighten tool inside Crop`: `Missing` or placeholder-level.
- `Auto crop after straightening`: `Missing`.

Implementation notes:
- Transform can rotate layers, but the document-level straighten workflow is not complete.

## 0170 - Transform Perspective While Cropping

Source note: `pages/0170-transform-perspective-while-cropping.md`

Function group: perspective crop.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Perspective Crop tool`: `Missing`.
- `Drag independent corner perspective grid`: `Missing`.
- `Correct keystone/perspective distortion during crop`: `Missing`.

Implementation notes:
- Free Transform/Warp are layer-level tools, not a perspective crop workflow.

## 0171 - Transform, Manipulate, And Reshape

Source note: `pages/0171-transform-manipulate-and-reshape.md`

Function group: transform feature overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Free Transform`: `Present with differences`.
- `Warp`: `Present with differences`.
- `Move/scale/rotate selected pixels`: `Present with differences`. Free Edit supports floating selected pixels.
- `Perspective/distort/puppet/content-aware transforms`: `Missing`.

Implementation notes:
- Photoweb covers core canvas/layer transforms but not the full Photoshop transform family.

## 0172 - Transformation Options In Photoshop

Source note: `pages/0172-transformation-options-in-photoshop.md`

Function group: transform option controls.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Scale/rotate/skew controls`: `Partial`. Free Transform state includes scale/rotation/skew-like controls, but no full numeric transform options bar.
- `Reference point and interpolation options`: `Missing`.
- `Warp presets`: `Present with differences`. Warp preset support exists in transform utilities, but UI parity is limited.

Implementation notes:
- Transform UI is overlay-first, not Photoshop's full options-bar model.

## 0173 - Rotate Or Flip Images

Source note: `pages/0173-rotate-or-flip-images.md`

Function group: document rotation and flipping.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Rotate 90/180 degrees`: `Present with differences`.
- `Flip horizontal/vertical`: `Present with differences`.
- `Arbitrary rotation`: `Missing`. Menu item is disabled.
- `Layer vs canvas distinction`: `Partial`. Canvas rotation is supported; layer transform rotation is separate through Free Transform.

Implementation notes:
- Document-level operations are in `documentSlice` and `imageTransforms`.

## 0174 - Adjust Scale, Rotation, And Perspective

Source note: `pages/0174-adjust-scale-rotation-and-perspective.md`

Function group: layer/object transform adjustments.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Scale`: `Present with differences`.
- `Rotate`: `Present with differences`.
- `Skew/warp`: `Partial`.
- `Perspective/distort`: `Missing`.
- `Numeric precision fields`: `Missing`.

Implementation notes:
- Free Transform and Warp provide practical manipulation, but not every Photoshop transform command.

## 0175 - Duplicate Objects As You Transform

Source note: `pages/0175-duplicate-objects-as-you-transform.md`

Function group: transform-copy behavior.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Alt/Option-drag transform duplicate`: `Missing`.
- `Repeat transform and duplicate`: `Missing`.
- `Duplicate transformed selected pixels/layers`: `Missing`.

Implementation notes:
- Photoweb can copy selection/layer content in other ways, but not Photoshop's transform-copy workflow.

## 0176 - Apply Transformations

Source note: `pages/0176-apply-transformations.md`

Function group: committing/canceling transforms.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Commit transform`: `Present with differences`. Transform overlays can apply changes.
- `Cancel transform`: `Present with differences`. Transform modes support cancel/reset behavior.
- `Transform warning/apply prompt`: `Missing`.
- `Non-destructive Smart Object transform`: `Missing`.

Implementation notes:
- The core apply/cancel interaction exists for local transforms.

## 0177 - Move Reference Point For Transformations

Source note: `pages/0177-move-reference-point-for-transformations.md`

Function group: transform reference point.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Visible reference point`: `Missing`.
- `Move pivot/origin`: `Missing`.
- `Use reference point for rotation/scaling`: `Missing`.

Implementation notes:
- Photoweb transforms around computed bounds/centers rather than a user-moved reference point.

## 0178 - Rotate Objects

Source note: `pages/0178-rotate-objects.md`

Function group: object/layer rotation.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Rotate active layer/object`: `Present with differences`.
- `Rotate selected pixels`: `Present with differences` through Free Edit.
- `Precise angle entry`: `Missing`.
- `Reference-point rotation`: `Missing`.

Implementation notes:
- Rotation exists as overlay manipulation, not a full numeric Photoshop command set.

## 0179 - Make Selections

Source note: `pages/0179-make-selections.md`

Function group: selection feature overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Rectangular/elliptical selections`: `Present with differences`.
- `Lasso/polygonal selections`: `Present with differences`.
- `Magic Wand and Quick Selection`: `Present with differences`.
- `Selection operations add/subtract`: `Present with differences`.
- `AI selections/object/subject people`: `Missing`.

Implementation notes:
- Selection primitives are a strong area, but AI selection tools are not present.

## 0180 - Get Started With Selections

Source note: `pages/0180-get-started-with-selections.md`

Function group: basic selection workflow.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Create a selection`: `Present with differences`.
- `Deselect/invert`: `Present with differences`.
- `Move/copy/delete selected pixels`: `Partial`. Photoweb supports selected-pixel movement/free edit and copy/cut style actions, but not every Photoshop paste variant.
- `Refine selection`: `Partial`.

Implementation notes:
- Selection state is centralized in `selectionSlice` and rendered in `Viewport`.

## 0181 - Selection Tools Overview

Source note: `pages/0181-selection-tools-overview.md`

Function group: selection tool catalog.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Marquee tools`: `Present with differences`.
- `Lasso and Polygonal Lasso`: `Present with differences`.
- `Magic Wand and Quick Selection`: `Present with differences`.
- `Object Selection, Select Subject, Select People`: `Missing`.
- `Magnetic Lasso/Selection Brush`: `Missing`.

Implementation notes:
- Photoweb covers classic manual/color-based selection, not modern AI/object-aware tools.

## 0182 - Use The Object Selection Tool

Source note: `pages/0182-use-the-object-selection-tool.md`

Function group: Object Selection tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Object Selection rectangle/lasso mode`: `Missing`.
- `AI object detection`: `Missing`.
- `Object Finder/hover highlights`: `Missing`.

Implementation notes:
- Quick Selection approximates color/region growth, not object-aware detection.

## 0183 - Automatic And Color-Based Selections

Source note: `pages/0183-automatic-and-color-based-selections.md`

Function group: automatic and color-based selection methods.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Magic Wand color selection`: `Present with differences`.
- `Quick Selection brush`: `Present with differences`.
- `Color Range command`: `Missing`. Menu item is disabled.
- `Select Subject/Object Finder`: `Missing`.

Implementation notes:
- Color/region sampling exists in tools; command-level Color Range and AI selection do not.

## 0184 - Improve Select Subject And Remove Background Results

Source note: `pages/0184-improve-select-subject-and-remove-background-results.md`

Function group: improving AI subject/background workflows.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select Subject`: `Missing`.
- `Remove Background`: `Missing`.
- `Cloud/device AI result options`: `Missing`.
- `Manual refinement after AI result`: `Partial`. Select and Mask exists, but without AI subject/background starting point.

Implementation notes:
- Photoweb has manual selection/refinement, not subject detection.

## 0185 - Make Precise Selections Using Select People

Source note: `pages/0185-make-precise-selections-using-select-people.md`

Function group: AI people/body-part selection.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Detect people`: `Missing`.
- `Select face/hair/body/clothing regions`: `Missing`.
- `People-specific mask refinement`: `Missing`.

Implementation notes:
- No semantic segmentation model exists.

## 0186 - Remove Objects With Delete And Fill Selection

Source note: `pages/0186-remove-objects-with-delete-and-fill-selection.md`

Function group: delete and fill selected objects.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Delete selected pixels`: `Present with differences`. Selection deletion/cut behavior exists in viewport context actions.
- `Content-aware/object-aware fill after delete`: `Missing`.
- `One-step Delete and Fill Selection command`: `Missing`.

Implementation notes:
- Photoweb can remove pixels, but it cannot synthesize replacement background.

## 0187 - Improve Hair Selections With The Refine Hair Tool

Source note: `pages/0187-improve-hair-selections-with-the-refine-hair-tool.md`

Function group: hair-specific selection refinement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Refine Hair button`: `Missing`.
- `Hair edge detection`: `Missing`.
- `AI hair mask improvement`: `Missing`.

Implementation notes:
- Refine Edge/Select and Mask exists generally, but not a hair-specific tool.

## 0188 - Mask All Objects In A Layer

Source note: `pages/0188-mask-all-objects-in-a-layer.md`

Function group: automatic object masks.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Detect all objects in layer`: `Missing`.
- `Create mask per object`: `Missing`.
- `Object mask management`: `Missing`.

Implementation notes:
- Layer masks exist, but automatic object mask generation does not.

## 0189 - Detect Subject Using Select Subject

Source note: `pages/0189-detect-subject-using-select-subject.md`

Function group: Select Subject.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Select Subject command`: `Missing`.
- `Subject detection model`: `Missing`.
- `Cloud/device processing choice`: `Missing`.

Implementation notes:
- This is not present in menus, tools, or selection store behavior.

## 0190 - Paint A Selection With Quick Selection Tool

Source note: `pages/0190-paint-a-selection-with-quick-selection-tool.md`

Function group: Quick Selection painting.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Paint to grow selection`: `Present with differences`.
- `Brush size option`: `Present with differences`.
- `Sample all layers`: `Present with differences`.
- `Auto-enhance`: `Partial`. A simplified auto-enhance mask cleanup exists.
- `Photoshop edge intelligence`: `Partial`.

Implementation notes:
- Implemented in `src/tools/quickSelection.ts` and `OptionsBar`.

## 0191 - Select Areas By Color With The Magic Wand Tool

Source note: `pages/0191-select-areas-by-color-with-the-magic-wand-tool.md`

Function group: Magic Wand.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Tolerance`: `Present with differences`.
- `Contiguous`: `Present with differences`.
- `Anti-alias`: `Present with differences`.
- `Sample all layers`: `Present with differences`.
- `Photoshop-level edge quality`: `Partial`.

Implementation notes:
- Implemented in `src/tools/magicWand.ts`.

## 0192 - Freehand Selections

Source note: `pages/0192-freehand-selections.md`

Function group: freehand selection tools.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Lasso freehand selection`: `Present with differences`.
- `Polygonal straight-edge selection`: `Present with differences`.
- `Magnetic Lasso`: `Missing`.
- `Selection operation modifiers`: `Present with differences`.

Implementation notes:
- Lasso tools are implemented; edge-snapping lasso is absent.

## 0193 - Create Quick Selections With The Selection Brush Tool

Source note: `pages/0193-create-quick-selections-with-the-selection-brush-tool.md`

Function group: Selection Brush tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Selection Brush tool`: `Missing`.
- `Paint selection/mask overlay directly`: `Missing`.
- `Brush mode add/subtract selection`: `Missing`.

Implementation notes:
- Quick Selection exists, but that is a region-growing tool, not Photoshop's Selection Brush.

## 0194 - Select A Color Range In Photoshop

Source note: `pages/0194-select-a-color-range-in-photoshop.md`

Function group: Color Range command.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Color Range dialog`: `Missing`. Menu item is disabled.
- `Fuzziness/range controls`: `Missing`.
- `Sample colors/skin tones/localized color clusters`: `Missing`.

Implementation notes:
- Magic Wand provides click-based color selection, not a global Color Range dialog.

## 0195 - Draw Freeform Selections With The Lasso Tool

Source note: `pages/0195-draw-freeform-selections-with-the-lasso-tool.md`

Function group: Lasso tool.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Drag freehand selection`: `Present with differences`.
- `Marching ants result`: `Present with differences`.
- `Add/subtract selection modifiers`: `Present with differences`.
- `Feather/anti-alias parity`: `Partial`.

Implementation notes:
- Implemented in `src/tools/lasso.ts`.

## 0196 - Draw Straight-Edged Segments Of A Selection Border

Source note: `pages/0196-draw-straight-edged-segments-of-a-selection-border.md`

Function group: Polygonal Lasso tool.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Click straight-line segments`: `Present with differences`.
- `Close selection path`: `Present with differences`.
- `Enter/Escape/Backspace keyboard handling`: `Present with differences`.
- `Photoshop exact interaction polish`: `Partial`.

Implementation notes:
- Polygonal Lasso is implemented in `src/tools/lasso.ts`.

## 0197 - Snap To Image Edges Using Magnetic Lasso Tool

Source note: `pages/0197-snap-to-image-edges-using-magnetic-lasso-tool.md`

Function group: Magnetic Lasso.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Magnetic Lasso tool`: `Missing`.
- `Edge contrast/frequency/width controls`: `Missing`.
- `Automatic anchor points along edges`: `Missing`.

Implementation notes:
- No edge-snapping selection tool exists.

## 0198 - Save Skin Tones Settings As A Preset

Source note: `pages/0198-save-skin-tones-settings-as-a-preset.md`

Function group: Color Range skin-tone presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Skin Tones selection mode`: `Missing`.
- `Face detection/localized clusters`: `Missing`.
- `Save Color Range settings as preset`: `Missing`.

Implementation notes:
- This depends on Color Range and preset infrastructure, both absent.

## 0199 - Refine And Modify Selections

Source note: `pages/0199-refine-and-modify-selections.md`

Function group: selection refinement and modification.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Feather`: `Present with differences`.
- `Border`: `Present with differences`.
- `Expand/contract/smooth`: `Partial`. Store actions exist for some operations, but menu/dialog UI is incomplete.
- `Select and Mask`: `Partial`. A Refine Edge dialog exists, but Photoshop's full workspace is not matched.

Implementation notes:
- Selection modification is present but uneven across UI and engine.

## 0200 - Move A Selection Or Selection Border

Source note: `pages/0200-move-a-selection-or-selection-border.md`

Function group: moving selection borders and selected pixels.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Move selection border`: `Present with differences`. Selection path/operations can be shifted during drag behavior.
- `Move selected pixels`: `Present with differences`. Free Edit creates floating selected pixels for movement.
- `Transform moved selection`: `Partial`.

Implementation notes:
- Movement behavior is implemented in `Viewport` and `useFreeEdit`.

## 0201 - Refine Your Selection And Mask

Source note: `pages/0201-refine-your-selection-and-mask.md`

Function group: Select and Mask workspace.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Open Select and Mask/Refine Edge`: `Present with differences`. Menu opens a Refine Edge dialog.
- `Edge radius/smoothing/feather-like refinement`: `Partial`.
- `View modes and output options`: `Missing` or limited.
- `Refine Hair/AI refinement`: `Missing`.

Implementation notes:
- Photoweb has a simplified refinement dialog rather than a full workspace.

## 0202 - Hover Layer Bounds In The Move Tool

Source note: `pages/0202-hover-layer-bounds-in-the-move-tool.md`

Function group: Move tool hover bounds.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Show transform controls`: `Partial`. Move tool options include a controls checkbox, and transform handles appear in transform mode.
- `Hover layer bounds preview`: `Missing`.
- `Auto-select layer by hover/click`: `Partial` or absent compared with Photoshop.

Implementation notes:
- Bounds visualization is strongest during Free Transform, not passive Move-tool hover.

## 0203 - Copy And Paste Selections

Source note: `pages/0203-copy-and-paste-selections.md`

Function group: copying/pasting selected pixels.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Copy selected pixels`: `Present with differences`. Viewport context behavior can copy selection content to a new layer/workflow.
- `Cut selected pixels`: `Present with differences`.
- `Paste as new layer`: `Partial`.
- `Clipboard interoperability`: `Missing` or limited.

Implementation notes:
- Selection content operations exist, but Photoshop's full Edit > Copy/Paste command family is not complete.

## 0204 - Create Multiple Copies Of A Selection Within An Image

Source note: `pages/0204-create-multiple-copies-of-a-selection-within-an-image.md`

Function group: duplicating selected pixels repeatedly.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Alt/Option-drag selected pixels to duplicate`: `Missing`.
- `Repeat duplicate movement`: `Missing`.
- `Multiple copies from same selection`: `Missing`.

Implementation notes:
- Photoweb can create layers from selections, but not this repeated in-canvas duplication workflow.

## 0205 - Paste One Selection Into Or Outside Another

Source note: `pages/0205-paste-one-selection-into-or-outside-another.md`

Function group: Paste Into/Paste Outside.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Paste Into selection with layer mask`: `Missing`.
- `Paste Outside selection`: `Missing`.
- `Automatic mask creation from target selection`: `Missing`.

Implementation notes:
- Layer masks exist, but paste-into/outside commands are not implemented.

## 0206 - Delete Or Cut Selected Pixels

Source note: `pages/0206-delete-or-cut-selected-pixels.md`

Function group: deleting and cutting selection content.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Delete selected pixels`: `Present with differences`.
- `Cut selected pixels`: `Present with differences`.
- `Background/fill behavior`: `Partial`. Photoweb does not model Photoshop's locked Background fill rules.

Implementation notes:
- Viewport selection context operations and keyboard delete handling cover the core pixel removal workflow.

## 0207 - Control The Movement Of A Selection

Source note: `pages/0207-control-the-movement-of-a-selection.md`

Function group: constrained selection movement.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Drag selection border/content`: `Present with differences`.
- `Nudge with arrow keys`: `Missing` or limited.
- `Constrain movement with Shift`: `Missing` or limited.
- `Snap during selection movement`: `Partial`.

Implementation notes:
- Selection movement exists, but precision movement controls are not Photoshop-complete.

## 0208 - Hide Or Show Selection Edges

Source note: `pages/0208-hide-or-show-selection-edges.md`

Function group: selection edge visibility.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Show marching ants`: `Present with differences`.
- `Hide selection edges without deselecting`: `Missing`. No View > Extras-style selection edge toggle was found.
- `Quick Mask display`: `Present with differences`.

Implementation notes:
- Selection edges render in `Viewport`; visibility is not separately toggled except through mode/state.

## 0209 - Inverse Selection

Source note: `pages/0209-inverse-selection.md`

Function group: selection inversion.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Select > Inverse`: `Present with differences`.
- `Keyboard shortcut`: `Present with differences`. Menu exposes the common shortcut.
- `Invert complex selections`: `Partial`. Inversion is operation-based and may not match Photoshop perfectly for all edge/mask cases.

Implementation notes:
- Implemented in `selectionSlice.toggleInvertSelection`.

## 0210 - Adjust A Selection Manually

Source note: `pages/0210-adjust-a-selection-manually.md`

Function group: manual selection adjustment.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Add/subtract from selection`: `Present with differences`.
- `Feather/border`: `Present with differences`.
- `Expand/contract/smooth`: `Partial`.
- `Transform Selection command`: `Missing`. Menu item is disabled, though selected pixels can be free-edited separately.

Implementation notes:
- Photoweb has the core selection state operations, but the manual adjustment UI is not complete.

## Summary

High-overlap areas:
- Image resizing, canvas resizing, trim, rotate, flip, crop, and core transform workflows are meaningfully implemented.
- Classic selection tools are a strong area: marquee, lasso, polygonal lasso, Magic Wand, Quick Selection, invert, deselect, feather, border, Quick Mask, selected-pixel movement, and delete/cut workflows are present in simplified form.
- Crop and transform overlays provide real interactive editing, although they are less complete than Photoshop.

Major missing areas:
- Layer styles and layer effects remain absent across notes `0111` through `0115`.
- Smart Objects are absent across notes `0116` through `0132`.
- Layer comps, layer alignment/distribution, artboards, and frames are missing across notes `0133` through `0146`.
- Print-resolution/DPI workflows are mostly missing or not applicable because Photoweb is pixel/screen oriented.
- Content-aware scale, content-aware crop fill, perspective crop, arbitrary image straighten, and advanced transform commands are missing.
- Modern AI/semantic selection workflows are missing: Object Selection, Select Subject, Select People, Refine Hair, Mask All Objects, and Delete and Fill Selection.
- Color Range and Magnetic Lasso are absent.

Recommended implementation priorities if Photoweb wants closer Photoshop parity:
- Finish the selection command layer first: Color Range, Transform Selection, expand/contract/smooth dialogs, hide selection edges, and clipboard-style copy/paste commands.
- Improve crop/resize with arbitrary straighten, better crop option wiring, and more explicit non-destructive/delete-cropped-pixels behavior.
- Add multi-layer selection before attempting align/distribute/layer comps.
- Treat Smart Objects, artboards, frames, and layer styles as separate large architecture tracks rather than incremental UI additions.
