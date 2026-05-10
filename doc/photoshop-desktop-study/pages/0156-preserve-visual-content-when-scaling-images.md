# Preserve Visual Content When Scaling Images

- Entry Type: Content-Aware Scale workflow
- Category: Crop, resize, and transform > Resize and adjust resolution
- Source: https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/preserve-visual-content-when-scaling-images.html

**Function Summary**
`Content-Aware Scale` resizes an image while trying to preserve visually important areas such as people or strong subject matter.

**What This Function Does**
- stretches or compresses an image unevenly
- protects important shapes better than standard scaling
- supports protected alpha channels and skin-tone preservation

**Where You Find It**
- `Edit > Content-Aware Scale`

**Primary Interface Elements**
- `Content-Aware Scale`
- bounding box handles
- `Amount`
- `Protect`
- `Protect Skin Tones`
- reference point controls
- width and height percentage fields

**How To Use It**
1. If the target is a locked background, choose `Select > All` first.
2. Choose `Edit > Content-Aware Scale`.
3. In the options bar, set `Amount`, `Protect`, or `Protect Skin Tones` if needed.
4. Drag side or corner handles to scale the image.
5. Commit the transform when the framing looks correct.

**Mouse, Keyboard, and Menu Input**
- Mouse: drag the transform handles on the canvas.
- Keyboard: hold `Shift` while dragging a corner if you want proportional scaling behavior.
- Menu path: `Edit > Content-Aware Scale`

**User Interface Behavior**
- Photoshop displays a transform box around the image.
- Protected areas resist distortion more than surrounding content.
- The `Protect` menu uses saved alpha channels as preservation guides.

**Expected Result**
- The image changes overall dimensions while important subjects keep more natural proportions than they would with normal scaling.

**Related Entries**
- Previous: Resolution Specs for Printing Images
- Next: Specify Content to Protect When Scaling
