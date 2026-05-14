# 151 photoshops-free-transform-essentials
- Lesson path: `doc/photoshop-essentials-basics/photoshops-free-transform-essentials/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `19a-free-transform`

## Lesson Expectations
- Starts Free Transform with Edit > Free Transform or `Cmd/Ctrl+T`, then scales, rotates, moves, commits, or cancels.
- Uses handles, `Shift` constrain behavior, `Alt/Option` center scaling, reference point, X/Y/W/H/rotation fields, and checkmark/X buttons.
- Right-click transform menu exposes Scale, Rotate, Skew, Distort, Perspective, Warp, Rotate 180/90, and Flip commands.
- Grounding screenshots include `cc-free-transform-free-transform-box-handles-1e42f098.gif`, `cc-free-transform-options-bar-width-height-69825b03.gif`, `cc-free-transform-transformation-reference-point-0e3c0aee.gif`, `cc-free-transform-cancel-transform-button-25cba777.gif`, and `cc-free-transform-skew-horizontally-ffb66b06.gif`.

## Photoweb Coverage
- `src/App.tsx:389` starts Free Transform for raster, type, and shape content; `src/App.tsx:482` wires the `Cmd/Ctrl+T` shortcut.
- `src/components/Canvas/FreeTransformOverlay.tsx:236` implements Shift constrain behavior; `src/components/Canvas/FreeTransformOverlay.tsx:257` handles move, scale, `Alt/Option` center scaling, and rotation with Shift snapping.
- `src/components/Canvas/FreeTransformOverlay.tsx:455` handles Enter/Esc; `src/components/Canvas/FreeTransformOverlay.tsx:562` implements the context menu; `src/components/Canvas/FreeTransformOverlay.tsx:617` renders X/Y/W/H/rotation fields, Warp, commit, and cancel.
- `src/test/19a-free-transform.test.tsx:36` covers basic commit/history behavior and `src/test/19a-free-transform.test.tsx:60` covers locked-layer refusal.

## Gaps / Mismatches
- Test coverage is thin compared with the implemented surface: modifiers, Skew/Distort/Perspective, field entry, cancel button, and reference-point behavior are not comprehensively covered.
- Photoshop's visible reference-point locator is only partly represented by the field/overlay implementation.

## Scope Decision
Fix

## Recommended Follow-up
Add focused Free Transform tests for modifier scaling, rotation snapping, context-menu modes, Options Bar field edits, commit/cancel controls, and reference-point behavior.
