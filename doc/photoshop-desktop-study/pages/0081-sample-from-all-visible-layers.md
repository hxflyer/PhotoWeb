# Sample from All Visible Layers

- Entry Type: Tool sampling behavior
- Category: Create and manage layers > Get started with layers
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/sample-from-all-visible-layers.html

**Function Summary**
This sampling mode lets supported tools read pixel information from all visible layers together instead of from only the active layer. It is mainly used for retouching and color sampling in multi-layer documents.

**What This Function Does**
- Reads combined visible pixel data across the document
- Supports more natural retouching on layered files
- Preserves non-destructive workflows by letting edits happen on separate layers while sampling from the full visible result

**Where You Find It**
- Supported tools such as `Eyedropper`, `Healing Brush`, and `Clone Stamp`
- `Sample` dropdown in tool options

**Primary Interface Elements**
- `Sample`
- `All Layers`
- `Eyedropper`
- `Healing Brush`
- `Clone Stamp`

**How To Use It**
1. Select a tool that supports multi-layer sampling.
2. Open the tool settings in the Options bar.
3. Set the `Sample` option to `All Layers`.
4. Use the tool normally to sample color, texture, or source data from the visible composite image.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Choose the tool, set `Sample` to `All Layers`, and then sample or retouch directly on the canvas.
- `Menus`
  This behavior is controlled from the tool's Options bar rather than a top-level application menu.
- `Keyboard`
  Shortcut behavior depends on the active tool, not on the sampling mode itself.

**User Interface Behavior**
- The tool reads from the visible combined image result instead of only the active layer.
- This makes sampling more accurate in documents where corrections, textures, or colors are spread across multiple layers.

**Expected Result**
- Retouching and sampling behave more naturally in layered documents while the user keeps edits on separate layers.

**Practical Use Cases**
- Clone or heal on a blank retouch layer while sampling from the full image stack.
- Sample final visible colors after adjustment layers are applied.

**Related Entries**
- Previous: Change transparency preferences
