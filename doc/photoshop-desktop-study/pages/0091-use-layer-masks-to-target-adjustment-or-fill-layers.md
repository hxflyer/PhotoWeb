# Use Layer Masks to Target Adjustment or Fill Layers

- Entry Type: Masked adjustment workflow
- Category: Create and manage layers > Color adjustment and fill layers
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/use-layer-masks-to-target-adjustment-or-fill-layers.html

**Function Summary**
This workflow limits an adjustment layer or fill layer to specific image areas by using a layer mask. It is the standard non-destructive way to apply corrections selectively instead of across the full image.

**What This Function Does**
- Restricts an adjustment or fill to selected parts of the image
- Uses white, black, and gray mask values to control visibility
- Supports both hand-built masks and color-range-generated masks

**Where You Find It**
- `Layer > New Adjustment Layer`
- `Layer > New Fill Layer`
- `Masks` section in the `Properties` panel
- `Color Range`

**Primary Interface Elements**
- layer mask thumbnail
- `Properties` panel
- `Masks`
- `Color Range`
- `Sampled Colors`
- `Fuzziness`
- selection tools such as `Marquee`, `Lasso`, and `Quick Selection`

**How To Create a Mask from a Selection**
1. Make a selection where you want the adjustment or fill to appear.
2. Create the adjustment layer or fill layer from the `Layer` menu.
3. Let Photoshop build the mask from the selection automatically.
4. Fine-tune the mask by painting on the mask thumbnail with black, white, or gray.

**How To Create a Mask with Color Range**
1. Select the layer you want to affect.
2. Create a new fill or adjustment layer.
3. In the `Masks` area of the `Properties` panel, open `Color Range`.
4. Choose `Sampled Colors`.
5. Click the colors you want to target and adjust `Fuzziness`.
6. Confirm with `OK`.
7. Paint on the mask afterward if you need more refinement.

**Mask Behavior**
- `White`
  Reveals the adjustment or fill
- `Black`
  Hides the adjustment or fill
- `Gray`
  Applies the effect partially

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Make the selection, sample colors, and paint directly on the mask to refine it.
- `Menus`
  Use the `Layer` menu for new adjustment or fill layers and the Properties panel for mask targeting controls.
- `Keyboard`
  Shortcut behavior depends on the selection and brush tools used during mask creation.

**User Interface Behavior**
- The mask is attached to the adjustment or fill layer rather than altering source pixels directly.
- Mask edits remain reversible and can be refined later.
- Selection-based masks are fast for geometric or object-based targeting, while Color Range works better for color-isolated targeting.

**Expected Result**
- The adjustment or fill affects only the intended areas of the image.

**Related Entries**
- Previous: Work with adjustment layers
- Next: Create adjustment layers
