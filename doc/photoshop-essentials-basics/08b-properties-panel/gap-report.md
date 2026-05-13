# 08b Properties Panel Gap Report

## Lessons Reviewed

- `using-the-enhanced-properties-panel-in-photoshop` — CC 2020 Properties panel is a contextual panel whose controls change for Background, pixel, type, adjustment, mask, shape, and fill layers.

## Current Photoweb Coverage

- The Properties panel already existed as a distinct right-dock panel.
- Generic layer controls showed name, kind, size, opacity, and fill.
- Type layers already exposed text, font, size, color, alignment, orientation, and point/paragraph mode.
- Adjustment, fill, live shape, mask, and effects sections were already implemented with focused tests.

## Gaps

- Selecting a real Background layer did not show document-level Properties panel actions such as Image Size, Crop, Trim, or Rotate.
- Raster pixel layers did not expose a Properties-panel Transform group for content X/Y/W/H, rotate, or flip.
- Align/Distribute was available elsewhere, but not in the pixel-layer Properties panel section.
- Single-layer align-to-canvas was blocked by the store even when the caller explicitly chose canvas alignment.
- Type-layer Properties controls did not yet include transform fields, Character/Paragraph advanced fields, Type Options, or Convert to Shape.

## Photoshop-Habit Mismatches

- Photoshop users expect the Properties panel to become a one-stop contextual surface when they select Background, pixel, and type layers.
- Photoshop users expect pixel-layer alignment to be reachable from Properties, and canvas alignment to work for a single selected layer.
- Photoshop users expect type transform and common Character/Paragraph controls in Properties without switching panels.

## UI / UX Issues

- Background-layer users had to leave Properties and use menus for common document actions.
- Pixel-layer users had no visible numeric content transform fields in Properties.
- Type-layer users had to split work between Properties, Character, and Paragraph panels for common text attributes.

## Photoshop Divergences Worth Keeping

- Convert to Frame is shown as disabled. Photoweb has no Frame layer model; Convert to Shape is available because editable shape layers already exist.
- Background Properties omits Rulers & Grids and Guides groups because those controls are either already in other interface areas or belong to later guide/grid expansion work.
- Pixel-layer Select Subject / Remove Background quick actions remain out of scope because the project does not include AI/object-selection services.
