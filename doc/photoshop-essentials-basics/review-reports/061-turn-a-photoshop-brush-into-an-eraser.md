# 061 turn-a-photoshop-brush-into-an-eraser
- Lesson path: `doc/photoshop-essentials-basics/turn-a-photoshop-brush-into-an-eraser/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 20a-brush-tool

## Lesson Expectations
- Brush Tool can erase with the same brush tip by changing Brush Mode from Normal to Clear in the Options Bar.
- Holding tilde (`~`) while painting temporarily uses Clear mode, then releases back to normal.
- Clear mode does not work on locked Background layers.
- Screenshots grounding UI: `brushes-turn-brush-to-eraser-select-brush-tool-photoshop-c3d05848.png`, `brushes-turn-brush-to-eraser-brush-blend-mode-clear-photoshop-4185bd8d.png`, `brushes-turn-brush-to-eraser-erase-with-tilde-key-photoshop-fd50b8aa.jpg`.

## Photoweb Coverage
- Brush Options Bar has a Mode dropdown including Clear, disabled when appropriate, in `src/components/Panels/OptionsBar.tsx:231`.
- Brush tool maps Clear to `destination-out` while stamping, preserving current brush tip/size in `src/tools/brush.ts:227`.
- App shortcuts provide Shift+Alt+R to set Clear and Shift+Alt+N to return Normal in `src/App.tsx:683`.
- Tests cover Clear mode wiring and erasing with one undoable stroke in `src/test/20a-brush-tool.test.tsx:72` and `src/test/20a-brush-tool.test.tsx:120`.

## Gaps / Mismatches
- Photoshop's tilde hold shortcut is not implemented; Photoweb uses Shift+Alt+R / Shift+Alt+N.
- If this shortcut divergence is intentional, it needs a product decision or divergence-log entry because the lesson explicitly teaches tilde muscle memory.

## Scope Decision
Fix

## Recommended Follow-up
Implement temporary `~` Clear mode for Brush/Pencil or record why browser keyboard constraints prevent it.

