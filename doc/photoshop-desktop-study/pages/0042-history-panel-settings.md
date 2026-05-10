# History Panel Settings

- Entry Type: History workflow configuration
- Category: Get started > Set up toolbars and panels
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/history-panel-overview.html

**Function Summary**
The History panel tracks recent image states during the current session so you can return to earlier points in the edit sequence. This entry covers the panel's behavior, common options, and the main settings that change how history and snapshots work.

**What This Function Does**
- Records edit states as you work
- Lets you move back to earlier states
- Supports snapshots for preserving important moments in the session
- Provides options such as non-linear history and snapshot automation

**Where You Find It**
- `Window > History`
- History-related preference path: `Preferences > Performance`
- History panel menu: `History Options`

**Primary Interface Elements**
- `History` panel
- history state list
- snapshot entries
- `History Options`
- `Allow Non-Linear History`
- `Automatically Create First Snapshot`
- `Automatically Create New Snapshot When Saving`
- `Show New Snapshot Dialog By Default`
- `Make Layer Visibility Changes Undoable`

**How To Use It**
1. Open the panel with `Window > History`.
2. Review the list of recorded states as you edit.
3. Click a state to return the image to that point in the session.
4. Use snapshots when you want to preserve major milestones before experimenting further.
5. Open the History panel menu and choose `History Options` to adjust snapshot and state behavior.
6. Increase the number of stored history states in `Preferences > Performance` if your workflow needs a deeper undo timeline.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Click history states, snapshots, and the panel menu options directly.
- `Menus`
  Use `Window > History` to open the panel and `Preferences > Performance` to adjust history-state depth.
- `Keyboard`
  Undo interacts with the History system, but this entry focuses on panel-based state management rather than a single shortcut.

**User Interface Behavior**
- Each edit is recorded as a separate history state during the open session.
- Selecting an earlier state can branch the edit path if non-linear history is not enabled.
- Dimmed states indicate changes that may be discarded if you continue from an earlier point.
- Closing the document clears session history states and snapshots.

**Expected Result**
- Users can inspect, revisit, and manage recent editing states more deliberately than with simple Undo alone.

**Related Assets**
- History panel example: [History panel open with recorded states](../images/0042-history-panel-settings/01-photoshop-interface-with-the-history-pan.jpg)

**Practical Use Cases**
- Keep long editing sessions safer by monitoring major state changes.
- Increase history depth for complex compositing work.
- Use snapshots and non-linear history while testing alternate edits.

**Related Entries**
- Previous: Use Undo and Redo commands
- Next: Set History Log preferences
