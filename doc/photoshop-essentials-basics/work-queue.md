# Photoshop-lessons work queue

The /loop processes the first unchecked `[ ]` item. Read [RUN-CONTRACT.md](RUN-CONTRACT.md) before each tick. Slug lists live in [clusters.json](clusters.json).

When a tick succeeds, change `[ ]` → `[x]` and append `  commit: <sha>` on the same line.

- [x] 01a-interface-shell        (4) — Doc window, tab, status bar, pasteboard, color theme  commit: 63290e3
- [x] 01b-toolbar                (1) — Toolbar UI: column, flyout, default-tool, keyboard cycle  commit: 0e1b00f
- [x] 01c-panels                 (2) — Panel groups, Window menu, panel menu icon  commit: 898b23d
- [x] 01d-screen-modes           (2) — F / Shift+F cycle, Tab hide panels  commit: 92ed3eb
- [x] 01e-neutral-color-mode     (1) — Preferences toggle to flatten cosmetic UI gradients  commit: 93f5a87
- [x] 02-preferences             (4) — Preferences dialog & background auto-save  commit: 93cc126
- [x] 03-navigation              (5) — Zoom, Hand, fit/100%, scrubby zoom, shortcuts  commit: 678d2b2
- [x] 04a-file-open-place        (5) — File > Open, drag-drop, Place Embedded, Load Files  commit: 2f4647f
- [x] 04b-file-new               (2) — File > New dialog  commit: 137edb3
- [x] 04c-file-save-close        (2) — Save As to protect original, Close / Close All  commit: 5b015f4
- [x] 05a-image-size             (9) — Image Size dialog: pixels, resolution, resampling  commit: 051dbf6
- [x] 05b-canvas-size            (1) — Canvas Size dialog, Crop Tool expand  commit: 0c195e9
- [x] 05c-rotate-straighten      (1) — Image Rotation, Straighten button, Ruler Tool  commit: 0abaf1f
- [x] 06-crop                    (7) — Crop Tool, Perspective Crop, single-layer / circular  commit: f37df51
- [x] 07a-layers-panel           (8) — Layers panel structure, rows, shortcuts  commit: 9349ab8
- [x] 07b-background-layer       (3) — Locked Background layer, convert-to-normal  commit: f9c1e8b
- [x] 08a-layer-ops              (5) — Stamp visible, copy effects, auto-select, align, groups  commit: c0c1e8b
- [x] 08b-properties-panel       (1) — Per-layer-type Properties panel  commit: 4b4d45c
- [x] 08c-doc-transfer           (2) — Move layers between documents  commit: 2bfa8ee
- [x] 09-blend-modes             (3) — Blend mode menu, live preview, Shift+/- cycle  commit: 096de03
- [x] 10-layer-styles            (3) — Layer Style dialog, save/load, Opacity vs Fill  commit: 0fc640a
- [x] 11a-selections-overview    (3) — Shift add, Alt subtract, Shift+Alt intersect  commit: a5f961c
- [x] 11b-transform-selection    (2) — Transform Selection command  commit: 60a5266
- [x] 12-marquee                 (3) — Rectangular / Elliptical Marquee  commit: 3289086
- [x] 13-lasso                   (3) — Lasso / Polygonal / Magnetic  commit: 7e9e42b
- [x] 14a-content-selection-tools(3) — Magic Wand, Quick Selection, Object Selection (non-AI)  commit: ccb03c1
- [x] 14b-color-range            (1) — Color Range dialog  commit: 6b622b6
- [x] 15-pen-paths               (2) — Pen Tool, Curvature Pen Tool  commit: a7a4c12
- [x] 16a-edge-refinement        (2) — Quick Mask + Feather, classic Refine Edge dialog  commit: e41db9b
- [x] 16b-focus-area             (2) — Focus Area auto-selection  commit: 5da1e0e
- [x] 17-layer-masks             (7) — Add, paint, paste-into, view-as-mask, fake mask  commit: ff06770
- [x] 18-clipping-masks          (2) — Clip to layer below, photo-in-text  commit: 4643f85
- [x] 19a-free-transform         (3) — Ctrl/Cmd+T scale / rotate / skew / distort / perspective  commit: ea9039a
- [x] 19b-warp                   (1) — Warp grid, enhanced Warp 2020  commit: 5ebe985
- [x] 20a-brush-tool             (3) — Brush Tool, cursor, eraser-via-Clear  commit: 0b103c5
- [x] 20b-brush-presets          (3) — Custom brushes, save/load, Brushes panel  commit: 85dfc8c
- [x] 20c-paint-symmetry         (1) — Paint Symmetry (butterfly icon)  commit: 2901be1
- [x] 21-brush-dynamics          (6) — Shape / Scatter / Texture / Dual / Color / Other  commit: 1165e03
- [x] 22a-gradient-tool-and-editor(3) — Gradient Tool + Gradient Editor + recipes  commit: 99c248e
- [x] 22b-live-gradients         (1) — Live Gradients (non-destructive layer)  commit: 3586a9e
- [x] 23-color-swatches          (3) — Eyedropper, Swatches panel, swatches-from-image  commit: 6f0b52e
- [ ] 24-type-basics             (6) — Type Tool, point/area, Character/Paragraph panels
- [ ] 25a-type-on-path-warp      (3) — Type on path, Warp Text
- [ ] 25b-type-shape-interop     (2) — Type-in-shape, Convert to Shape
- [ ] 26a-shape-concepts         (4) — Vector vs pixel, Tool Mode
- [ ] 26b-geometric-shapes       (4) — Rectangle/Ellipse/Triangle/Polygon/Line + combine
- [ ] 27a-custom-shape-tool      (4) — Custom Shape Tool, Shapes panel
- [ ] 27b-custom-shape-presets   (2) — Define Custom Shape, save / load sets
- [ ] 28-patterns                (3) — Define Pattern, fill, tile recipes
