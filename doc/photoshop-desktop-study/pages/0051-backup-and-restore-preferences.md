# Backup and Restore Preferences

- Entry Type: Preference file recovery workflow
- Category: Get started > Settings and preferences
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/settings-and-preferences/backup-and-restore-preferences.html

**Function Summary**
This workflow protects custom Photoshop settings by copying the preference files to a safe location and restoring them later if needed. It is useful before updates, after crashes, or when moving to another computer.

**What This Function Does**
- Preserves customized Photoshop settings outside the live preference folder
- Restores a known-good preference set after reinstalling or troubleshooting
- Helps transfer a tuned Photoshop setup between environments

**Where You Find It**
- macOS preferences folder:
  `Users/<user name>/Library/Preferences/Adobe Photoshop <version> Settings`
- Windows preferences folder:
  `Users/<user name>/App Data/Roaming/Adobe/Adobe Photoshop <version>/Adobe Photoshop <version> Settings`

**Primary Interface Elements**
- Photoshop settings folder
- Finder `Go` menu with `Option` key on macOS
- backup copy location
- restored settings folder

**How To Back Up Preferences**
1. Close Photoshop completely.
2. Navigate to the Photoshop settings folder for your operating system.
3. Copy the entire `Adobe Photoshop <version> Settings` folder to another safe location.
4. Label the backup with the Photoshop version and date.

**How To Restore Preferences**
1. Close Photoshop completely.
2. Navigate to the active Photoshop settings folder.
3. Rename or move the current settings folder so you keep a temporary fallback copy.
4. Copy the backed-up settings folder into the original location.
5. Launch Photoshop and verify that your expected preferences, workspace settings, and shortcuts are restored.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Use Finder or File Explorer to copy, rename, and replace the settings folders.
- `Keyboard`
  On macOS, hold `Option` while opening the Finder `Go` menu to reveal the hidden `Library` location.
- `Menus`
  The main workflow happens at the operating system file level rather than inside a Photoshop dialog.

**User Interface Behavior**
- Photoshop must be closed before copying or replacing the settings folder to avoid conflicts.
- The restored folder can bring back workspace layout, shortcuts, and many personal settings.
- Version-specific folder names matter, so backups should be labeled clearly.

**Expected Result**
- You can recover a customized setup quickly after reinstalling, corruption, or machine changes.

**Practical Use Cases**
- Back up preferences before a major Photoshop update.
- Restore a known-good setup after troubleshooting.
- Move a personalized workspace and shortcut set to a second computer.

**Related Entries**
- Previous: Adjust preferences
- Next: Reset preferences
