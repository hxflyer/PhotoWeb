# 15 Pen Paths Gap Report

## Lessons read

- `pen-tool-selections/lesson.md`
- `use-curvature-pen-tool-photoshop-cc-2018/lesson.md`

## Photoshop behavior to cover

- Pen Tool in Path mode places anchors, supports straight and curved Bezier segments, and stays separate from pixel selections until converted.
- Click-drag creates direction handles; Ctrl/Cmd temporarily edits path points; Alt/Option breaks or converts handles.
- A completed path can become a selection from the Paths panel's Load Path as Selection button or with Ctrl/Cmd+Enter.
- Curvature Pen is nested behind Pen, cycles with Shift+P, creates smooth curves from clicked points, supports double-click corner points, and can close paths by clicking the start point.
- Curvature Pen uses the same Tool Mode choices: Path, Shape, or Pixels.

## Current app state

- The standard Pen Tool already supports Path/Shape/Pixels modes, click-drag handles, Auto Add/Delete, Rubber Band, Shift constrain, Alt handle breaking/conversion, and Ctrl/Cmd temporary direct selection.
- Path Selection and Direct Selection tools exist.
- Paths panel lists, renames, duplicates, deletes, strokes, and fills paths.
- Path persistence is covered.
- Missing pieces: Curvature Pen Tool, `P` group cycling for Curvature Pen, Load Path as Selection, and Ctrl/Cmd+Enter conversion.

## Gaps to close

- Add `curvature-pen` as a registered P-group tool.
- Implement a deterministic Curvature Pen that auto-generates smooth handles from clicked points, supports double-click corner points, drag-to-move anchors, delete selected point/path, and close-on-start.
- Add reusable path-to-selection conversion and expose it from Ctrl/Cmd+Enter plus the Paths panel.
- Update toolbar, Options Bar, status label, shortcuts, and tests.

## Intentional divergence

- Photoshop's Path Options gear for per-tool path color/thickness is not expanded in this tick; Photoweb continues using its existing blue path overlay style.
