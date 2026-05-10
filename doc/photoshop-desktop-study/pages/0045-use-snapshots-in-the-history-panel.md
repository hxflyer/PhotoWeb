# Use Snapshots in the History Panel

- Entry Type: History workflow tool
- Category: Get started > Set up toolbars and panels
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/create-work-snapshots.html

**Function Summary**
Snapshots store temporary checkpoint versions of the current image within the active session. They are used to preserve important edit stages, compare alternatives, and branch experiments without creating separate files.

**What This Function Does**
- Saves temporary image checkpoints during the open session
- Preserves a full document, merged result, or current-layer state
- Supports fast compare, revert, rename, delete, and document-creation actions

**Where You Find It**
- `Window > History`
- `Create New Snapshot` inside the History panel
- History panel menu options

**Primary Interface Elements**
- `History` panel
- `Create New Snapshot`
- `New Snapshot` dialog
- `From` dropdown
- `Full Document`
- `Merged Layers`
- `Current Layer`
- snapshot entries
- `Delete current state`
- `Create a new document from current state`

**How To Use It**
1. Open `Window > History`.
2. Click `Create New Snapshot`.
3. Enter a descriptive snapshot name.
4. Choose the snapshot source from `Full Document`, `Merged Layers`, or `Current Layer`.
5. Confirm with `OK`.
6. Click a snapshot later to return the image view to that stored state.

**Snapshot Management Actions**
- `Apply`
  Click a snapshot to return to that state
- `Rename`
  Double-click the snapshot name and enter a new label
- `Delete`
  Select the snapshot and delete it from the panel
- `Create file`
  Use the new-document command to generate a new document from the snapshot or state

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Use the History panel buttons and snapshot entries directly.
- `Menus`
  Open the panel from `Window > History`.
- `Keyboard`
  No dedicated default hotkey is described for snapshot creation.

**User Interface Behavior**
- Snapshots exist only for the current session and are cleared when the document is closed unless separately saved through other workflows.
- Choosing a snapshot and continuing to edit can remove later states unless `Allow Non-Linear History` is enabled.
- A snapshot can represent the full file, a merged view, or only the current layer depending on the chosen source.

**Expected Result**
- Major edit checkpoints stay available while you experiment freely.
- Comparing alternate versions becomes faster than using duplicate files for every branch.

**Related Assets**
- Snapshot example: [History panel showing snapshots](../images/0045-use-snapshots-in-the-history-panel/01-the-history-panel-in-photoshop-showing-a.jpg)

**Practical Use Cases**
- Save a checkpoint before running a strong filter or retouch pass.
- Compare several edit approaches in one session.
- Create a new file from an earlier state without destroying the current working version.

**Related Entries**
- Previous: View history logs
- Next: Paint with image states from the History panel
