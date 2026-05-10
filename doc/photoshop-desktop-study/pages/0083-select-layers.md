# Select Layers

- Entry Type: Layer selection workflow
- Category: Create and manage layers > Transform and manipulate layers
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/select-layers.html

**Function Summary**
This workflow controls how one or more layers are selected for editing, moving, transforming, aligning, or organizing. Photoshop supports selection from both the Layers panel and directly from the document window.

**What This Function Does**
- Selects one or many layers
- Supports contiguous and non-contiguous multi-selection
- Supports document-window selection using the Move tool
- Keeps selection behavior separate from layer linking

**Where You Find It**
- Layers panel
- document window with the `Move` tool
- `Select > All Layers`
- `Select > Similar Layers`
- `Select > Deselect Layers`

**Primary Interface Elements**
- Layers panel
- `Move` tool
- `Auto Select`
- `Layer`
- `Group`
- layer thumbnail
- group expand triangle

**How To Select Layers in the Layers Panel**
1. Open the Layers panel.
2. Click one layer to select it.
3. `Shift`-click to select a contiguous range.
4. `Ctrl`-click on Windows or `Command`-click on macOS to select non-contiguous layers.
5. Use `Select > All Layers` to select the full stack.
6. Use `Select > Similar Layers` to select related layer types.
7. Use `Select > Deselect Layers` to clear the selection.

**How To Select Layers in the Document Window**
1. Select the `Move` tool.
2. In the Options bar, enable `Auto Select > Layer` if you want Photoshop to select the top matching layer under the pointer.
3. Use `Auto Select > Group` if you want to select the top matching group instead.
4. Right-click on Windows or Control-click on macOS in the document to choose a layer from the context menu if several layers overlap.

**How To Select a Layer Inside a Group**
1. Select the group in the Layers panel.
2. Expand it with the triangle control.
3. Click the specific layer inside the group.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Click layers in the panel, use the Move tool on the canvas, or choose from the layer context menu.
- `Keyboard`
  Use `Shift` for ranges and `Ctrl` / `Command` for non-contiguous multi-selection.
- `Menus`
  Use the `Select` menu for all-layers, similar-layers, and deselect commands.

**User Interface Behavior**
- Selecting the layer name area chooses the layer itself.
- Clicking the layer thumbnail can target non-transparent pixels rather than simply changing active layer selection.
- Linked layers remain linked even after the active selection changes.

**Expected Result**
- The intended layer set becomes active for edits, transforms, or organization operations.

**Related Entries**
- Next: Group and ungroup layers
