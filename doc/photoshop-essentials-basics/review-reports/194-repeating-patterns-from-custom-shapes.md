# 194 repeating-patterns-from-custom-shapes
- Lesson path: `doc/photoshop-essentials-basics/repeating-patterns-from-custom-shapes/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `28-patterns`

## Lesson Expectations
- Create 100x100 transparent tile, add center guides, choose Custom Shape Tool, often Fill Pixels mode, draw centered shape.
- Duplicate layer, Filter > Other > Offset with wraparound, define pattern via Edit > Define Pattern, then fill a larger document.
- Screenshot extraction for this markdown returned no `![...](images/...)` refs, but headings describe the workflow.

## Photoweb Coverage
- New Guide dialog and guide history are implemented/tested in `src/test/guidesHistory.test.tsx:27`.
- Offset filter with Wrap Around exists in `src/filters/otherFilters.tsx:93`.
- Define Pattern and pattern fill are exposed from `src/components/layout/MenuBar.tsx:292`, `src/components/Dialogs/DefinePatternDialog.tsx:122`, and `src/tools/patterns.ts`; tests cover define/fill/Offset in `src/test/28-patterns.test.tsx:56`.
- Custom shapes are implemented in `src/tools/customShapes.ts` and `src/tools/shapes.ts`.

## Gaps / Mismatches
- Need an end-to-end recipe test combining guides, custom shape Fill Pixels mode, Offset wrap, Define Pattern, and Pattern Fill.
- Center snapping/alignment to guides for shape drawing should be verified.

## Scope Decision
Fix.

## Recommended Follow-up
Add a pattern-tile workflow test using a custom shape and Offset wraparound.
