# Paint with Image States from the History Panel

- Entry Type: Selective restoration tool workflow
- Category: Get started > Set up toolbars and panels
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/paint-image-states.html

**Function Summary**
This workflow uses the History Brush tool to paint pixels from an earlier history state or snapshot into the current image. It is a selective restoration method that lets you recover or blend previous image content in specific areas only.

**What This Function Does**
- Uses an earlier state as a paint source
- Restores previous pixel appearance in selected painted areas
- Lets you keep newer edits in some areas while bringing back older content elsewhere
- Supports both normal History Brush and the more stylized Art History Brush path

**Where You Find It**
- `Window > History`
- `History Brush Tool` in the toolbar
- Shortcut: `Y`

**Primary Interface Elements**
- `History` panel
- source-state brush icon
- `History Brush Tool`
- `Art History Brush Tool`
- Options bar settings such as size and hardness

**How To Use It**
1. Open the `History` panel.
2. In the left column beside a history state or snapshot, click to mark it as the source for the History Brush.
3. Select the `History Brush Tool` with `Y`.
4. Adjust the brush settings in the Options bar, including size and hardness.
5. Paint over the area where you want to restore content from the chosen source state.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Click the source-state indicator in the History panel, then paint on the canvas.
- `Keyboard`
  Press `Y` to activate the History Brush tool.
- `Menus`
  Use `Window > History` to reveal the history source list.

**User Interface Behavior**
- The selected source state is marked with a brush icon in the History panel.
- Painting restores or samples from that earlier state while leaving untouched areas in the current version unchanged.
- The tool normally paints from the same layer in the source state to the same layer in the current state unless a merged snapshot is used.
- The Art History Brush uses the same state logic but applies a more stylized result.

**Expected Result**
- Only the brushed regions revert toward the chosen earlier state.
- The rest of the image can keep later edits.

**Related Assets**
- History Brush example: [Before and after selective restoration](../images/0046-paint-with-image-states-from-the-history-panel/01-before-and-after-comparison-of-a-hot-air.png)

**Practical Use Cases**
- Restore part of an image after a filter affects too much of the frame.
- Bring back original detail in a face, edge, or object after aggressive editing.
- Blend old and new edit states in one file without full rollback.

**Related Entries**
- Previous: Use snapshots in the History panel
- Next: Manage image states
