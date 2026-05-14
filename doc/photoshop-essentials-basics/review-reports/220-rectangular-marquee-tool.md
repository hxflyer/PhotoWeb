# 220 rectangular-marquee-tool
- Lesson path: `doc/photoshop-essentials-basics/rectangular-marquee-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `12-marquee`

## Lesson Expectations
- Rectangular Marquee draws rectangles; Shift constrains to square; Alt/Option draws from center.
- Can drag an existing selection outline or clear/deselect with `Ctrl/Cmd+D`.
- Options Bar supports selection modes, Feather, Style, Fixed Ratio/Size.
- UI screenshots: `selections-rmt-rectangular-marquee-tool-ec332e9d.gif`, `selections-rmt-draw-square-selection-e663687f.gif`, `selections-rmt-selection-from-center-8e861a06.jpg`.

## Photoweb Coverage
- Rectangular marquee registered as `marquee-rect` (`src/tools/marquee.ts:379-389`).
- Tool handles Shift square, Alt center, fixed ratio/size, click-inside move, and operation commit (`src/tools/marquee.ts:54-117`, `src/tools/marquee.ts:204-313`).
- `M / Shift+M` shortcut is in the shortcut registry (`src/core/shortcuts.ts:95`) and tests (`src/test/toolShortcuts.test.tsx:44-51`).
- Tests cover core rectangle gestures (`src/test/selection.test.ts:62-139`, `src/test/12-marquee.test.tsx:63-130`).

## Gaps / Mismatches
- No major mismatch found.

## Scope Decision
divergence already accepted.

## Recommended Follow-up
No action.
