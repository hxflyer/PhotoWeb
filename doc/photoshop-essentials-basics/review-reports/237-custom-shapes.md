# 237 custom-shapes
- Lesson path: `doc/photoshop-essentials-basics/custom-shapes/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `27b-custom-shape-presets`

## Lesson Expectations
- Draw a vector shape with Pen Tool in Shape Layers mode, use shape-combine operations such as Subtract From Shape Area, then choose `Edit > Define Custom Shape`.
- The named shape becomes available in the Custom Shape picker.
- UI screenshots: `photo-effects-custom-shapes-pen-tool-options-bar-4d49aeba.gif`, `photo-effects-custom-shapes-subtract-from-shape-area-92e3d7e0.gif`, `photo-effects-custom-shapes-define-custom-shape-4be0debd.gif`.

## Photoweb Coverage
- Shape tools and custom shape mode exist (`src/tools/shapes.ts:734-743`, `src/components/Panels/Toolbar.tsx:130`, `src/components/Panels/OptionsBar.tsx:2053-2127`).
- `Edit > Define Custom Shape…` prompts and creates a user custom shape from the active shape layer (`src/components/layout/MenuBar.tsx:267-273`, `src/tools/customShapePresets.ts:104-118`).
- Tests cover defining custom shapes from active Shape layers and menu invocation (`src/test/27b-custom-shape-presets.test.tsx:61-72`, `src/test/27b-custom-shape-presets.test.tsx:108-130`).

## Gaps / Mismatches
- Photoshop’s Pen Tool Shape Layers mode and vector mask terminology do not map one-to-one to photoweb’s shape/path modes.
- Need to verify boolean subtract/editing path data survives Define Custom Shape for complex multi-subpath shapes.

## Scope Decision
Fix.

## Recommended Follow-up
Add a complex subtract/intersect shape define test and decide if naming should use Photoshop’s `Shape Name` dialog instead of `window.prompt`.
