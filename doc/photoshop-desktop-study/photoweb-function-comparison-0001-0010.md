# Photoweb vs Photoshop Notes: Function Comparison 0001-0010

Scope: first 10 generated Photoshop study notes.

Method: each note is treated as one function group. Sub-functions are compared against the current Photoweb implementation in `src/`.

Status key:
- `Present with differences`: Photoweb has a related feature, but behavior or scope differs from Photoshop.
- `Partial`: Photoweb has a smaller implementation or UI placeholder.
- `Missing`: Photoweb does not currently contain this function.
- `Not applicable`: The note describes Adobe product/documentation infrastructure rather than an editor function.

Relevant Photoweb code areas:
- App shell and shortcuts: `src/App.tsx`
- Menu system: `src/components/layout/MenuBar.tsx`
- Main UI layout: `src/components/layout/MainLayout.tsx`
- Toolbar: `src/components/Panels/Toolbar.tsx`
- Panels: `src/components/Panels/RightPanelDock.tsx`
- Document state and persistence: `src/store/documentSlice.ts`, `src/core/persistence.ts`
- Project package metadata: `package.json`

## 0001 - What's New

Source note: `pages/0001-what-s-new.md`

Function group: release and documentation navigation hub.

Overall Photoweb status: `Missing`

Sub-function comparison:

- `Current release overview`: `Missing`. Photoshop uses this hub to show recent product additions. Photoweb has no in-app "What's New" page, changelog panel, release banner, or update feed.

- `Release notes access`: `Missing`. Photoweb has a package version in `package.json`, but no user-facing release notes or version history. The Help menu only contains a disabled `Photoshop Help...` item and an `About Photoshop` item placeholder in `src/components/layout/MenuBar.tsx`.

- `Beta feature navigation`: `Missing`. Photoweb has no separate beta channel or beta documentation area.

- `Technology preview navigation`: `Missing`. Photoweb has no preferences area for experimental feature discovery or toggles.

- `Documentation index behavior`: `Missing`. Photoweb does not include a built-in documentation browser. The closest UI is the Photoshop-like menu bar and panel layout.

Implementation notes:

- Photoweb currently focuses on editor operations, not product-support documentation. If this group is needed, add a `Help > What's New` or `Help > Release Notes` surface and store release content in a local JSON/markdown source.

## 0002 - What's New in Adobe Photoshop on Desktop

Source note: `pages/0002-what-s-new-in-adobe-photoshop-on-desktop.md`

Function group: current release feature summary.

Overall Photoweb status: `Partial`

Sub-function comparison:

- `On-canvas object rotation`: `Present with differences`. Photoweb supports Free Transform via `Cmd/Ctrl+T` and menu access, with transform overlay state managed in `src/App.tsx`. Photoshop's recent on-canvas rotation improvements are product-specific; Photoweb has basic transform/warp behavior, not full Photoshop parity.

- `Layer cleanup improvements`: `Missing`. Photoweb has layer management, masks, merge, flatten, and delete commands, but no dedicated automated layer cleanup feature.

- `Remove tool distraction cleanup`: `Missing`. Photoweb includes eraser, clone stamp, selection, and brush tools, but no AI/object-aware Remove tool.

- `Partner AI model support in generative workflows`: `Missing`. No generative AI model selection, cloud model routing, prompt UI, or credit system exists.

- `Firefly Image model updates`: `Missing`. No Firefly integration exists.

- `Multiple reference image guidance`: `Missing`. Photoweb can open/import image files, but it does not use reference images to guide generation.

- `Firefly Boards integration`: `Missing`. No Adobe service or board workflow exists.

- `Updated Actions panel`: `Missing`. Photoweb has a `HistoryPanel`, but no recordable Actions panel or automation playback engine.

- `Dynamic Text`: `Partial`. Photoweb has horizontal/vertical type tools, Character and Paragraph panels, and editable text overlay behavior. It does not implement Photoshop beta-style dynamic text layouts such as circle, arch, or bow controls.

- `Gradient editing improvements`: `Partial`. Photoweb includes a Gradient tool and gradient options/presets in the options bar, but not the full Photoshop gradient editor experience.

- `Reflection removal`: `Missing`. No reflection-removal tool or AI cleanup workflow exists.

- `Updated Contextual Task Bar`: `Partial`. Photoweb has a top `OptionsBar` that changes by active tool. Photoshop's Contextual Task Bar is a floating context-aware command surface; Photoweb's implementation is fixed in the layout and more like a classic options bar.

- `Image generation from text prompts`: `Missing`. No prompt-to-image generation UI or service integration exists.

Implementation notes:

- The strongest overlap is classic editor UI and local editing tools. Recent Photoshop AI/release-highlight functions are mostly absent from Photoweb.

## 0003 - Adobe Photoshop on Desktop Release Notes

Source note: `pages/0003-adobe-photoshop-on-desktop-release-notes.md`

Function group: versioned release-note and fix-history reference.

Overall Photoweb status: `Missing`

Sub-function comparison:

- `Versioned feature updates`: `Missing`. Photoweb has `version: "0.0.0"` in `package.json`, but no public release-note document generated from commits or package versions.

- `Customer-reported fixes`: `Missing`. No issue/fix tracking document is exposed in the app or docs.

- `Crash fixes`: `Missing`. No crash history or crash diagnostics page exists.

- `Generative AI fixes`: `Not applicable`. Photoweb currently has no generative AI features.

- `UI fixes`: `Missing`. UI changes are represented only by source code and tests, not release-note content.

- `LTS version references`: `Missing`. Photoweb has no LTS/stable channel distinction.

- `Known fixed issue lookup`: `Missing`. There is no table or page mapping bugs to fixed versions.

Implementation notes:

- If Photoweb needs this group, add `CHANGELOG.md` or a Help-menu release-notes dialog. Current code has tests and commit history, but no user-facing release-note function.

## 0004 - What's New in Adobe Photoshop (Beta) on Desktop

Source note: `pages/0004-what-s-new-in-adobe-photoshop-beta-on-desktop.md`

Function group: beta release feature summary.

Overall Photoweb status: `Missing`

Sub-function comparison:

- `Beta-only feature listing`: `Missing`. Photoweb has one app build and no beta/stable feature channel separation.

- `Dynamic Text beta highlights`: `Partial`. Photoweb has type tools and text panels, but no beta-only dynamic text layouts or beta feature labeling.

- `Firefly Fill and Expand beta model updates`: `Missing`. No Firefly Fill, Expand, or AI model update workflow exists.

- `Early-access feature warning`: `Missing`. Photoweb does not label any tool as beta, experimental, unstable, or preview-only.

Implementation notes:

- This would require a feature flag system plus UI labels or a separate deployment channel. Nothing in the current menu/panel system indicates beta-only functions.

## 0005 - Overview of Adobe Photoshop (Beta) on Desktop

Source note: `pages/0005-overview-of-adobe-photoshop-beta-on-desktop.md`

Function group: beta application environment guidance.

Overall Photoweb status: `Not applicable`

Sub-function comparison:

- `Separate beta app installation`: `Missing`. Photoweb is a single Vite/React application. It has no separate beta app identity.

- `Stable vs beta workflow guidance`: `Missing`. No in-app guidance tells users when to choose stable versus beta behavior.

- `Generative credit behavior`: `Not applicable`. Photoweb has no Adobe account, credit, or cloud-generation system.

- `Commercial use and indemnification notes`: `Not applicable`. Photoweb is a local web app project and does not expose Adobe legal/commercial-use states.

- `Feedback/testing channel`: `Missing`. No beta feedback UI exists.

Implementation notes:

- For Photoweb, an equivalent would be a project-level contribution/testing guide rather than an editor function.

## 0006 - Use Technology Previews

Source note: `pages/0006-use-technology-previews.md`

Function group: experimental feature preferences.

Overall Photoweb status: `Missing`

Sub-function comparison:

- `Technology Previews settings screen`: `Missing`. Photoweb has no Settings or Preferences dialog for experimental features.

- `Per-feature enable/disable toggles`: `Missing`. There is no feature flag UI. Some menu items are disabled placeholders, but that is not the same as turning preview features on or off.

- `Restart-required activation behavior`: `Missing`. Photoweb has no restart-gated preference flow.

- `Experimental feature warning`: `Missing`. No UI explains experimental status or instability risk.

- `Preview feature feedback workflow`: `Missing`. No feedback or issue-reporting workflow exists.

Implementation notes:

- There is an internal `enablePerfLogging` field in the view store, but no visible preference UI and it is not a Technology Preview system.

## 0007 - List of Technology Preview Features

Source note: `pages/0007-list-of-technology-preview-features.md`

Function group: catalog of experimental feature items.

Overall Photoweb status: `Partial`

Sub-function comparison:

- `Preserve Details 2.0 Upscale`: `Missing`. Photoweb has image resize/resample helpers and an Image Size dialog, but no named Preserve Details 2.0 AI/upscale mode.

- `Content-Aware Tracing Tool`: `Missing`. Photoweb has Pen, Freeform Pen, Path Selection, Direct Selection, and path/selection conversions, but no content-aware automatic tracing tool.

- `HDR color-management and preview improvements`: `Missing`. Photoweb does not expose HDR preview, HDR color management, or bit-depth workflow.

- `Open JPEG without Background layer`: `Present with differences`. Photoweb opens imported images as normal editable layers through `openImageAsDocument`; it does not model Photoshop's locked Background layer distinction, so the Photoshop-specific preview toggle is unnecessary in the same form.

- `Modern User Interface preview items`: `Partial`. Photoweb has a custom Photoshop-like UI shell, but no alternate modern UI preview mode.

Implementation notes:

- Several related editing primitives exist, but the experimental-feature catalog itself does not. Photoweb would need a feature registry and a Preferences UI before these could be organized like Photoshop Technology Previews.

## 0008 - Get Started

Source note: `pages/0008-get-started.md`

Function group: onboarding and first-use documentation hub.

Overall Photoweb status: `Partial`

Sub-function comparison:

- `Installation guidance`: `Missing`. Photoweb has developer scripts in `package.json`, but no user-facing installation or setup guide inside the app.

- `Workspace basics`: `Present with differences`. Photoweb has a Photoshop-like workspace with menu bar, options bar, toolbar, canvas, right panels, and status bar. Unlike Photoshop's Get Started docs, this is implementation UI, not an onboarding/tutorial page.

- `Toolbar and panel setup guidance`: `Partial`. Photoweb has a rich toolbar and panel dock. It does not have tutorial content explaining how to customize or arrange them.

- `Settings and preferences onboarding`: `Missing`. Photoweb has no Preferences dialog equivalent for users.

- `Beginner learning path`: `Missing`. No Learn tab, guided tutorial, or Discover panel equivalent exists.

Implementation notes:

- The app structure is ready for onboarding overlays or a Help panel, but the current codebase does not provide one.

## 0009 - Technical Requirements and Installation

Source note: `pages/0009-technical-requirements-and-installation.md`

Function group: setup compatibility hub.

Overall Photoweb status: `Missing`

Sub-function comparison:

- `System compatibility branch`: `Missing`. Photoweb has package dependencies and build scripts, but no user-facing compatibility page.

- `GPU setup branch`: `Missing`. Photoweb uses browser canvas APIs but has no GPU compatibility check or graphics preference.

- `Codec dependency branch`: `Missing`. Photoweb image loading depends on browser-supported formats through HTML image loading. It has no HEIF/HEVC codec installer guidance or detection.

- `Language availability branch`: `Missing`. No localization/language availability system is present.

- `Installation planning flow`: `Missing`. No installer, deployment checklist, or environment readiness UI exists.

Implementation notes:

- A Photoweb equivalent would likely be a `docs/setup.md` and a small runtime diagnostics panel covering browser support, storage availability, canvas capability, and supported import/export formats.

## 0010 - Adobe Photoshop on Desktop Technical Requirements

Source note: `pages/0010-adobe-photoshop-on-desktop-technical-requirements.md`

Function group: system requirements reference.

Overall Photoweb status: `Partial`

Sub-function comparison:

- `Minimum operating system requirements`: `Missing`. Photoweb does not document supported browsers, operating systems, or device baselines.

- `Recommended hardware requirements`: `Missing`. No RAM, CPU, GPU, display, or storage recommendations are documented for users.

- `Version-specific requirements`: `Partial`. `package.json` defines project version and dependency versions, but this is developer metadata, not user-facing product requirements.

- `Install compatibility check`: `Missing`. No code checks whether the browser supports required APIs before launching the editor.

- `Production hardware guidance`: `Missing`. No guidance exists for large canvases, memory pressure, high-DPI displays, or performance limits.

Implementation notes:

- Photoweb's closest technical reference is `package.json`, which describes a Vite/React development environment. It does not replace Photoshop-style system requirements for end users.

## Summary for First 10 Notes

Groups with usable Photoweb overlap:
- `0002`: partial overlap for transform, type, gradient, options bar, and local editor UI.
- `0007`: partial overlap for opening JPEG/images as normal layers and related path tools.
- `0008`: partial overlap for the actual workspace shell, toolbar, panels, and document operations.
- `0010`: partial developer-level metadata in `package.json`, but not user-facing requirements.

Groups mostly missing:
- `0001`, `0003`, `0004`, `0006`, `0009`.

Groups mostly not applicable to Photoweb's current product model:
- `0005`, because it describes Adobe beta distribution, credits, and legal usage conditions.

Recommended next comparison batch:
- `0011-0014`: GPU usage, GPU card behavior, HEIF/HEVC codecs, and language availability.
- `0015-0024`: basics, FAQ, home screen, workspace, Discover/help, workspaces, and Contextual Task Bar. This batch will compare more directly against Photoweb's existing UI shell.
