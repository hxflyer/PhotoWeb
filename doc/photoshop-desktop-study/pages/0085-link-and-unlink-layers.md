# Link and Unlink Layers

- Entry Type: Persistent layer relationship control
- Category: Create and manage layers > Transform and manipulate layers
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/link-and-unlink-layers.html

**Function Summary**
Linking layers creates a persistent relationship between layers or groups so they continue moving or transforming together even after the active selection changes.

**What This Function Does**
- Links two or more layers or groups
- Preserves the relationship independently of current selection state
- Allows linked layers to be moved or transformed together
- Supports temporary disabling of a link without deleting it fully

**Where You Find It**
- Layers panel
- `Link layers` control
- `Layer > Select Linked Layers`

**Primary Interface Elements**
- selected layers or groups
- `Link layers`
- linked-layer icon
- red `X` disabled-link indicator
- `Select Linked Layers`

**How To Link Layers**
1. Select the layers or groups in the Layers panel.
2. Click `Link layers` in the Layers panel.

**How To Unlink or Temporarily Disable**
1. Select a linked layer and click `Link layers` again to remove the link.
2. `Shift`-click the link icon if you want to disable the link temporarily.
3. `Shift`-click the icon again to re-enable it.
4. Use `Layer > Select Linked Layers` if you want Photoshop to activate all layers connected to one linked layer.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Select the layers, click the link control, and `Shift`-click the link icon for temporary disabling.
- `Menus`
  Use `Layer > Select Linked Layers` to retrieve the full linked set.
- `Keyboard`
  `Shift` modifies the click behavior for temporary disable and re-enable.

**User Interface Behavior**
- Linked layers remain associated even when only one of them is actively selected later.
- Temporary link disable shows a red `X` on the link icon.
- Linked state is different from multi-selection, which only lasts for the current selection session.

**Expected Result**
- Related layers continue behaving as a coordinated set during movement and transformation tasks.

**Related Entries**
- Previous: Group and ungroup layers
- Next: Display layer edges and handles
