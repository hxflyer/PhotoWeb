# Restore Parts of an Image to a Previous State

- Entry Type: Partial state restoration workflow
- Category: Get started > Set up toolbars and panels
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/restore-image-parts.html

**Function Summary**
This workflow restores selected parts of an image from an earlier state without rolling back the entire document. It combines several Photoshop tools that can pull older image data into specific regions only.

**What This Function Does**
- Restores earlier image content in selected areas
- Preserves newer edits in untouched areas
- Supports multiple restoration methods depending on the tool you prefer

**Where You Find It**
- `Window > History`
- `History Brush Tool`
- `Eraser Tool` with `Erase To History`
- `Edit > Fill` with `History` content

**Primary Restoration Methods**
- `History Brush`
  Paints previous-state pixels into chosen areas
- `Erase To History`
  Uses the eraser workflow to reveal earlier state content
- `Fill with History`
  Replaces a selected area with history-state content in one command

**How To Restore with the History Brush**
1. Open `Window > History`.
2. In the left source column, mark the history state or snapshot you want to paint from.
3. Select the `History Brush Tool`.
4. Paint over the areas you want to restore.

**How To Restore with the Eraser Tool**
1. Select the `Eraser Tool`.
2. Enable `Erase To History` in the Options bar.
3. Drag over the parts of the image you want to restore from the earlier state.

**How To Restore with the Fill Command**
1. Make a selection for the area you want to restore.
2. Open `Edit > Fill`.
3. Set `Contents` to `History`.
4. Confirm with `OK`.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Paint or drag over the target area when using the History Brush or Eraser methods.
- `Menus`
  Use `Window > History` and `Edit > Fill` for source selection and fill-based restoration.
- `Keyboard`
  Shortcut behavior depends on the selected tool, but the feature is primarily controlled through the History panel and tool options.

**User Interface Behavior**
- Only the affected painted or selected region is restored.
- The chosen history source remains available until you change it in the History panel.
- Enabling `Automatically Create First Snapshot` can make it easier to preserve the original starting point for restoration work.

**Expected Result**
- Specific image areas can be recovered from an earlier point without sacrificing later work elsewhere in the document.

**Practical Use Cases**
- Restore an over-edited face or object after a global filter.
- Bring back part of the original texture after aggressive retouching.
- Recover a selected region while preserving newer edits on the rest of the canvas.

**Related Entries**
- Previous: Manage image states
