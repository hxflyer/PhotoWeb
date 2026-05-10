# Specify Content to Protect When Scaling

- Entry Type: Content-Aware Scale protection workflow
- Category: Crop, resize, and transform > Resize and adjust resolution
- Source: https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/specify-content-to-protect-when-scaling.html

**Function Summary**
This workflow uses an alpha channel to tell `Content-Aware Scale` exactly which area should be preserved.

**What This Function Does**
- protects a manually chosen subject from distortion
- improves Content-Aware Scale results on complex images
- gives more control than relying on automatic detection alone

**Where You Find It**
- `Channels` panel for saving the protection area
- `Edit > Content-Aware Scale`

**Primary Interface Elements**
- `Save Selection as Channel`
- `Channels`
- `Protect`
- bounding box handles

**How To Use It**
1. Make a selection around the part of the image that must stay stable.
2. Save that selection as a channel in the `Channels` panel.
3. If needed, choose `Select > All` for a background layer.
4. Run `Edit > Content-Aware Scale`.
5. Choose the saved channel from the `Protect` menu.
6. Drag the transform handles and commit the result.

**Mouse, Keyboard, and Menu Input**
- Mouse: create the selection, save it in `Channels`, then drag scaling handles.
- Menu path: `Edit > Content-Aware Scale`
- Menu path: `Select > All` when scaling a background layer

**User Interface Behavior**
- The protected region is treated as a high-priority area during scaling.
- Surrounding image areas absorb more of the stretch or compression.

**Expected Result**
- The protected subject keeps its shape more reliably while the rest of the image is adapted to the new aspect ratio.

**Related Entries**
- Previous: Preserve Visual Content When Scaling Images
- Next: Resize Images
