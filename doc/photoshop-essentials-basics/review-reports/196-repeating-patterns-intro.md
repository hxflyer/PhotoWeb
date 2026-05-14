# 196 repeating-patterns-intro
- Lesson path: `doc/photoshop-essentials-basics/repeating-patterns-intro/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `28-patterns`

## Lesson Expectations
- New 100x100 transparent document; View > New Guide adds horizontal/vertical guides at 50% (`repeating-patterns-photoshop-new-guide-fd2eb06b.gif`, `repeating-patterns-horizontal-50-589fe1bd.gif`).
- Guide color can change in Preferences > Guides, Grid & Slices.
- Draw/fill tile, Offset duplicate, Edit > Define Pattern, then Edit > Fill > Pattern or Pattern Overlay.

## Photoweb Coverage
- New Guide command exists in `src/components/layout/MenuBar.tsx:660`; guide add/move/undo is covered in `src/test/guidesHistory.test.tsx:27`.
- Offset filter is implemented in `src/filters/otherFilters.tsx:93`.
- Define Pattern dialog and pattern fill are implemented/tested in `src/components/Dialogs/DefinePatternDialog.tsx:122` and `src/test/28-patterns.test.tsx:56`.
- Pattern Overlay exists as a Layer Style entry in `src/components/Dialogs/LayerStyleDialog.tsx:17`.

## Gaps / Mismatches
- New Guide percent input support should be confirmed; store rounds guide position pixels, and tests use pixel positions.
- Preferences for guide color are not evident.

## Scope Decision
Fix.

## Recommended Follow-up
Add percent-unit New Guide support/tests and decide whether guide color preference is in scope.
