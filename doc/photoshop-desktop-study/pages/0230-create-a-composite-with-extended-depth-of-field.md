# Create a Composite with Extended Depth of Field

- Entry Type: Focus-stacking workflow
- Category: Create masks > Blend images
- Source: https://helpx.adobe.com/photoshop/desktop/create-masks/blend-images/create-a-composite-with-extended-depth-of-field.html

**Function Summary**
This workflow combines multiple photos focused at different distances into one image with broader apparent sharpness.

**What This Function Does**
- loads several focus-variant images as layers
- aligns the layers
- blends the sharpest regions from each image into one composite

**Where You Find It**
- `Adobe Bridge > Tools > Photoshop > Load Files into Photoshop Layers`
- `Edit > Auto-Align Layers`
- `Edit > Auto-Blend Layers`

**Primary Interface Elements**
- `Load Files into Photoshop Layers`
- `Auto-Align Layers`
- `Auto-Blend Layers`
- `Stack Images`
- `Panorama`

**How To Use It**
1. Load the source images into one document as layers.
2. Select those layers.
3. Run `Edit > Auto-Align Layers`.
4. Run `Edit > Auto-Blend Layers`.
5. Choose `Stack Images` for depth-of-field blending and confirm.

**User Interface Behavior**
- Photoshop first aligns the sources, then applies masks to preserve the sharpest focus zones from each frame.

**Expected Result**
- The final image appears in focus across a greater depth range than any single source image alone.

**Related Entries**
- Previous: Auto-Blend Layers Command Overview
