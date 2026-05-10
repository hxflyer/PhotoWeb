# Convert Smart Objects to Layers

- Entry Type: Smart Object unpacking workflow
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/convert-smart-objects-to-layers.html

**Function Summary**
This workflow unpacks a Smart Object back into its component layers inside the current document. It is used when the user needs direct access to the original internal layer structure.

**What This Function Does**
- Restores the internal layers of a Smart Object
- Places multiple restored layers into a new group
- Removes the Smart Object wrapper around that content

**Where You Find It**
- `Window > Layers`
- layer context menu
- `Convert To Layers`

**Primary Interface Elements**
- selected Smart Object layer
- `Convert To Layers`
- resulting group folder in the Layers panel

**How To Use It**
1. Open `Window > Layers`.
2. Select the Smart Object layer.
3. Right-click the layer and choose `Convert To Layers`.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Select the Smart Object in the Layers panel and use the context menu command.
- `Menus`
  The article emphasizes the layer context menu path.
- `Keyboard`
  No dedicated default hotkey is described for this conversion.

**User Interface Behavior**
- If the Smart Object contains multiple layers, Photoshop restores them inside a new folder.
- Multi-layer conversion discards Smart Object transforms and Smart Filters that were applied at the wrapper level.

**Expected Result**
- The Smart Object becomes directly editable as ordinary layers again.

**Related Entries**
- Previous: Replace the contents of a Smart Object
- Next: Rasterize Smart Objects
