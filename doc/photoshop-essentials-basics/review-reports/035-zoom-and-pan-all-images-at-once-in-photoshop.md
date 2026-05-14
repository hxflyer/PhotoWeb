# 035 zoom-and-pan-all-images-at-once-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/zoom-and-pan-all-images-at-once-in-photoshop/lesson.md`
- Scope status: `out_of_scope: multi_doc_ui` from lessons.json
- Cluster coverage: none

## Lesson Expectations
- Multiple open documents, Window > Arrange 2-up, active document tab, Hand Tool `Scroll All Windows`, Zoom Tool `Zoom All Windows`, Match Zoom, Match Location, and Match All.
- Screenshots include `2022-zoom-and-pan-all-images-window-arrange-00aef9f6.png`, `2022-zoom-and-pan-all-images-photoshop-2up-vertical-layout-e8eb0e0f.jpg`, and `2022-zoom-and-pan-all-images-how-to-pan-all-images-in-photoshop-758c8fde.jpg`.

## Photoweb Coverage
- Contract excludes multi-document UI and synchronized zoom/pan (`CLAUDE.md:141`).
- Code nevertheless has some multi-document/document-arrange state and Window menu entries (`src/store/documentSlice.ts:246`, `src/store/documentSlice.ts:655`, `src/components/layout/MenuBar.tsx:677`, `src/test/08c-doc-transfer.test.tsx:55`).
- Hand options show a `Scroll All Windows` checkbox (`src/components/Panels/OptionsBar.tsx:2415`).

## Gaps / Mismatches
- The lesson's sync zoom/pan/match commands are out of scope, but current UI exposes partial multi-document affordances. That can confuse Photoshop-fluent users because the control implies behavior the app target excludes.

## Scope Decision
needs product decision

## Recommended Follow-up
Either remove/hide `Scroll All Windows` and arrange-window entries, or record a new divergence that photoweb keeps limited multi-document document transfer/layout despite the original exclusion.
