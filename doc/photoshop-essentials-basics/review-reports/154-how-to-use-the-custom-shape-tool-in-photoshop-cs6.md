# 154 how-to-use-the-custom-shape-tool-in-photoshop-cs6
- Lesson path: `doc/photoshop-essentials-basics/how-to-use-the-custom-shape-tool-in-photoshop-cs6/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `27a-custom-shape-tool`

## Lesson Expectations
- Selects the Custom Shape Tool, chooses Shape/Path/Pixels mode, opens the shape picker, loads or browses shape presets, and draws custom shapes.
- Uses foreground/fill/stroke options, `Shift` for proportions, `Alt/Option` from center, and layer creation/undo behavior.
- Photoshop CS6-specific picker details include grouped preset thumbnails and panel menu options.

## Photoweb Coverage
- `src/tools/shapes.ts:27` defines shape modes and kinds; `src/tools/shapes.ts:128` handles `Shift` and `Alt/Option` bounds behavior.
- `src/tools/shapes.ts:192` builds custom and geometric shape data.
- `src/test/27a-custom-shape-tool.test.tsx:45` covers grouped presets and picker behavior; `src/test/27a-custom-shape-tool.test.tsx:64` covers the Shapes panel; `src/test/27a-custom-shape-tool.test.tsx:90` covers custom shape layer undo.

## Gaps / Mismatches
- Preset-library parity is intentionally smaller than Photoshop's historical CS6 library surface.
- No major gap found for the practical browser-editor target.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
