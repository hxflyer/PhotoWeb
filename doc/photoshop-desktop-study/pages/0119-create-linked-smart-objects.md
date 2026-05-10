# Create Linked Smart Objects

- Entry Type: Linked Smart Object creation workflow
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/create-linked-smart-objects.html

**Function Summary**
This workflow creates a Smart Object that references an external source file instead of embedding the source inside the PSD. It is used when one asset should stay shared across documents or remain updateable from outside Photoshop.

**What This Function Does**
- Places a file as a linked Smart Object
- Keeps the source external to the Photoshop document
- Supports automatic updates when the linked source changes

**Where You Find It**
- `File > Place Linked`
- drag-and-drop with `Alt` on Windows or `Option` on macOS
- `Preferences > General > Always Create Smart Objects While Placing`

**Primary Interface Elements**
- `Place Linked`
- linked Smart Object layer
- link icon in the Layers panel
- `Place`

**How To Use It**
1. Open or create the Photoshop document.
2. Choose `File > Place Linked`.
3. Select the file you want to link.
4. Place it in the document.
5. Use the linked Smart Object normally, knowing its source remains external.

**Alternate Shortcut Workflow**
- Hold `Alt` on Windows or `Option` on macOS and drag a file into the document to create a linked Smart Object directly.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Place the linked file and confirm its placement on the canvas.
- `Keyboard`
  Use `Alt` or `Option` during drag-and-drop for the shortcut creation path.
- `Menus`
  Use `File > Place Linked` for the standard menu workflow.

**User Interface Behavior**
- Linked Smart Objects show a link indicator in the Layers panel.
- Changes to the external source can update the Photoshop document when the link is active and resolvable.
- If `Always Create Smart Objects While Placing` is disabled, normal file placement can produce regular layers instead.

**Expected Result**
- The Photoshop document references a reusable external asset rather than embedding a separate copy inside itself.

**Related Entries**
- Previous: Create embedded Smart Objects
- Next: Update Linked Smart Objects
