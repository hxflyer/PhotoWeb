# Manage Image States

- Entry Type: History state management
- Category: Get started > Set up toolbars and panels
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/manage-image-states.html

**Function Summary**
This History panel workflow covers how to create new documents from states, move backward or forward through the history list, delete states, and clear stored histories. It is the broader state-management layer built on top of Photoshop's automatic history recording.

**What This Function Does**
- Creates new documents from a selected state or snapshot
- Reverts the active image to an earlier recorded point
- Steps backward or forward through stored states
- Deletes one state, later states, or entire history stacks

**Where You Find It**
- `Window > History`
- History panel buttons and menu
- `Edit > Step Backward`
- `Edit > Step Forward`
- `File > Revert`
- `Edit > Purge > Histories`

**Primary Interface Elements**
- history state list
- snapshot list
- `Create a new document from current state`
- `Step Forward`
- `Step Backward`
- `Delete current state`
- `Clear History`
- `Purge > Histories`

**How To Use It**
1. Open `Window > History`.
2. Select a state or snapshot when you want to branch from it.
3. Click `Create a new document from current state` to generate a separate file from that point.
4. Click a state name to revert the current image to that earlier state.
5. Use `Step Backward` or `Step Forward` from the History panel menu or the `Edit` menu to move through the state list one step at a time.
6. Select a state and choose `Delete current state` if you want to remove that state and the changes after it.
7. Use `Clear History` or `Edit > Purge > Histories` when you need to free memory and discard stored histories.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Click history states, snapshots, and panel commands directly.
- `Menus`
  Use the History panel menu, `Edit > Step Backward`, `Edit > Step Forward`, `File > Revert`, and `Edit > Purge > Histories`.
- `Keyboard`
  Step navigation can also be driven through the menu-assigned shortcuts in your Photoshop setup.

**User Interface Behavior**
- Selecting an earlier state changes the active image to that recorded point.
- Creating a new document from a state preserves that point as a separate file branch.
- Deleting a state removes that point and any later dependent states from the history chain.
- Purging histories frees memory but removes the stored state path for open documents.

**Expected Result**
- Users gain finer control over how edit branches are reviewed, split, removed, or cleaned up.

**Practical Use Cases**
- Spin off a new file from an earlier version before testing another direction.
- Delete a bad branch of edits without closing the document.
- Purge histories when large files are consuming memory during long sessions.

**Related Entries**
- Previous: Paint with image states from the History panel
- Next: Restore parts of an image to a previous state
