# Update Linked Smart Objects

- Entry Type: Linked asset maintenance workflow
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/update-linked-smart-objects.html

**Function Summary**
This workflow refreshes linked Smart Objects when their external source files have changed, and it also covers relinking when the original source file path is missing.

**What This Function Does**
- Detects modified linked source files
- Updates one linked Smart Object or all modified linked Smart Objects
- Relinks missing source files to a new location

**Where You Find It**
- Layers panel
- `Update Modified Content`
- `Layer > Smart Objects > Update All Modified Content`
- `Relink to File`

**Primary Interface Elements**
- highlighted linked Smart Object layer
- missing-file indicator
- `Update Modified Content`
- `Update All Modified Content`
- `Relink to File`

**How To Update Modified Linked Smart Objects**
1. Open the Photoshop document.
2. In the Layers panel, locate any linked Smart Objects flagged as modified.
3. Right-click a flagged linked Smart Object and choose `Update Modified Content` if you want to refresh only that one.
4. Use `Layer > Smart Objects > Update All Modified Content` if you want to refresh every modified linked object in the file.

**How To Relink a Missing Source**
1. In the Layers panel, locate the linked Smart Object with the missing-file indicator.
2. Right-click it and choose `Relink to File`.
3. Browse to the file's new location.
4. Confirm the relink.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Right-click flagged layers to update or relink them.
- `Menus`
  Use `Layer > Smart Objects > Update All Modified Content` for a document-wide refresh.
- `Keyboard`
  No dedicated default hotkey is described for linked-object update management.

**User Interface Behavior**
- Photoshop updates linked Smart Objects automatically while the document is open when the source changes and the link remains valid.
- If the document was closed when the source changed, Photoshop flags the linked object on reopen.
- Photoshop checks the directly linked file, not nested linked content buried inside other Smart Objects.

**Expected Result**
- Linked assets stay synchronized with their source files, or their links are repaired when the source path changes.

**Related Assets**
- Linked-object relink example: [Missing linked Smart Object indicator](../images/0120-update-linked-smart-objects/01-the-layers-panel-is-open-and-is-showing-.jpg)

**Related Entries**
- Previous: Create linked Smart Objects
- Next: View Linked Smart Object properties
