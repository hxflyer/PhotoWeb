# Photoweb vs Photoshop Notes: Function Comparison 0506-0544

Scope: final 39 generated Photoshop study note files in sorted order, from `0506` through `0544`.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation, a subset, or a UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes Adobe service/support/platform behavior more than an editor function.

Relevant Photoweb code areas:
- Export: `src/components/Dialogs/ExportDialog.tsx`, `src/App.tsx`, `src/components/layout/MenuBar.tsx`
- Save/load/autosave: `src/core/persistence.ts`, `src/store/documentSlice.ts`
- Keyboard shortcuts and tool shortcuts: `src/App.tsx`, `src/components/Panels/Toolbar.tsx`, `src/components/layout/MenuBar.tsx`
- Error feedback: `src/store/toastsSlice.ts`, `src/components/layout/ToastContainer.tsx`

## 0506 - Export Video Files Or Image Sequences

Source note: `pages/0506-export-video-files-or-image-sequences.md`

Function group: video/image-sequence export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Render Video`: `Missing`.
- `Export image sequence`: `Missing`.
- `Timeline/video settings`: `Missing`.

Implementation notes:
- Photoweb has no timeline or video document model.

## 0507 - Photoshop File Formats Overview

Source note: `pages/0507-photoshop-file-formats-overview.md`

Function group: supported Photoshop file formats.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Native editable document format`: `Present`. The `.pwbdoc` manifest now round-trips layer masks (with density/feather), type data, adjustment params, fill data, layer effects, locks, and color tags, preserving non-destructive workflows across save/load. Backwards compatible with v1 manifests.
- `Raster image import/export`: `Partial`. Browser-supported images can open/import; PNG/JPEG/WebP/GIF export exists.
- `PSD/PSB/TIFF/PDF/EPS/RAW/video formats`: `Missing`.

Implementation notes:
- Format support is web-app/browser oriented, not Photoshop-compatible. The native `.pwbdoc` format preserves the full non-destructive document state.

## 0508 - File Compression In Photoshop

Source note: `pages/0508-file-compression-in-photoshop.md`

Function group: file compression options.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `JPEG/WebP quality control`: `Present with differences`.
- `PNG/GIF canvas export`: `Present with differences`.
- `PSD/TIFF/PDF compression controls`: `Missing`.

Implementation notes:
- `ExportDialog` exposes simple format/quality behavior.

## 0509 - Supported File Formats In Photoshop

Source note: `pages/0509-supported-file-formats-in-photoshop.md`

Function group: full supported file format list.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Open common browser image formats`: `Partial`.
- `Export PNG/JPEG/WebP/GIF`: `Present with differences`.
- `Professional/legacy/video/RAW formats`: `Missing`.

Implementation notes:
- Import format coverage depends on browser image decoding.

## 0510 - Image File Formats Supported In Photoshop

Source note: `pages/0510-image-file-formats-supported-in-photoshop.md`

Function group: image file format compatibility.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Browser-supported raster input`: `Partial`.
- `Common web raster export`: `Present with differences`.
- `Photoshop-specific format matrix`: `Missing`.

Implementation notes:
- Photoweb does not publish a format support matrix.

## 0511 - Export Your Work Using The Quick Export As Option

Source note: `pages/0511-export-your-work-using-the-quick-export-as-option.md`

Function group: Quick Export.

Overall Photoweb status: `Present with differences`

Sub-function comparison:
- `Quick Export as PNG`: `Present with differences`.
- `One-click download`: `Present with differences`.
- `Quick Export preferences/location/format customization`: `Missing`.

Implementation notes:
- Quick export uses a browser download.

## 0512 - Fine-Tune Export Settings With Export As

Source note: `pages/0512-fine-tune-export-settings-with-export-as.md`

Function group: Export As dialog.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Choose export format`: `Present with differences`.
- `JPEG/WebP quality`: `Present with differences`.
- `Size scaling, metadata, color space, multiple assets`: `Missing`.

Implementation notes:
- `ExportDialog` is useful but much smaller than Photoshop Export As.

## 0513 - Export Settings And Export Location Preferences

Source note: `pages/0513-export-settings-and-export-location-preferences.md`

Function group: export preferences.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Quick Export format preference`: `Missing`.
- `Export location preference`: `Missing`.
- `Metadata/color conversion preferences`: `Missing`.

Implementation notes:
- Browser downloads handle destination choices outside the app.

## 0514 - Export Files In Different Sizes

Source note: `pages/0514-export-files-in-different-sizes.md`

Function group: multi-size asset export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Export multiple scale sizes`: `Missing`.
- `1x/2x/3x suffix generation`: `Missing`.
- `Batch asset scaling`: `Missing`.

Implementation notes:
- Users can resize then export manually, but no multi-size export exists.

## 0515 - Export Layers As Files

Source note: `pages/0515-export-layers-as-files.md`

Function group: layer export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Export layers as individual files`: `Missing`.
- `Layer naming and format options`: `Missing`.
- `Batch layer export`: `Missing`.

Implementation notes:
- Export is for the composed document, not individual layers.

## 0516 - Export Artboards As PDF

Source note: `pages/0516-export-artboards-as-pdf.md`

Function group: artboard PDF export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Artboards`: `Missing`.
- `Export artboards to PDF`: `Missing`.
- `Multi-page PDF output`: `Missing`.

Implementation notes:
- No artboard or PDF system exists.

## 0517 - Export Artboards As Files

Source note: `pages/0517-export-artboards-as-files.md`

Function group: artboard file export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Export each artboard`: `Missing`.
- `Artboard naming/options`: `Missing`.
- `Scale/format per artboard`: `Missing`.

Implementation notes:
- No artboard model exists.

## 0518 - Save And Export To Cloud

Source note: `pages/0518-save-and-export-to-cloud.md`

Function group: cloud save/export.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Creative Cloud documents`: `Missing`.
- `Cloud export/share destination`: `Missing`.
- `Sync/versioning`: `Missing`.

Implementation notes:
- Photoweb stores locally in browser storage and downloads files.

## 0519 - Metadata, CSS, And Content Credentials

Source note: `pages/0519-metadata-css-and-content-credentials.md`

Function group: metadata and content credentials.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `File metadata editor/export`: `Missing`.
- `CSS extraction/export`: `Missing`.
- `Content Credentials`: `Missing`.

Implementation notes:
- Exported images do not include Photoshop-style metadata controls.

## 0520 - Use Content Credentials

Source note: `pages/0520-use-content-credentials.md`

Function group: Content Credentials.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Enable Content Credentials`: `Missing`.
- `Record edits/identity/assets`: `Missing`.
- `Attach/publish credentials`: `Missing`.

Implementation notes:
- No C2PA/content provenance system exists.

## 0521 - Preview Content Credentials

Source note: `pages/0521-preview-content-credentials.md`

Function group: content credential preview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Preview credential information`: `Missing`.
- `Inspect included/excluded data`: `Missing`.
- `Credential warning UI`: `Missing`.

Implementation notes:
- Depends on absent Content Credentials support.

## 0522 - Export Your Work With Content Credentials

Source note: `pages/0522-export-your-work-with-content-credentials.md`

Function group: exporting with provenance metadata.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Attach Content Credentials on export`: `Missing`.
- `Publish to cloud`: `Missing`.
- `Embed C2PA metadata`: `Missing`.

Implementation notes:
- Export is plain canvas download.

## 0523 - Share And Collaborate

Source note: `pages/0523-share-and-collaborate.md`

Function group: sharing and collaboration overview.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Share for review/collaboration`: `Missing`.
- `Cloud comments`: `Missing`.
- `Collaborative editing`: `Missing`.

Implementation notes:
- Photoweb is local single-user editing.

## 0524 - Collaborate And Edit

Source note: `pages/0524-collaborate-and-edit.md`

Function group: collaborative editing.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Invite collaborators`: `Missing`.
- `Shared cloud document editing`: `Missing`.
- `Permissions/version collaboration`: `Missing`.

Implementation notes:
- No backend collaboration system exists.

## 0525 - Create Projects And Add Files

Source note: `pages/0525-create-projects-and-add-files.md`

Function group: Adobe projects.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Create project`: `Missing`.
- `Add files/assets to project`: `Missing`.
- `Project-level organization`: `Missing`.

Implementation notes:
- Photoweb has documents, not cloud projects.

## 0526 - Share And Collaborate With Projects

Source note: `pages/0526-share-and-collaborate-with-projects.md`

Function group: project collaboration.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Share project`: `Missing`.
- `Project collaborator permissions`: `Missing`.
- `Project comments/activity`: `Missing`.

Implementation notes:
- No project/collaboration backend exists.

## 0527 - App Integrations

Source note: `pages/0527-app-integrations.md`

Function group: Adobe app integrations.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Adobe app integration hub`: `Missing`.
- `Send/open across Adobe apps`: `Missing`.
- `Linked services/assets`: `Missing`.

Implementation notes:
- Photoweb is standalone.

## 0528 - Access Adobe Express Templates

Source note: `pages/0528-access-adobe-express-templates.md`

Function group: Adobe Express templates.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Adobe Express template access`: `Missing`.
- `Template browser`: `Missing`.
- `Open template as editable asset`: `Missing`.

Implementation notes:
- No template service integration exists.

## 0529 - Refine Firefly Generated Images

Source note: `pages/0529-refine-firefly-generated-images.md`

Function group: Firefly image refinement.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Firefly-generated asset workflow`: `Missing`.
- `Refine generated image`: `Missing`.
- `Send between Firefly/Photoshop`: `Missing`.

Implementation notes:
- No Firefly integration or generative workflow exists.

## 0530 - Transform Image To Video

Source note: `pages/0530-transform-image-to-video.md`

Function group: image-to-video generation.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Generate video from image`: `Missing`.
- `Prompt/motion controls`: `Missing`.
- `Video output management`: `Missing`.

Implementation notes:
- No video or generative media service exists.

## 0531 - Open Photoshop Files In Illustrator

Source note: `pages/0531-open-photoshop-files-in-illustrator.md`

Function group: Illustrator interoperability.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Open PSD in Illustrator workflow`: `Missing`.
- `Preserve layers/vectors/text into Illustrator`: `Missing`.
- `Adobe app handoff`: `Missing`.

Implementation notes:
- Photoweb does not create PSD files or integrate with Illustrator.

## 0532 - Troubleshoot

Source note: `pages/0532-troubleshoot.md`

Function group: troubleshooting hub.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Runtime error feedback`: `Partial`. Photoweb uses toast messages for some failures.
- `Troubleshooting help hub`: `Missing`.
- `Diagnostic/export logs`: `Missing`.

Implementation notes:
- Error handling is local UI feedback, not a support system.

## 0533 - Tools And Resources

Source note: `pages/0533-tools-and-resources.md`

Function group: troubleshooting resources.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Support tools/resources page`: `Missing`.
- `Diagnostic utilities`: `Missing`.
- `Community/support links`: `Missing`.

Implementation notes:
- Help menu is minimal/placeholder-level.

## 0534 - Set Up And Manage Scratch Disks

Source note: `pages/0534-set-up-and-manage-scratch-disks.md`

Function group: scratch disk management.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Scratch disk preference`: `Missing`.
- `Choose disk/order`: `Missing`.
- `Temporary storage diagnostics`: `Missing`.

Implementation notes:
- Photoweb uses browser memory/storage and does not expose scratch disks.

## 0535 - Check GPU Compatibility

Source note: `pages/0535-check-gpu-compatibility.md`

Function group: GPU compatibility checking.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `GPU compatibility report`: `Missing`.
- `Driver/GPU troubleshooting`: `Missing`.
- `Feature gating by GPU`: `Missing`.

Implementation notes:
- Rendering is browser-managed; no GPU diagnostics are exposed.

## 0536 - Performance And Stability Issues

Source note: `pages/0536-performance-and-stability-issues.md`

Function group: performance/stability troubleshooting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Basic failure toasts`: `Partial`.
- `Performance preferences/diagnostics`: `Missing`.
- `Crash recovery/troubleshooting guide`: `Missing`.

Implementation notes:
- Autosave recovery helps with lost work, but not diagnosis.

## 0537 - Known And Fixed Issues In Adobe Photoshop On Desktop

Source note: `pages/0537-known-and-fixed-issues-in-adobe-photoshop-on-desktop.md`

Function group: known/fixed issue tracking.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Known issues page`: `Missing`.
- `Fixed issue version list`: `Missing`.
- `In-app issue lookup`: `Missing`.

Implementation notes:
- No release/issue support documentation is generated for Photoweb.

## 0538 - Resolve Graphics Processor (GPU) And Graphics Driver Issues

Source note: `pages/0538-resolve-graphics-processor-gpu-and-graphics-driver-issues.md`

Function group: GPU/driver troubleshooting.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Disable GPU preference`: `Missing`.
- `Driver troubleshooting guide`: `Missing`.
- `GPU log/compatibility details`: `Missing`.

Implementation notes:
- Browser graphics stack is not exposed to users.

## 0539 - Troubleshoot Scratch Disk Full Errors In Photoshop

Source note: `pages/0539-troubleshoot-scratch-disk-full-errors-in-photoshop.md`

Function group: scratch disk full errors.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Scratch disk full detection`: `Missing`.
- `Scratch disk cleanup guidance`: `Missing`.
- `Change scratch disk location`: `Missing`.

Implementation notes:
- Browser storage quota failures would need separate handling, but scratch disks do not exist.

## 0540 - File And Format Issues

Source note: `pages/0540-file-and-format-issues.md`

Function group: file/format troubleshooting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Open/import failure toasts`: `Present with differences`.
- `Save failure toasts`: `Present with differences`.
- `Detailed file format troubleshooting`: `Missing`.

Implementation notes:
- Error messages are brief and not linked to docs.

## 0541 - Resolve Program Error While Saving Files

Source note: `pages/0541-resolve-program-error-while-saving-files.md`

Function group: save error troubleshooting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Save failure notification`: `Present with differences`.
- `Recovery/autosave`: `Partial`.
- `Step-by-step save error troubleshooting`: `Missing`.

Implementation notes:
- Save failures produce a toast, but no guided resolution workflow.

## 0542 - Tool And Feature Issues

Source note: `pages/0542-tool-and-feature-issues.md`

Function group: tool/feature troubleshooting.

Overall Photoweb status: `Missing`

Sub-function comparison:
- `Tool issue help index`: `Missing`.
- `Feature-specific troubleshooting pages`: `Missing`.
- `Reset tool/preferences guidance`: `Missing`.

Implementation notes:
- No in-app troubleshooting documentation is present.

## 0543 - Photoshop Crashes While Using Bullets And Numbers

Source note: `pages/0543-photoshop-crashes-while-using-bullets-and-numbers.md`

Function group: bullets/numbers crash issue.

Overall Photoweb status: `Not applicable`

Sub-function comparison:
- `Photoshop bullet/number crash workaround`: `Not applicable`.
- `Bulleted/numbered lists`: `Missing`.
- `Crash diagnostics`: `Missing`.

Implementation notes:
- Photoweb does not implement bullet/numbered list typography.

## 0544 - Keyboard Shortcuts Not Working

Source note: `pages/0544-keyboard-shortcuts-not-working.md`

Function group: keyboard shortcut troubleshooting.

Overall Photoweb status: `Partial`

Sub-function comparison:
- `Implemented shortcuts`: `Present with differences`.
- `Avoid shortcuts while typing`: `Present with differences`.
- `Shortcut reference UI`: `Present with differences`. Cmd+/ opens an in-app keyboard-shortcut reference dialog listing the registered shortcuts.
- `Shortcut troubleshooting/reset/customization`: `Missing`.

Implementation notes:
- App-level shortcut handling exists, and a Cmd+/ reference dialog surfaces the active shortcut list, but no diagnostic/reset/customization UI exists.

## Summary

High-overlap areas:
- Quick Export PNG, Export As-style PNG/JPEG/WebP/GIF export, local app document save/load, autosave recovery, and basic save/open/import/export error toasts are implemented.
- The native `.pwbdoc` format round-trips full non-destructive state (layer masks with density/feather, type data, adjustment params, fill data, layer effects, locks, color tags) with v1 backwards compatibility.
- Keyboard shortcuts and toolbar shortcut labels exist for many common tools and commands, and a Cmd+/ reference dialog lists the registered shortcuts.

Major missing areas:
- Video export, image sequences, PSD/PSB/PDF/TIFF/RAW/professional format support, layer/artboard export, multi-size export, and cloud export are missing.
- Metadata, CSS export, Content Credentials, C2PA provenance, collaboration, projects, Adobe app integrations, Express templates, Firefly refinement, and image-to-video generation are missing.
- Scratch disks, GPU compatibility diagnostics, performance/stability troubleshooting, known/fixed issue docs, detailed format troubleshooting, and shortcut troubleshooting UI are missing.

Recommended implementation priorities:
- Add a small Help/Troubleshooting panel with app-specific supported formats, storage limitations, shortcut list, and recovery guidance.
- Add export scaling and layer export before tackling professional file formats.
- If provenance matters, design metadata/export architecture before adding Content Credentials.
- Treat cloud collaboration and Adobe-style integrations as backend/product integrations, not editor-local features.
