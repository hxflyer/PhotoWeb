# Rasterize Smart Objects

- Entry Type: Smart Object flattening workflow
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/rasterize-smart-objects.html

**Function Summary**
This workflow converts a Smart Object into a regular raster layer, permanently committing its transforms and Smart Filter state.

**What This Function Does**
- Turns a Smart Object into a standard pixel layer
- Removes later access to Smart Object-specific flexibility
- Commits current transformations, warps, and filter behavior

**Where You Find It**
- `Layer > Smart Objects > Rasterize`

**Primary Interface Elements**
- selected Smart Object
- `Rasterize`

**How To Use It**
1. Select the Smart Object layer.
2. Choose `Layer > Smart Objects > Rasterize`.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Select the target Smart Object layer before choosing the rasterize command.
- `Menus`
  Use `Layer > Smart Objects > Rasterize`.
- `Keyboard`
  No dedicated default hotkey is described for Smart Object rasterization.

**User Interface Behavior**
- After rasterizing, the layer behaves like a normal pixel layer.
- Smart Object transforms, warps, and Smart Filters become fixed rather than remaining separately editable.

**Expected Result**
- The layer becomes directly pixel-editable, but Smart Object flexibility is lost.

**Practical Use Cases**
- Commit a Smart Object when no further non-destructive source editing is needed.
- Prepare the layer for direct painting or pixel tools that cannot operate on a Smart Object.

**Related Entries**
- Previous: Convert Smart Objects to layers
- Next: Export the contents of an embedded Smart Object
