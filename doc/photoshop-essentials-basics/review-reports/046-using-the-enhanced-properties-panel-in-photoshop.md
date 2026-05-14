# 046 using-the-enhanced-properties-panel-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/using-the-enhanced-properties-panel-in-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 08b-properties-panel

## Lesson Expectations
- Window > Properties opens a contextual panel whose contents change by selected layer type.
- Background layer shows Document/Canvas, Rulers & Grids, Guides, and Quick Actions such as Image Size, Crop, Trim, Rotate, Select Subject, Remove Background.
- Pixel layers show transform/alignment controls and quick actions; type layers expose Character/Paragraph fields and Convert to Shape/Frame actions.
- Screenshots grounding UI: `interface-properties-panel-choose-properties-panel-menu-bar-a4d47068.png`, `interface-properties-panel-properties-panel-2020-background-layer-afec6bf0.png`, `interface-properties-panel-pixel-layer-properties-photoshop-67aed92d.png`, `interface-properties-panel-type-layer-properties-photoshop-c1eb0e61.png`.

## Photoweb Coverage
- Window menu toggles Properties in `src/components/layout/MenuBar.tsx:696`.
- Background Document section shows canvas size, resolution, RGB/8-bit, Image Size, Crop, Trim, Rotate in `src/components/Panels/PropertiesPanel.tsx:151`.
- Pixel transform fields and align/distribute controls live in `src/components/Panels/PropertiesPanel.tsx:182`.
- Mask Density/Feather and mask actions are exposed in `src/components/Panels/PropertiesPanel.tsx:280`.
- Tests cover background quick actions, raster transforms, canvas alignment, and type controls in `src/test/08b-properties-panel.test.tsx:47`.

## Gaps / Mismatches
- AI Quick Actions (`Select Subject`, `Remove Background`) are absent by scope.
- Convert type to Frame is absent because Frame Tool is excluded.
- Rulers & Grids / Guides sections from the Photoshop panel are not represented in this inspected Properties panel.
- Some Photoshop labels are shortened in pixel-layer controls (`Flip H`, `Canvas H`), which may be less familiar than full Photoshop wording.

## Scope Decision
Fix

## Recommended Follow-up
Add non-AI Guides/Rulers controls or consciously record their omission; expand shortened Properties labels where space permits.

