# Use The Graphics Processor

- Entry Type: Feature setting
- Category: Get started > Technical requirements and installation
- Source: https://helpx.adobe.com/photoshop/desktop/get-started/technical-requirements-installation/enable-photoshop-to-use-the-graphics-processor.html

**Function Summary**
This setting allows Photoshop to use the system GPU for supported visual processing tasks. It affects performance-sensitive features such as blur effects, sharpening, some AI-assisted tools, and other display or rendering operations that benefit from graphics acceleration.

**What This Feature Does**
- Enables GPU acceleration for supported Photoshop features
- Improves responsiveness in graphics-intensive workflows
- Unlocks certain advanced processing options such as OpenCL-dependent behavior on supported hardware
- Helps Photoshop use the correct hardware path for performance-heavy filters and previews

**Where You Find It**
- Windows: `Edit > Preferences > Performance`
- macOS: `Photoshop > Settings > Performance`

**Main Controls**
- `Use Graphics Processor`
  Enables or disables Photoshop GPU acceleration
- `Advanced Settings`
  Opens additional GPU-related options
- `Use OpenCL`
  Allows supported features to use OpenCL-enabled graphics processing on compatible hardware

**How To Use It**
1. Open the `Performance` settings panel.
2. Find the `Graphics Processor Settings` area.
3. Turn on `Use Graphics Processor`.
4. Open `Advanced Settings` if you need to adjust GPU behavior.
5. Enable `Use OpenCL` if your card and driver support it and your workflow needs the related acceleration path.

**User Interface Behavior**
- This is a preferences-level setting, not a canvas tool.
- It appears inside the `Performance` preferences screen.
- If Photoshop cannot use the GPU, the option may be unavailable, limited, or associated with compatibility warnings.

**Expected Result**
- Supported filters and rendering tasks should feel more responsive.
- GPU-dependent features are more likely to operate correctly.
- On unsupported hardware or problematic drivers, Photoshop may disable or restrict the setting.

**Practical Usage Notes**
- Use this setting when Photoshop feels slow during visually intensive edits.
- Recheck it after driver updates, system changes, or GPU troubleshooting.
- On multi-GPU systems, make sure Photoshop is using the intended high-performance graphics device.

**Related Features**
- Blur Gallery
- Smart Sharpen
- Select Focus Area
- Image Size with Preserve Details
- Neural Filters

**Related Entries**
- Previous: Adobe Photoshop on desktop technical requirements
- Next: Graphics processor (GPU) card usage
