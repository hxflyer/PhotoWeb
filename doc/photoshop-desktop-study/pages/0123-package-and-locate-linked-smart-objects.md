# Package and Locate Linked Smart Objects

- Entry Type: Linked asset packaging and relink workflow
- Category: Create and manage layers > Smart objects
- Source: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/package-linked-smart-objects.html

**Function Summary**
This workflow collects a Photoshop document and its linked files into one folder, and it also covers how to relink missing Smart Object sources later.

**What This Function Does**
- Packages the PSD together with linked source, audio, and video files
- Helps preserve project structure for transfer or archiving
- Restores broken Smart Object links when a source file moves

**Where You Find It**
- `File > Package`
- relink dialog
- `Relink`

**Primary Interface Elements**
- `Package`
- packaged project folder
- `Relink`
- `Place`
- `OK`

**How To Package Linked Smart Objects**
1. Save the Photoshop document first.
2. Choose `File > Package`.
3. Select the destination folder.
4. Let Photoshop create the packaged folder containing the document and its linked files.
5. Review the packaged folder afterward if you want to verify its contents.

**How To Relink Missing Smart Objects**
1. Open the document and wait for Photoshop to show the relink dialog if a source is missing.
2. Choose `Relink`.
3. Browse to the file's new location.
4. Confirm with `Place`.
5. Select `OK` to restore the link.

**Mouse, Keyboard, and Menu Input**
- `Mouse`
  Choose the package destination and browse to replacement file paths when relinking.
- `Menus`
  Use `File > Package` for packaging.
- `Keyboard`
  No dedicated default hotkey is described for packaging or relinking.

**User Interface Behavior**
- Photoshop first searches relative and previously known locations when a linked file is missing.
- Packaging is designed to keep external dependencies traveling with the document instead of being scattered across the system.

**Expected Result**
- A project becomes easier to move or share, and broken links become easier to repair when source files are relocated.

**Related Assets**
- Relink dialog example: [Relink dialog with missing-file path](../images/0123-package-and-locate-linked-smart-objects/01-the-relink-dialog-box-shows-the-missing-.jpg)

**Related Entries**
- Previous: Embed Linked Smart Objects
- Next: Convert embedded Smart Objects to linked
