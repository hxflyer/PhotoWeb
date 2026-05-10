# Graphics Processor (GPU) Card Usage

- Entry Type: Performance behavior reference
- Category: Get started > Technical requirements and installation
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/technical-requirements-installation/photoshop-and-graphics-processor-gpu-card-usage.html

**Function Summary**
This page explains how Photoshop uses the graphics processor, which GPU modes can appear, which features benefit from acceleration, and what happens when GPU support is limited, disabled, or unavailable.

**What This Entry Explains**
- minimum GPU expectations
- how to check Photoshop GPU compatibility
- how to inspect current GPU mode while working
- which features are accelerated by the GPU
- which features may fail without GPU support
- limits around multi-GPU systems and virtual machines

**How To Check GPU Compatibility**
- Open `Help > GPU Compatibility` to view Photoshop's compatibility report.
- While editing, inspect `GPU Mode` from the document status area or the `Info` panel to verify the active rendering path.

**GPU Modes Mentioned Here**
- `CPU`
  Photoshop is not using GPU acceleration for the current document
- `D3D12`
  preferred modern Windows GPU mode
- `Software`
  fallback software-rendering path on Windows
- `Metal`
  preferred modern macOS GPU mode
- `Legacy OpenGL`
  older GPU path used when modern preferred modes are not active

**Features That Benefit From GPU Usage**
- Artboards
- Blur Gallery
- Camera Raw
- Image Size with Preserve Details
- Lens Blur
- Neural Filters
- Select Focus
- Select and Mask
- Smart Sharpen

**Features That May Not Work Without GPU Support**
- 3D
- Birds Eye View
- Flick Panning
- Oil Paint
- Perspective Warp
- Render effects such as Flame, Picture Frame, and Tree
- Scrubby Zoom
- Smooth Brush Resizing

**Operational Limits**
- Photoshop does not scale work across multiple graphics cards in the way some users expect.
- Conflicting GPU drivers can reduce stability.
- VM and remote-desktop GPU workflows are not broadly supported for full graphics-processor operation.

**Expected Result**
- You should understand whether the GPU is active, how Photoshop is using it, and which editing features depend on it most.

**Related Entries**
- Previous: Use the graphics processor
- Next: Windows HEIF and HEVC codecs
