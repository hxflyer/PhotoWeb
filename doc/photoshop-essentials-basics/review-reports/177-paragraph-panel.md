# 177 paragraph-panel
- Lesson path: `doc/photoshop-essentials-basics/paragraph-panel/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- Window > Paragraph or Options Bar toggle opens Paragraph panel (`type-paragraph-panel-window-paragraph-52436680.gif`, `type-paragraph-panel-character-paragraph-toggle-4a50f0bb.gif`).
- Alignment, four justification modes, left/right/first-line indents, space before/after, hyphenate, and reset panel menu are expected.

## Photoweb Coverage
- Paragraph panel component implements alignment/indent/spacing controls in `src/components/Panels/ParagraphPanel.tsx:123`.
- Options Bar exposes type alignment controls in `src/components/Panels/OptionsBar.tsx:1992`.
- Type rendering uses indent and spacing fields for shape text and normal text in `src/tools/type.ts:759`.
- Type panel edits route through history-safe commands in `src/tools/typeCommands.ts:205`.

## Gaps / Mismatches
- Justify Last Left/Centered/Right/All and Hyphenate are not evident in the inspected code.
- Reset Paragraph panel menu behavior is not evident.

## Scope Decision
Fix.

## Recommended Follow-up
Add Photoshop justification modes and Hyphenate UI, or mark them as explicit typography-scope deferrals.
