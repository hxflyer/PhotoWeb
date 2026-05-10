# Change Print Dimensions and Resolution

- Entry Type: Print-size workflow
- Category: Crop, resize, and transform > Resize and adjust resolution
- Source: https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/change-print-dimensions-and-resolution.html

**Function Summary**
This workflow adjusts print width, height, and resolution without changing the image's existing pixels.

**What This Function Does**
- changes print metadata
- preserves total pixel count
- lets users trade physical print size against resolution

**Where You Find It**
- `Image > Image Size`

**Primary Interface Elements**
- `Width`
- `Height`
- `Resolution`
- `Resample`

**How To Use It**
1. Open `Image > Image Size`.
2. Turn `Resample` off.
3. Enter new print dimensions or a new `Resolution` value.
4. Review the linked changes to the other fields.
5. Click `OK`.

**Mouse, Keyboard, and Menu Input**
- Menu path: `Image > Image Size`
- Mouse: toggle `Resample` off, then edit the size and resolution fields.

**User Interface Behavior**
- With `Resample` disabled, Photoshop keeps the original pixel data and recalculates print size relationships only.
- Increasing `Resolution` will reduce print size if pixel count stays fixed.

**Expected Result**
- The image prints at a different physical size or density without being resampled.

**Related Entries**
- Previous: Change the Pixel Dimensions of Images
- Next: Manage Image File Size
