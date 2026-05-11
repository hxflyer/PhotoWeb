# Photoweb vs Photoshop Notes: Function Comparison 0211-0310

Scope: generated Photoshop study notes `0211` through `0310`.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes print/product theory more than an editor function.

Relevant Photoweb code areas:
- Selection state and modifications: `src/store/selectionSlice.ts`, `src/components/Canvas/Viewport.tsx`
- Selection tools: `src/tools/marquee.ts`, `src/tools/lasso.ts`, `src/tools/magicWand.ts`, `src/tools/quickSelection.ts`
- Masks and layers: `src/store/layersSlice.ts`, `src/core/Layer.ts`, `src/components/Panels/LayersPanel.tsx`
- Retouch and paint tools: `src/tools/cloneStamp.ts`, `src/tools/eraser.ts`, `src/tools/dodgeBurnSponge.ts`, `src/tools/brush.ts`, `src/tools/pencil.ts`
- Fill/gradient/color tools: `src/tools/paintBucket.ts`, `src/tools/gradient.ts`, `src/store/colorSlice.ts`, `src/components/Dialogs/ColorPickerDialog.tsx`
- Adjustments and blend modes: `src/adjustments/*`, `src/core/blendModes.ts`

## 0211 - Select Only An Area Intersected By Other Selections

Source note: `pages/0211-select-only-an-area-intersected-by-other-selections.md`

Function group: selection intersection.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Add to selection`: `Present with differences`. Photoweb supports additive selection operations.
- `Subtract from selection`: `Present with differences`.
- `Intersect with selection`: `Present`. Shift+Alt/Option intersect now performs a true raster AND between the existing selection mask and the new region; a previous bug where intersect appended a union has been fixed.

Implementation notes:
- Selection modifiers are implemented in `selectionModifiers`; intersect uses pixel-accurate mask AND so subsequent operations operate on the actual overlap.

## 0212 - Refine And Soften Selection Edges

Source note: `pages/0212-refine-and-soften-selection-edges.md`

Function group: softening and refining selection edges.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Feather selection`: `Present with differences`.
- `Select and Mask/Refine Edge`: `Present with differences`. The Refine Edge dialog now applies Radius (blur), Smooth (median), and Contrast (steepen) to the selection mask alongside Feather and Shift Edge.
- `Smooth, contrast, shift edge style controls`: `Present with differences`. Smooth, Contrast, and Shift Edge all run real mask transforms; smart-radius and decontaminate-colors features remain absent.

Implementation notes:
- Refine Edge now performs true blur/median/contrast/feather/shift-edge passes on the selection mask, though it does not yet match Photoshop's full Select and Mask workspace.

## 0213 - Select Pixels Using Anti-Aliasing

Source note: `pages/0213-select-pixels-using-anti-aliasing.md`

Function group: anti-aliased selection edges.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Anti-alias option for color selection`: `Present with differences`. Magic Wand has anti-alias behavior.
- `Anti-aliased marquee/lasso edges`: `Present with differences`. The elliptical Marquee Anti-Alias toggle is now functional: off produces a binary mask, on produces an anti-aliased mask.
- `Disable/enable anti-alias per tool`: `Present with differences`. Elliptical marquee exposes a working Anti-Alias toggle; other tools still have varying levels of control.

Implementation notes:
- Marquee options bar now drives the anti-alias setting end-to-end for elliptical selections.

## 0214 - Define A Feathered Edge For A Selection Tool

Source note: `pages/0214-define-a-feathered-edge-for-a-selection-tool.md`

Function group: selection feathering.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Feather Radius command`: `Present with differences`.
- `Feathered selection mask rendering`: `Present with differences`.
- `Per-tool feather fields`: `Present with differences`. The Marquee options bar Feather field now writes `selection.feather` on commit so per-tool feather radius takes effect on the next selection.

Implementation notes:
- Feather value is stored in selection state and applied when generating the selection mask; the marquee options bar feeds that value at commit time.

## 0215 - Create A Selection Around A Selection Border

Source note: `pages/0215-create-a-selection-around-a-selection-border.md`

Function group: border selection.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Select > Modify > Border`: `Present with differences`. Photoweb exposes a Border action.
- `Border width control`: `Partial`. Menu uses a simple value path; full dialog behavior is limited.
- `Border from complex selections`: `Partial`.

Implementation notes:
- `selectionSlice.borderSelection` creates an outer/inner operation pair.

## 0216 - Expand Or Contract A Selection

Source note: `pages/0216-expand-or-contract-a-selection.md`

Function group: selection expansion and contraction.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Expand selection`: `Present`. Implemented as iterative 4-neighbor dilation on the selection mask.
- `Contract selection`: `Present`. Implemented as erosion (dilate of the inverse mask).
- `Precise pixel dialog`: `Present with differences`. A pixel-radius prompt drives expand/contract; full Photoshop dialog polish is still pending.

Implementation notes:
- Expand and Contract are real raster operations on the selection mask; an earlier no-op implementation has been replaced.

## 0217 - Clean Up Stray Pixels In A Color-Based Selection

Source note: `pages/0217-clean-up-stray-pixels-in-a-color-based-selection.md`

Function group: selection cleanup after color-based selection.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Magic Wand tolerance/contiguous cleanup`: `Present with differences`.
- `Grow/Similar cleanup commands`: `Missing`. Menu items exist but are disabled.
- `Remove isolated stray pixels automatically`: `Missing`.

Implementation notes:
- Quick Selection has a simple mask cleanup pass, but no Photoshop-level cleanup commands.

## 0218 - Fringe Pixels Around A Selection

Source note: `pages/0218-fringe-pixels-around-a-selection.md`

Function group: understanding selection fringes.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Feather/anti-alias edge behavior`: `Present with differences`.
- `Dedicated fringe visualization`: `Missing`.
- `Selection edge diagnostics`: `Missing`.

Implementation notes:
- Photoweb can create soft edges, but does not explain or inspect fringe pixels.

## 0219 - Decrease The Fringe On A Selection

Source note: `pages/0219-decrease-the-fringe-on-a-selection.md`

Function group: reducing selection fringes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Defringe command`: `Missing`.
- `Matting cleanup workflow`: `Missing`.
- `Remove white/black matte`: `Missing`.

Implementation notes:
- Selection and masks exist, but fringe-removal commands do not.

## 0220 - Remove A Matte From A Selection

Source note: `pages/0220-remove-a-matte-from-a-selection.md`

Function group: matte removal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Remove Black Matte`: `Missing`.
- `Remove White Matte`: `Missing`.
- `Defringe matte colors`: `Missing`.

Implementation notes:
- No layer matting menu or pixel operation exists.

## 0221 - Create Masks

Source note: `pages/0221-create-masks.md`

Function group: mask creation overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Layer masks`: `Present with differences`.
- `Masks from selections`: `Partial`. Reveal/Hide Selection menu actions exist, but behavior is simplified.
- `Vector masks/clipping masks`: `Missing`.

Implementation notes:
- Mask data and layer mask commands live in `layersSlice`.

## 0222 - Layer Masks

Source note: `pages/0222-layer-masks.md`

Function group: layer mask behavior.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Reveal/hide layer areas with grayscale mask`: `Present with differences`.
- `Enable/disable mask`: `Present with differences`. Layers panel mask thumbnails can toggle enabled state and show a disabled indicator.
- `Apply/delete mask`: `Present with differences`. Menu and Layers panel context actions can apply or delete masks.
- `Mask Properties panel controls`: `Missing`.

Implementation notes:
- Photoweb implements the important mask lifecycle and visible Layers panel controls, but still lacks Photoshop's full mask Properties controls such as density/feather.

## 0223 - Add Layer Masks

Source note: `pages/0223-add-layer-masks.md`

Function group: adding masks to layers.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Reveal All`: `Present with differences`.
- `Hide All`: `Present with differences`.
- `Reveal/Hide Selection`: `Partial`. Menu routes are present, but selection-specific mask generation is simplified.
- `Add mask button in Layers panel`: `Present with differences`. The Layers panel now includes a mask toolbar button for the active layer.
- `Mask thumbnail display`: `Present with differences`. Layers with masks show a mask thumbnail beside the layer thumbnail.

Implementation notes:
- Layer mask commands are available from the Layer menu and Layers panel.

## 0224 - Create Layer Masks For All Detected Objects In A Layer

Source note: `pages/0224-create-layer-masks-for-all-detected-objects-in-a-layer.md`

Function group: AI object masks.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Detect all objects`: `Missing`.
- `Create masks per detected object`: `Missing`.
- `Object mask naming/management`: `Missing`.

Implementation notes:
- Photoweb has masks, but no object detection model.

## 0225 - Unlink Layers And Masks

Source note: `pages/0225-unlink-layers-and-masks.md`

Function group: layer-mask linking.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Mask linked to layer`: `Present with differences`. Mask link state exists in the layer model and is visible in the Layers panel.
- `Unlink mask from layer`: `Present with differences`. The Layers panel exposes a link/unlink control for each mask.
- `Move layer and mask independently`: `Partial`. Linked masks move with pixel movement in supported operations; independent mask-only movement is not yet a full Photoshop-style workflow.

Implementation notes:
- Link state is now visible and editable, but independent mask targeting/movement remains a future refinement.

## 0226 - Disable Or Enable Layer Masks

Source note: `pages/0226-disable-or-enable-layer-masks.md`

Function group: toggling mask visibility/effect.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Disable mask`: `Present with differences`.
- `Enable mask`: `Present with differences`.
- `Disabled mask indicator`: `Present with differences`. Disabled masks show red styling/diagonal indicator on the mask thumbnail.

Implementation notes:
- The Layer menu and Layers panel expose mask enable/disable behavior.

## 0227 - Apply Or Delete Layer Masks

Source note: `pages/0227-apply-or-delete-layer-masks.md`

Function group: committing or removing masks.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Apply mask to pixels`: `Present with differences`.
- `Delete mask`: `Present with differences`.
- `Prompt/confirm behavior`: `Missing`.

Implementation notes:
- Core operations are present in `layersSlice` and are reachable from the Layers panel context menu.

## 0228 - Blend Images

Source note: `pages/0228-blend-images.md`

Function group: compositing and blending images.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Blend modes`: `Present with differences`. Photoweb supports many blend modes.
- `Layer opacity/fill`: `Present with differences`.
- `Layer masks for manual blending`: `Present with differences`.
- `Auto-Blend Layers`: `Missing`.

Implementation notes:
- Manual compositing exists; automated blending does not.

## 0229 - Auto-Blend Layers Command Overview

Source note: `pages/0229-auto-blend-layers-command-overview.md`

Function group: automatic layer blending.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Auto-Blend Layers command`: `Missing`.
- `Panorama blending`: `Missing`.
- `Stack image blending`: `Missing`.
- `Seam and tone matching`: `Missing`.

Implementation notes:
- Photoweb has manual layers but no auto-blend algorithm.

## 0230 - Create A Composite With Extended Depth Of Field

Source note: `pages/0230-create-a-composite-with-extended-depth-of-field.md`

Function group: focus stacking.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Auto-align focus stack`: `Missing`.
- `Auto-blend depth-of-field stack`: `Missing`.
- `Layer mask generation for sharp regions`: `Missing`.

Implementation notes:
- No focus-stack analysis pipeline exists.

## 0231 - Repair And Retouch

Source note: `pages/0231-repair-and-retouch.md`

Function group: retouching overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Clone Stamp`: `Present with differences`.
- `Dodge/Burn/Sponge`: `Present with differences`.
- `Eraser`: `Present with differences`.
- `Healing/Patch/Remove/Content-Aware Fill`: `Missing`.

Implementation notes:
- Photoweb covers manual retouching, not Photoshop's healing/content-aware family.

## 0232 - Remove Objects And Fill Space

Source note: `pages/0232-remove-objects-and-fill-space.md`

Function group: object removal with background fill.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Delete selected pixels`: `Present with differences`.
- `Clone manually over object`: `Present with differences`.
- `Content-aware/AI fill after removal`: `Missing`.

Implementation notes:
- Object removal requires manual pixel work in Photoweb.

## 0233 - Remove Background In Your Images

Source note: `pages/0233-remove-background-in-your-images.md`

Function group: automatic background removal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Remove Background quick action`: `Missing`.
- `Subject detection`: `Missing`.
- `Auto-created layer mask`: `Missing`.

Implementation notes:
- Users can manually select/mask, but there is no one-click background removal.

## 0234 - Replace Background With Generate Background

Source note: `pages/0234-replace-background-with-generate-background.md`

Function group: AI background replacement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generate Background`: `Missing`.
- `Prompt-based replacement`: `Missing`.
- `AI variations`: `Missing`.

Implementation notes:
- No generative backend exists.

## 0235 - Retouch Tools Overview

Source note: `pages/0235-retouch-tools-overview.md`

Function group: retouch tool catalog.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Clone Stamp`: `Present with differences`.
- `Dodge/Burn/Sponge`: `Present with differences`.
- `Eraser`: `Present with differences`.
- `Spot Healing/Healing Brush/Patch/Red Eye/Remove`: `Missing`.

Implementation notes:
- The toolbar includes several retouch-style tools, but not the full Photoshop set.

## 0236 - Blend Objects And People Into Any Background With Harmonize

Source note: `pages/0236-blend-objects-and-people-into-any-background-with-harmonize.md`

Function group: AI harmonization.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Harmonize command`: `Missing`.
- `AI color/light matching`: `Missing`.
- `Generated harmonized layer`: `Missing`.

Implementation notes:
- Manual adjustments and blend modes can approximate some visual matching, but no AI harmonize exists.

## 0237 - Remove Objects And Fill The Area With Content-Aware Fill

Source note: `pages/0237-remove-objects-and-fill-the-area-with-content-aware-fill.md`

Function group: Content-Aware Fill.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Content-Aware Fill workspace`: `Missing`.
- `Sampling area generation`: `Missing`.
- `Fill output to layer/selection`: `Missing`.

Implementation notes:
- No content-aware synthesis algorithm is implemented.

## 0238 - Adjust Content-Aware Fill Settings

Source note: `pages/0238-adjust-content-aware-fill-settings.md`

Function group: Content-Aware Fill settings.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Color adaptation`: `Missing`.
- `Rotation/scale/mirror adaptation`: `Missing`.
- `Output settings`: `Missing`.

Implementation notes:
- Depends on the missing Content-Aware Fill workspace.

## 0239 - Tools To Fine-Tune Sampling And Fill Areas

Source note: `pages/0239-tools-to-fine-tune-sampling-and-fill-areas.md`

Function group: Content-Aware Fill sampling tools.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Sampling brush`: `Missing`.
- `Lasso in Content-Aware Fill workspace`: `Missing`.
- `Preview fill updates`: `Missing`.

Implementation notes:
- Selection tools exist generally, but not within a content-aware workspace.

## 0240 - Apply Or Cancel Content-Aware Fill Changes

Source note: `pages/0240-apply-or-cancel-content-aware-fill-changes.md`

Function group: committing Content-Aware Fill.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Apply generated fill`: `Missing`.
- `Cancel workspace changes`: `Missing`.
- `Output to new layer/current layer`: `Missing`.

Implementation notes:
- There is no content-aware operation to apply.

## 0241 - View Full-Resolution Preview In The Preview Panel

Source note: `pages/0241-view-full-resolution-preview-in-the-preview-panel.md`

Function group: Content-Aware Fill preview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Preview panel`: `Missing`.
- `Full-resolution preview toggle`: `Missing`.
- `Before/after workspace preview`: `Missing`.

Implementation notes:
- Filter/adjustment dialogs have previews, but not this workspace.

## 0242 - Remove Objects From Within The Contextual Task Bar

Source note: `pages/0242-remove-objects-from-within-the-contextual-task-bar.md`

Function group: contextual object removal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Contextual Remove action`: `Missing`.
- `Selection-aware object removal`: `Missing`.
- `AI/content-aware result layer`: `Missing`.

Implementation notes:
- Photoweb has an options bar, not a Photoshop Contextual Task Bar with Remove.

## 0243 - Remove Tool Known Issues And Workarounds

Source note: `pages/0243-remove-tool-known-issues-and-workarounds.md`

Function group: Remove tool support notes.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Remove tool issue list`: `Not applicable`.
- `Workarounds for AI Remove behavior`: `Missing`.
- `Hardware/cloud limitations`: `Not applicable`.

Implementation notes:
- The Remove tool is absent.

## 0244 - Remove Tool Minimum And Recommended Hardware Requirements

Source note: `pages/0244-remove-tool-minimum-and-recommended-hardware-requirements.md`

Function group: Remove tool hardware requirements.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Remove tool GPU/CPU requirements`: `Not applicable`.
- `Feature availability checks`: `Missing`.
- `Compatibility warning UI`: `Missing`.

Implementation notes:
- No Remove tool or hardware-gated feature system exists.

## 0245 - Remove Unwanted Objects And Distractions

Source note: `pages/0245-remove-unwanted-objects-and-distractions.md`

Function group: distraction removal.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Manual clone/erase removal`: `Present with differences`.
- `AI Remove tool`: `Missing`.
- `Brush over object and auto-fill`: `Missing`.

Implementation notes:
- Photoweb supports manual cleanup but not automated object removal.

## 0246 - Remove Wires, People, And General Distractions

Source note: `pages/0246-remove-wires-people-and-general-distractions.md`

Function group: specialized distraction removal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Find/remove wires`: `Missing`.
- `Find/remove people`: `Missing`.
- `General distraction detection`: `Missing`.

Implementation notes:
- No semantic/AI cleanup model exists.

## 0247 - Review And Refine General Distractions

Source note: `pages/0247-review-and-refine-general-distractions.md`

Function group: reviewing detected distractions.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Review detected distractions`: `Missing`.
- `Accept/reject removal candidates`: `Missing`.
- `Refine AI cleanup mask`: `Missing`.

Implementation notes:
- This depends on absent distraction detection.

## 0248 - Heal And Clone

Source note: `pages/0248-heal-and-clone.md`

Function group: healing and cloning overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Clone Stamp`: `Present with differences`.
- `Clone sample options`: `Partial`.
- `Healing Brush/Spot Healing/Patch`: `Missing`.

Implementation notes:
- Clone Stamp is the main overlap in this family.

## 0249 - Clone Source Panel

Source note: `pages/0249-clone-source-panel.md`

Function group: clone source management.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Set clone sample point`: `Present with differences`.
- `Multiple clone sources`: `Missing`.
- `Clone Source panel overlay/options`: `Missing`.

Implementation notes:
- Clone options exist in the options bar, not a full Clone Source panel.

## 0250 - Retouch Images With The Clone Stamp Tool

Source note: `pages/0250-retouch-images-with-the-clone-stamp-tool.md`

Function group: Clone Stamp tool.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Alt/Option sample source`: `Present with differences`.
- `Paint cloned pixels`: `Present with differences`.
- `Aligned/sample mode options`: `Present with differences`.
- `Advanced source overlay and multiple sources`: `Missing`.

Implementation notes:
- Implemented in `src/tools/cloneStamp.ts`.

## 0251 - Set Sample Sources For Cloning And Healing

Source note: `pages/0251-set-sample-sources-for-cloning-and-healing.md`

Function group: retouch sample source options.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Clone sample source`: `Present with differences`.
- `Sample current/current and below/all layers`: `Partial`. Clone Stamp sample mode exists, but Photoshop parity is not complete.
- `Healing source behavior`: `Missing`.

Implementation notes:
- There is no Healing Brush tool.

## 0252 - Adjust The Sample Source Overlay Options

Source note: `pages/0252-adjust-the-sample-source-overlay-options.md`

Function group: clone source overlay.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Show clone source overlay`: `Missing`.
- `Overlay opacity/blend/clipping`: `Missing`.
- `Invert/auto-hide overlay`: `Missing`.

Implementation notes:
- Clone preview/overlay controls are not implemented.

## 0253 - Scale Or Rotate The Sample Source

Source note: `pages/0253-scale-or-rotate-the-sample-source.md`

Function group: transformed clone source.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Scale clone source`: `Missing`.
- `Rotate clone source`: `Missing`.
- `Offset clone source numerically`: `Missing`.

Implementation notes:
- Photoweb samples and paints cloned pixels without transformed source controls.

## 0254 - Adjust Light And Tone

Source note: `pages/0254-adjust-light-and-tone.md`

Function group: tonal adjustment overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Brightness/Contrast`: `Present with differences`.
- `Levels/Curves/Exposure`: `Present with differences`.
- `Dodge/Burn`: `Present with differences`.
- `Camera Raw tonal controls`: `Missing`.

Implementation notes:
- Photoweb has a good subset of local tonal adjustments.

## 0255 - Blending Mode Descriptions

Source note: `pages/0255-blending-mode-descriptions.md`

Function group: blend modes.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Layer blend mode list`: `Present with differences`.
- `Blend mode rendering`: `Present with differences`.
- `Complete Photoshop mode parity`: `Partial`.

Implementation notes:
- Blend modes are implemented in `src/core/blendModes.ts` and exposed in the Layers panel/options.

## 0256 - Dodge Or Burn Image Areas

Source note: `pages/0256-dodge-or-burn-image-areas.md`

Function group: Dodge and Burn tools.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Dodge`: `Present with differences`.
- `Burn`: `Present with differences`.
- `Range/exposure/protect tones options`: `Partial`.

Implementation notes:
- Implemented with simplified options in `dodgeBurnSponge`.

## 0257 - Darken The Edges Of Your Image To Bring Focus To The Center

Source note: `pages/0257-darken-the-edges-of-your-image-to-bring-focus-to-the-center.md`

Function group: vignette/dark edge effect.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Manual vignette with selection/brush/burn`: `Present with differences`.
- `Dedicated vignette filter/control`: `Missing`.
- `Lens correction/Camera Raw vignette`: `Missing`.

Implementation notes:
- Users can build a vignette manually, but no purpose-built tool exists.

## 0258 - Clean And Restore Images

Source note: `pages/0258-clean-and-restore-images.md`

Function group: image restoration.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Clone/manual repair`: `Present with differences`.
- `Noise/sharpen filters`: `Present with differences`.
- `Photo Restoration/Neural restoration`: `Missing`.
- `Healing/Patch tools`: `Missing`.

Implementation notes:
- Restoration is possible manually, not with Photoshop's advanced restoration stack.

## 0259 - Enhance Image Quality With Generative Upscale

Source note: `pages/0259-enhance-image-quality-with-generative-upscale.md`

Function group: AI upscaling.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generative Upscale`: `Missing`.
- `AI detail synthesis`: `Missing`.
- `Upscale variations`: `Missing`.

Implementation notes:
- Photoweb can resample images, but not generate new detail.

## 0260 - Define Planes To Adjust Perspective

Source note: `pages/0260-define-planes-to-adjust-perspective.md`

Function group: Vanishing Point perspective planes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Define perspective plane`: `Missing`.
- `Validate plane grid`: `Missing`.
- `Use plane for edits`: `Missing`.

Implementation notes:
- No Vanishing Point-style perspective editor exists.

## 0261 - Manipulate The Planes To Adjust Perspective

Source note: `pages/0261-manipulate-the-planes-to-adjust-perspective.md`

Function group: editing perspective planes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Move/resize plane corners`: `Missing`.
- `Create connected planes`: `Missing`.
- `Paint/clone in perspective`: `Missing`.

Implementation notes:
- Warp exists, but not perspective plane editing.

## 0262 - Edit Different Perspectives In The Same Image

Source note: `pages/0262-edit-different-perspectives-in-the-same-image.md`

Function group: multi-plane perspective editing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Multiple perspective planes`: `Missing`.
- `Linked plane editing`: `Missing`.
- `Perspective-aware retouching`: `Missing`.

Implementation notes:
- No perspective-plane model is present.

## 0263 - Keyboard Shortcuts To Adjust Perspective

Source note: `pages/0263-keyboard-shortcuts-to-adjust-perspective.md`

Function group: Vanishing Point shortcuts.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Perspective editor shortcuts`: `Missing`.
- `Plane manipulation shortcuts`: `Missing`.
- `Tool switching within Vanishing Point`: `Missing`.

Implementation notes:
- Feature family is absent.

## 0264 - Get Started With Photomerge

Source note: `pages/0264-get-started-with-photomerge.md`

Function group: panorama merge overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Photomerge command`: `Missing`.
- `Source image selection`: `Missing`.
- `Automatic panorama alignment/blending`: `Missing`.

Implementation notes:
- Photoweb has no multi-file panorama pipeline.

## 0265 - Create Panoramic Images With Photomerge

Source note: `pages/0265-create-panoramic-images-with-photomerge.md`

Function group: panorama creation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Perspective/cylindrical/spherical panorama layout`: `Missing`.
- `Blend images together`: `Missing`.
- `Geometric distortion correction`: `Missing`.

Implementation notes:
- No Photomerge equivalent exists.

## 0266 - Create 360-Degree Panoramas

Source note: `pages/0266-create-360-degree-panoramas.md`

Function group: 360 panorama workflow.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Spherical panorama merge`: `Missing`.
- `360 workspace/view`: `Missing`.
- `Export panorama metadata`: `Missing`.

Implementation notes:
- Photoweb is a flat 2D canvas editor.

## 0267 - Remove Imperfections With The Spot Healing Brush

Source note: `pages/0267-remove-imperfections-with-the-spot-healing-brush.md`

Function group: Spot Healing Brush.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Spot Healing Brush`: `Missing`.
- `Content-aware/proximity match healing`: `Missing`.
- `Sample all layers healing`: `Missing`.

Implementation notes:
- Clone Stamp can manually repair, but does not heal/blend automatically.

## 0268 - Retouch A Large Area With The Healing Brush Tool

Source note: `pages/0268-retouch-a-large-area-with-the-healing-brush-tool.md`

Function group: Healing Brush.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Healing Brush`: `Missing`.
- `Texture sample plus tone/color blending`: `Missing`.
- `Healing sample source options`: `Missing`.

Implementation notes:
- Clone Stamp lacks healing blend behavior.

## 0269 - Repair An Area With The Patch Tool

Source note: `pages/0269-repair-an-area-with-the-patch-tool.md`

Function group: Patch tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Patch selection source/destination`: `Missing`.
- `Content-aware patch`: `Missing`.
- `Patch adaptation options`: `Missing`.

Implementation notes:
- Selection move/free edit is not a healing patch tool.

## 0270 - Remove Red Eye In Flash Photos

Source note: `pages/0270-remove-red-eye-in-flash-photos.md`

Function group: Red Eye tool.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Red Eye tool`: `Missing`.
- `Pupil size/darken amount controls`: `Missing`.
- `Automatic red-eye correction`: `Missing`.

Implementation notes:
- Users could manually paint/adjust, but no tool exists.

## 0271 - Define An Image As A Preset Pattern

Source note: `pages/0271-define-an-image-as-a-preset-pattern.md`

Function group: pattern presets.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Define Pattern command`: `Missing`.
- `Pattern preset library`: `Missing`.
- `Pattern fill reuse`: `Missing`.

Implementation notes:
- Photoweb has gradient and solid fills, but no pattern preset system.

## 0272 - Erase Parts Of An Image With The Eraser Tool

Source note: `pages/0272-erase-parts-of-an-image-with-the-eraser-tool.md`

Function group: Eraser tool.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Erase pixels to transparency`: `Present with differences`.
- `Brush size/hardness/opacity`: `Present with differences`.
- `Background layer behavior`: `Missing`. Photoweb lacks Photoshop's special Background layer rules.

Implementation notes:
- Implemented in `src/tools/eraser.ts`.

## 0273 - Auto-Erase With The Pencil Tool

Source note: `pages/0273-auto-erase-with-the-pencil-tool.md`

Function group: Pencil auto-erase.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Auto Erase option`: `Missing`.
- `Erase foreground-colored pixels to background color`: `Missing`.
- `Pencil-specific mode behavior`: `Missing`.

Implementation notes:
- Pencil exists, but Auto Erase was not found.

## 0274 - Create Smoother Brush Strokes Using Stroke Smoothing

Source note: `pages/0274-create-smoother-brush-strokes-using-stroke-smoothing.md`

Function group: brush stroke smoothing.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Basic brush stroke rendering`: `Present with differences`.
- `Smoothing percentage/control`: `Missing`.
- `Pulled string/catch-up smoothing modes`: `Missing`.

Implementation notes:
- Brush engine exists, but advanced smoothing controls do not.

## 0275 - Change Pixels To Transparent With The Background Eraser Tool

Source note: `pages/0275-change-pixels-to-transparent-with-the-background-eraser-tool.md`

Function group: Background Eraser.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Background Eraser tool`: `Missing`.
- `Sampling limits/tolerance/protect foreground`: `Missing`.
- `Erase color ranges while preserving edges`: `Missing`.

Implementation notes:
- Normal Eraser and Magic Wand can be combined manually, but no Background Eraser exists.

## 0276 - Remove Similar Pixels With The Magic Eraser Tool

Source note: `pages/0276-remove-similar-pixels-with-the-magic-eraser-tool.md`

Function group: Magic Eraser.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Magic Eraser tool`: `Missing`.
- `Click color and erase matching pixels`: `Missing`.
- `Tolerance/contiguous/sample all layers erase behavior`: `Missing`.

Implementation notes:
- Magic Wand plus Delete can approximate this manually.

## 0277 - Remove Reflections

Source note: `pages/0277-remove-reflections.md`

Function group: reflection removal.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Reflection Removal`: `Missing`.
- `AI/glass reflection detection`: `Missing`.
- `Preview/refine reflection removal`: `Missing`.

Implementation notes:
- No AI restoration filter exists.

## 0278 - Adjust Color

Source note: `pages/0278-adjust-color.md`

Function group: color adjustment overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Hue/Saturation`: `Present with differences`.
- `Color Balance`: `Present with differences`.
- `Vibrance/Black & White/Photo Filter/Channel Mixer/Gradient Map`: `Present with differences`.
- `Color management/profiles/print-specific controls`: `Missing`.

Implementation notes:
- Photoweb has a solid color-adjustment subset.

## 0279 - Color Profiles

Source note: `pages/0279-color-profiles.md`

Function group: color profile management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Document ICC profile`: `Missing`.
- `Assign/convert profile`: `Missing`.
- `Profile mismatch warnings`: `Missing`.

Implementation notes:
- Photoweb relies on browser canvas color behavior.

## 0280 - About Color Profiles

Source note: `pages/0280-about-color-profiles.md`

Function group: color profile concepts.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Profile-aware document model`: `Missing`.
- `Working spaces and device profiles`: `Missing`.
- `Color-management policy UI`: `Missing`.

Implementation notes:
- No ICC/color-management layer exists.

## 0281 - Embed Color Profiles

Source note: `pages/0281-embed-color-profiles.md`

Function group: embedding color profiles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Embed ICC profile on save/export`: `Missing`.
- `Preserve embedded profile`: `Missing`.
- `Profile embedding preference`: `Missing`.

Implementation notes:
- Browser canvas export does not expose Photoshop-style ICC embedding control here.

## 0282 - Change Color Profile For Documents

Source note: `pages/0282-change-color-profile-for-documents.md`

Function group: assigning/converting document profiles.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Assign Profile`: `Missing`.
- `Convert to Profile`: `Missing`.
- `Rendering intent/black point compensation`: `Missing`.

Implementation notes:
- Color values are edited as canvas pixel data without document profile conversion.

## 0283 - Choose Colors

Source note: `pages/0283-choose-colors.md`

Function group: choosing foreground/background colors.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Foreground/background colors`: `Present with differences`.
- `Color picker dialog`: `Present with differences`.
- `Eyedropper sampling`: `Present with differences`.
- `Libraries/spot/web-safe/CMYK workflows`: `Missing`.

Implementation notes:
- Core color picking is present.

## 0284 - Set Foreground And Background Colors

Source note: `pages/0284-set-foreground-and-background-colors.md`

Function group: foreground/background color controls.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Set primary/secondary colors`: `Present with differences`.
- `Swap colors/default colors shortcut`: `Present with differences`.
- `Photoshop color panel parity`: `Partial`.

Implementation notes:
- Color state lives in `colorSlice` and is used by paint/fill/type tools.

## 0285 - Choose Colors With The Adobe Color Picker

Source note: `pages/0285-choose-colors-with-the-adobe-color-picker.md`

Function group: color picker.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Pick RGB/hex color`: `Present with differences`.
- `HSB/Lab/CMYK numeric modes`: `Missing` or limited.
- `Only Web Colors/Color Libraries`: `Missing`.

Implementation notes:
- Photoweb has a simpler color picker dialog.

## 0286 - Choose A Color While Painting

Source note: `pages/0286-choose-a-color-while-painting.md`

Function group: sampling colors while painting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Eyedropper tool`: `Present with differences`.
- `Temporary eyedropper while painting`: `Missing` or limited.
- `Sample size/current layer/all layers controls`: `Partial`.

Implementation notes:
- Eyedropper is available as a separate tool.

## 0287 - Choose Web-Safe Colors

Source note: `pages/0287-choose-web-safe-colors.md`

Function group: web-safe color selection.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Web-safe warning/nearest color`: `Missing`.
- `Only Web Colors mode`: `Missing`.
- `216-color web palette`: `Missing`.

Implementation notes:
- Modern Photoweb color picking does not include legacy web-safe constraints.

## 0288 - Choose A CMYK Equivalent For A Non-Printable Color

Source note: `pages/0288-choose-a-cmyk-equivalent-for-a-non-printable-color.md`

Function group: printable gamut warning and CMYK equivalents.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Out-of-gamut warning`: `Missing`.
- `Nearest printable CMYK color`: `Missing`.
- `CMYK conversion preview`: `Missing`.

Implementation notes:
- No CMYK/print color-management workflow exists.

## 0289 - Choose A Spot Color

Source note: `pages/0289-choose-a-spot-color.md`

Function group: spot colors.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Spot color picker`: `Missing`.
- `Spot channels`: `Missing`.
- `Print separations`: `Missing`.

Implementation notes:
- Photoweb is RGB canvas-based.

## 0290 - Spot Color Libraries

Source note: `pages/0290-spot-color-libraries.md`

Function group: spot color libraries.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Pantone/spot libraries`: `Missing`.
- `Load/search spot library`: `Missing`.
- `Apply spot swatches`: `Missing`.

Implementation notes:
- Swatches are simpler color presets, not print spot libraries.

## 0291 - Color Modes

Source note: `pages/0291-color-modes.md`

Function group: document color modes.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `RGB/CMYK/Grayscale/Lab/Indexed/Bitmap modes`: `Missing` as document modes.
- `Mode conversion menu`: `Missing`.
- `Bit depth/channel mode behavior`: `Missing`.

Implementation notes:
- Photoweb uses browser RGBA canvas pixels.

## 0292 - Convert An Image To Another Color Mode

Source note: `pages/0292-convert-an-image-to-another-color-mode.md`

Function group: color mode conversion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Image > Mode conversions`: `Missing`.
- `Flatten/convert prompts`: `Missing`.
- `Profile-aware conversion`: `Missing`.

Implementation notes:
- Color adjustments can alter appearance, but not document mode.

## 0293 - Convert An Image To Bitmap Mode

Source note: `pages/0293-convert-an-image-to-bitmap-mode.md`

Function group: bitmap mode conversion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Bitmap mode`: `Missing`.
- `Threshold/pattern/diffusion conversion methods`: `Missing`.
- `Bitmap resolution settings`: `Missing`.

Implementation notes:
- Threshold adjustment exists, but not Photoshop Bitmap mode.

## 0294 - Convert A Color Photo To Grayscale Mode

Source note: `pages/0294-convert-a-color-photo-to-grayscale-mode.md`

Function group: grayscale conversion.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Black & White adjustment`: `Present with differences`.
- `Desaturate`: `Present with differences`.
- `Grayscale document mode`: `Missing`.

Implementation notes:
- Photoweb can make pixels look grayscale but keeps RGBA canvas mode.

## 0295 - Convert A Bitmap Mode Image To Grayscale Mode

Source note: `pages/0295-convert-a-bitmap-mode-image-to-grayscale-mode.md`

Function group: bitmap-to-grayscale mode conversion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Bitmap mode source handling`: `Missing`.
- `Grayscale mode conversion`: `Missing`.
- `Size ratio conversion`: `Missing`.

Implementation notes:
- Document modes are not implemented.

## 0296 - Convert A Grayscale Or RGB Image To Indexed Color

Source note: `pages/0296-convert-a-grayscale-or-rgb-image-to-indexed-color.md`

Function group: indexed color conversion.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Indexed Color mode`: `Missing`.
- `Palette selection`: `Missing`.
- `Dither/transparency/matte options`: `Missing`.

Implementation notes:
- No palette-based document mode exists.

## 0297 - Conversion Options For Indexed Color Images

Source note: `pages/0297-conversion-options-for-indexed-color-images.md`

Function group: indexed color conversion options.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Palette algorithms`: `Missing`.
- `Forced colors/dither amount`: `Missing`.
- `Transparency and matte options`: `Missing`.

Implementation notes:
- Depends on absent Indexed Color mode.

## 0298 - Color Corrections

Source note: `pages/0298-color-corrections.md`

Function group: color correction overview.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Hue/Saturation, Color Balance, Vibrance`: `Present with differences`.
- `Levels/Curves/Exposure`: `Present with differences`.
- `Auto Tone/Auto Contrast/Auto Color`: `Present with differences`.
- `Advanced color-management and Camera Raw workflows`: `Missing`.

Implementation notes:
- Color correction is one of Photoweb's stronger overlap areas.

## 0299 - Apply A Hue Or Saturation Adjustment

Source note: `pages/0299-apply-a-hue-or-saturation-adjustment.md`

Function group: Hue/Saturation adjustment.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Hue/Saturation dialog`: `Present with differences`.
- `Adjustment layer`: `Present with differences`.
- `Targeted color ranges`: `Partial` or missing compared with Photoshop.

Implementation notes:
- Implemented through the adjustment registry and dialog.

## 0300 - Colorize A Grayscale Image Or Create A Monotone Effect

Source note: `pages/0300-colorize-a-grayscale-image-or-create-a-monotone-effect.md`

Function group: colorize/monotone effects.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Hue/Saturation colorize-style effect`: `Partial`.
- `Gradient Map/Photo Filter`: `Present with differences`.
- `Duotone/monotone document mode`: `Missing`.

Implementation notes:
- Appearance can be approximated with adjustments, but not Photoshop's full monotone modes.

## 0301 - Selective Color Adjustments

Source note: `pages/0301-selective-color-adjustments.md`

Function group: selective color correction.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Adjust selected areas using selection + adjustment`: `Present with differences`.
- `Hue/Saturation targeted edits`: `Partial`.
- `Selective Color adjustment`: `Missing`.

Implementation notes:
- Selection-limited adjustments are possible, but the named Selective Color adjustment is absent.

## 0302 - Match Color In Different Images

Source note: `pages/0302-match-color-in-different-images.md`

Function group: Match Color command.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Match Color command`: `Missing`.
- `Use source image statistics`: `Missing`.
- `Luminance/color intensity/fade controls`: `Missing`.

Implementation notes:
- Manual color adjustments can approximate matching, but no automated command exists.

## 0303 - Match Color Between Two Images

Source note: `pages/0303-match-color-between-two-images.md`

Function group: cross-image color matching.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Choose source document`: `Missing`.
- `Match target image to source`: `Missing`.
- `Multi-document color workflow`: `Missing`.

Implementation notes:
- Photoweb has only one active document.

## 0304 - Match Color Of Two Layers In The Same Image

Source note: `pages/0304-match-color-of-two-layers-in-the-same-image.md`

Function group: layer-to-layer color matching.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Use one layer as color source`: `Missing`.
- `Apply Match Color to target layer`: `Missing`.
- `Neutralize/fade controls`: `Missing`.

Implementation notes:
- Blend modes and manual adjustments exist, but no Match Color tool.

## 0305 - Save And Apply Settings In Match Color

Source note: `pages/0305-save-and-apply-settings-in-match-color.md`

Function group: Match Color presets/settings.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Save Match Color settings`: `Missing`.
- `Load Match Color settings`: `Missing`.
- `Preset file workflow`: `Missing`.

Implementation notes:
- Match Color itself is absent.

## 0306 - Replace Object Colors By Applying A Hue Or Saturation Adjustment

Source note: `pages/0306-replace-object-colors-by-applying-a-hue-or-saturation-adjustment.md`

Function group: object color replacement using Hue/Saturation.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Select object manually`: `Present with differences`.
- `Apply Hue/Saturation to selection`: `Present with differences`.
- `Object-aware automatic selection`: `Missing`.

Implementation notes:
- Manual workflow is possible with selections and adjustments.

## 0307 - Color Effects And Techniques

Source note: `pages/0307-color-effects-and-techniques.md`

Function group: color effects overview.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Gradient Map/Photo Filter/Black & White`: `Present with differences`.
- `Hue/Saturation and color balance effects`: `Present with differences`.
- `Advanced Photoshop technique library`: `Missing`.

Implementation notes:
- Photoweb has usable adjustment primitives, not a guided effect library.

## 0308 - Convert A Color Image To Black And White

Source note: `pages/0308-convert-a-color-image-to-black-and-white.md`

Function group: black-and-white conversion.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Black & White adjustment`: `Present with differences`.
- `Desaturate`: `Present with differences`.
- `Channel Mixer monochrome`: `Present with differences`.
- `Grayscale document mode`: `Missing`.

Implementation notes:
- Appearance conversion is supported; mode conversion is not.

## 0309 - Apply A Gradient Fill

Source note: `pages/0309-apply-a-gradient-fill.md`

Function group: gradient fill.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Gradient tool`: `Present with differences`.
- `Gradient fill layer`: `Present with differences`.
- `Gradient types and reverse/dither/opacity`: `Partial`.

Implementation notes:
- Gradient support is implemented in both tool and fill-layer paths.

## 0310 - Edit A Gradient

Source note: `pages/0310-edit-a-gradient.md`

Function group: gradient editing.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Choose gradient preset`: `Present with differences`.
- `Edit gradient stops`: `Partial`. Some gradient stop data exists, but the full Photoshop Gradient Editor is absent.
- `Save gradient presets`: `Missing`.

Implementation notes:
- OptionsBar exposes gradient choices; preset editing/management is limited.

## Summary

High-overlap areas:
- Selection basics and selection modifications are now well covered: add/subtract/intersect (true raster AND), feather, border, expand, contract, smooth (median), inverse (canvas-bounds-correct), Save Selection and Load Selection menu commands, plus Magic Wand, Quick Selection, lasso tools, and selection-limited operations.
- Selection move-by-drag is now a universal behavior: clicking inside an existing selection drags the selection; clicking outside dismisses it.
- Refine Edge applies real Radius (blur), Smooth (median), Contrast (steepen), Feather, and Shift Edge passes to the selection mask.
- Adjustments and filters honor the active selection combined with `layer.mask` when applied to a layer.
- Layer masks are meaningfully implemented with reveal/hide, enable/disable, apply, and delete workflows.
- Manual retouching overlaps through Clone Stamp, Eraser, Dodge, Burn, Sponge, brush, and pencil tools.
- Color adjustments, blend modes, foreground/background colors, eyedropper, color picker, gradient tool, and gradient fill layers are solid partial-to-present matches.

Major missing areas:
- Color Range is present in simplified manual-sample form. Object Selection, Sky Selection, Subject Selection, Focus Area, Magnetic Lasso, Refine Edge smart-radius/decontaminate, Select Subject AI, Select All Layers, Find Layers, and advanced Quick Mask features remain absent or partial.
- Photoshop matting/defringe commands and Photoshop's full Select and Mask workspace are still incomplete or absent.
- Content-Aware Fill, Remove tool, background removal, reflection removal, harmonize, generative upscale, and AI distraction workflows are missing.
- Healing Brush, Spot Healing Brush, Patch, Red Eye, Background Eraser, Magic Eraser, and Clone Source panel advanced controls are missing.
- Color profiles, ICC embedding, CMYK, spot colors, indexed/bitmap/grayscale document modes, and print color-management workflows are missing.
- Photomerge, 360 panoramas, and Vanishing Point/perspective plane workflows are missing.

Recommended implementation priorities:
- Continue selection polish: smart-radius/decontaminate in Refine Edge, honest Select and Mask output destinations, matting/defringe, and a richer Save/Load Selection dialog.
- Add basic Healing Brush or Spot Healing before attempting full content-aware/AI removal.
- Add a lightweight color-management decision: explicitly RGB-only, or begin document profile/mode support.
- Improve gradient editor and preset management if design workflows are a priority.
