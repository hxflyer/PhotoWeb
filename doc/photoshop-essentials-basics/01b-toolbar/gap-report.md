# gap-report — 01b-toolbar

## Lessons reviewed

- `photoshop-tools-toolbar-overview` — toolbar UI surface: single/double column toggle (double-arrows at top), click-and-hold flyout for hidden tools, right-click as alternate flyout gesture, default-tool memory (last-selected sticks per group), keyboard letter to select, Shift+letter to cycle through same-shortcut tools, tool group ordering and separators. Also contains a reference list of all ~70 tools, but per cluster scope (clusters.json) the **individual tools are addressed in their own clusters; this cluster is the toolbar UI behavior**.

## Current photoweb coverage

- [src/components/Panels/Toolbar.tsx:29-128](src/components/Panels/Toolbar.tsx#L29-L128) — `TOOL_GROUPS` matches Photoshop's group order; `SEP_BEFORE` list places the same separators between groups; right-click on a group opens its flyout via `onContextMenu` at [Toolbar.tsx:280-286](src/components/Panels/Toolbar.tsx#L280-L286); chevron indicator on groups with subs.
- [src/components/Panels/Toolbar.tsx:153](src/components/Panels/Toolbar.tsx#L153) — `groupActive` keeps the last-used sub-tool per group **in component state only**; no persistence.
- [src/components/Panels/Toolbar.tsx:199-220](src/components/Panels/Toolbar.tsx#L199-L220) — click-on-active-group reopens the flyout; click-on-inactive selects the displayed tool.
- [src/App.tsx:380-410](src/App.tsx#L380-L410) — keyboard `M / Shift+M`, `L / Shift+L`, etc. correctly cycle through each group's tools.
- [src/components/layout/MainLayout.tsx](src/components/layout/MainLayout.tsx) — toolbar column is a **fixed 48px** in the CSS grid; no double-column option.

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | **Click-and-hold** does not open the flyout. Photoshop's primary gesture for showing nested tools is press-and-hold (~300ms) on the icon. Photoweb only opens the flyout from right-click or from re-clicking an already-active group. | [Toolbar.tsx:199-213](src/components/Panels/Toolbar.tsx#L199-L213) |
| 2 | **Single/double column toggle** missing. Photoshop has `>>` / `<<` arrows at the top of the toolbar that switch between a long single-column layout and a shorter double-column layout. Photoweb has a fixed single column. | New control needed at the top of [Toolbar.tsx](src/components/Panels/Toolbar.tsx); the toolbar column width in [MainLayout.tsx:18](src/components/layout/MainLayout.tsx#L18) needs to accept a wider value when double-column is on. |
| 3 | **Default-tool memory does not persist** across reloads. Pick the Magic Wand under W, refresh the page, the group reverts to Quick Selection (the primary). | [Toolbar.tsx:153](src/components/Panels/Toolbar.tsx#L153) — needs viewSlice + localStorage persistence using the existing `chromePrefs:v1` scheme. |

## Photoshop-habit mismatches

1. **Click-and-hold is the primary "show hidden tools" gesture, not a fallback.** The lesson says: "click and hold on the icon. Or right-click (Win) / Control-click (Mac) on the icon." photoweb inverts this — right-click is the only direct path, and press-and-hold does nothing. → grounded in `photoshop-tools-toolbar-overview/images/interface-tools-photoshop-toolbar-selecting-tools-6517b8e0.png` (flyout shown without indication of which gesture opened it) and lesson body line 56.
2. **Column toggle is at the TOP of the toolbar, not a hamburger or settings panel.** The double-arrows live above the first tool. → grounded in `…/images/interface-tools-photoshop-toolbar-c8bde493.png` (red arrow points at the `>>` at top in single-column view) and `…/images/interface-tools-photoshop-double-column-toolbar-a03bf319.png` (`<<` highlighted at top of double-column view).
3. **Column toggle icon: `>>` collapses single → double, `<<` collapses double → single.** Direction matches "expand into" double or "collapse back" to single. → screenshots above.
4. **Default-tool memory is per-spot and PERSISTS.** Lesson: "Photoshop won't always display the default tool. Instead, it will display the last tool you selected. Notice that after choosing the Elliptical Marquee Tool from the fly-out menu, the Rectangular Marquee Tool is no longer displayed in the toolbar." Photoweb tracks this in component state but loses it on reload — a Photoshop user reopening the app sees their tools reset to defaults, which is wrong. → lesson body lines 67-73.

## UI / UX issues (separate from §4)

- Click-on-active-group as a flyout opener is a quirk. Photoshop opens the flyout on press-and-hold REGARDLESS of whether the group is currently active. With click-and-hold added, this quirk can be removed for clarity (a short tap-on-active stays the displayed tool, a hold pulls up the flyout).
- The flyout's `min-width: 220px` from [Toolbar.tsx:408](src/components/Panels/Toolbar.tsx#L408) is fine for English labels but might overflow in narrow viewports; not in scope here.

## Photoshop divergences worth keeping

- **Tools NOT in TOOL_GROUPS** (Artboard, Frame, Rotate View, Slice/Slice Select, 3D Material Eyedropper, 3D Material Drop, Content-Aware Move, etc.) — all out-of-scope per CLAUDE.md §4 (`frame_tool`, `nav_extras`, 3D, multi-doc/UI design). The toolbar groups simply omit them; no UI affordance needed.
- **In-scope tools not yet wired into TOOL_GROUPS** (Magnetic Lasso, Object Selection, Mixer Brush, Color Replacement, Pattern Stamp, History/Art History Brush, Blur/Sharpen/Smudge, Curvature Pen, Triangle, Color Sampler/Ruler/Note/Count, Vertical/Horizontal Type Mask, Single Row/Column Marquee) — these are tool-level features handled by their respective per-tool clusters (13-lasso, 14a-content-selection-tools, 15-pen-paths, 19a-free-transform, 20a-brush-tool, 26b-geometric-shapes, etc.). This cluster keeps TOOL_GROUPS as-is for the UI work; per-tool clusters will add entries.
