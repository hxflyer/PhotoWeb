# 14a Content Selection Tools Gap Report

## Lessons read

- `magic-wand-tool/lesson.md`
- `quick-selection-tool/lesson.md`
- `object-selection-tool/lesson.md`

## Photoshop behavior to cover

- The Object Selection, Quick Selection, and Magic Wand tools share the `W` toolbar slot and cycle with `Shift+W`.
- Magic Wand selects similar color from one click and exposes Tolerance, Anti-alias, Contiguous, Sample All Layers, and the existing selection operation buttons.
- Quick Selection paints a growing selection, defaults toward Add, supports Alt/Option subtract, and exposes brush Size, Sample All Layers, and Auto-Enhance.
- Object Selection exposes Rectangle and Lasso modes, Sample All Layers, Auto-Enhance, and Object Subtract; users drag a loose outline, then refine with Shift add and Alt/Option subtract.
- Object Selection lets users reposition a rectangle while drawing by holding Space.

## Current app state

- Magic Wand is already registered and backed by raster masks with Tolerance, Anti-alias, Contiguous, Sample All Layers, and Sample Size.
- Quick Selection is already registered, paints accumulated raster masks, supports brush Size, Sample All Layers, Auto-Enhance, and bracket-size shortcuts are not currently part of this cluster.
- The `W` toolbar group only exposes Quick Selection and Magic Wand.
- The app has no `object-selection` tool id, toolbar entry, Options Bar controls, shortcut-cycle entry, status label, or tool behavior.

## Gaps to close

- Add the Object Selection Tool to the shared `W` group.
- Implement non-AI Rectangle/Lasso Object Selection drag behavior.
- Add Options Bar controls for Object Selection mode, Sample All Layers, Auto-Enhance, and Object Subtract.
- Update cursor, status, shortcut list, and tests so Object Selection behaves like a first-class selection tool.

## Intentional divergence

- Photoshop's Sensei/Object Finder and advanced object-subtract analysis are out of scope. Photoweb will use a deterministic visible-pixel shrink-wrap inside the user's rectangle/lasso when possible, and otherwise commit the drawn shape.
