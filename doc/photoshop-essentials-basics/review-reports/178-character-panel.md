# 178 character-panel
- Lesson path: `doc/photoshop-essentials-basics/character-panel/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `24-type-basics`

## Lesson Expectations
- Window > Character or Options Bar toggle opens Character panel (`type-character-panel-window-character-0bb9f20b.gif`).
- Font family/style/size/color match Options Bar controls; anti-alias choices Sharp/Crisp/Strong/Smooth are exposed.
- Leading, tracking, kerning, vertical/horizontal scale, baseline shift, faux styles, case, super/subscript, underline/strike, language, and reset are expected.

## Photoweb Coverage
- Character panel exists in `src/components/Panels/CharacterPanel.tsx:41`.
- Default text style includes font, size, style, antiAlias and many advanced fields in `src/tools/type.ts:323`.
- Rasterizer applies antiAlias hints, tracking, faux bold/italic, baseline shift, super/subscript, underline, and strike in `src/tools/type.ts:747`.
- Tests cover Options Bar font/style/antiAlias edits in `src/test/24-type-basics.test.tsx:118`.

## Gaps / Mismatches
- Kerning and language controls are not evident in the inspected UI/code.
- Canvas2D anti-alias mapping is approximate; `smooth` maps to a browser textRendering hint, not Photoshop's exact edge algorithms.

## Scope Decision
Fix.

## Recommended Follow-up
Add missing Character panel controls where feasible and record anti-alias fidelity as an accepted browser rendering divergence.
