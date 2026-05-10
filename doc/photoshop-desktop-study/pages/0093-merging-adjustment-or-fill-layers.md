# Merging Adjustment or Fill Layers

- Entry Type: Destructive flattening workflow
- Category: Create and manage layers > Color adjustment and fill layers
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/merging-adjustment-or-fill-layers.html

**Function Summary**
This workflow combines an adjustment layer or fill layer into underlying content, making the effect permanent. It is used when an edit no longer needs to stay non-destructive and the user wants a simpler layer structure.

**What This Function Does**
- Merges an adjustment or fill with underlying layers in supported merge operations
- Rasterizes the effect into pixel content when merged downward
- Reduces edit flexibility in exchange for a flatter layer structure

**Where You Use It**
- In merge workflows involving the layer below, selected layers, visible layers, or grouped layers

**Primary Behavior Notes**
- Adjustment or fill layers cannot act as the merge target layer
- Merging downward permanently applies the effect to the layer below
- Fill layers can also be rasterized without being merged into another layer

**How To Think About It**
1. Keep the layer separate if you want continued editability.
2. Merge only when you are ready to commit the look permanently.
3. Use rasterizing when you want pixel content without necessarily combining it immediately into a broader stack.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Select the relevant layer and use the merge workflow appropriate to your current stack.
- `Menus`
  The article discusses merge behavior conceptually rather than listing a single command sequence.
- `Keyboard`
  No dedicated default hotkey is described in this entry.

**User Interface Behavior**
- After merging, the correction is baked into pixel content.
- Non-destructive flexibility is reduced because the separate adjustment controls are removed.
- White-only masks on adjustment or fill layers do not meaningfully inflate file size, so merging only to save space is usually unnecessary.

**Expected Result**
- The visual result remains, but the independent adjustment or fill layer is no longer available as a separate editable control.

**Related Entries**
- Previous: Create adjustment layers
- Next: Adjustment presets overview
