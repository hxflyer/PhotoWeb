# Resample Option in the Image Size Dialog

- Entry Type: Image Size setting
- Category: Crop, resize, and transform > Resize and adjust resolution
- Source: https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resample-option-in-image-size-dialog-box.html

**Function Summary**
The `Resample` checkbox controls whether Photoshop adds or removes pixels when you change image dimensions.

**What This Function Does**
- Adds pixels when enlarging an image
- Removes pixels when reducing an image
- Lets you separate pixel resizing from print-size-only changes
- Unlocks the resampling method menu in `Image Size`

**Where You Find It**
- `Image > Image Size`

**Primary Interface Elements**
- `Image Size`
- `Resample`
- `Width`
- `Height`
- `Resolution`
- resampling method menu

**How To Use It**
1. Open `Image > Image Size`.
2. Turn `Resample` on if you want Photoshop to change the actual pixel count.
3. Edit `Width`, `Height`, or `Resolution`.
4. Choose an appropriate resampling method if needed.
5. Confirm the change with `OK`.

**Mouse, Keyboard, and Menu Input**
- Mouse: click the `Resample` checkbox, then edit the numeric fields.
- Menu path: `Image > Image Size`

**User Interface Behavior**
- With `Resample` off, Photoshop preserves existing pixels and only redistributes print dimensions and resolution values.
- With `Resample` on, changing size also changes file detail, file size, and total pixel count.

**Expected Result**
- The document is resized either by preserving original pixels or by recalculating them, depending on the `Resample` state.

**Related Entries**
- Previous: Set Image Size and Resolution
- Next: Monitor Resolution and Image Display Size
