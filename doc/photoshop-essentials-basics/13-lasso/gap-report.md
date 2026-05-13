# Gap Report — 13 Lasso

## Lessons reviewed
- `lasso-tool` — Standard Lasso freehand drag, `L` shortcut, lasso flyout, automatic close on mouse-up, Space temporary navigation, and Shift/Alt add/subtract repair passes.
- `polygonal-lasso-tool` — Polygonal click-to-place anchors, straight live segment, click-start or double-click close, Backspace/Delete undo last anchor, Shift+L cycling, and temporary Alt/Option switch to freehand lasso for curves.
- `magnetic-lasso-tool` — Magnetic edge-snapping lasso, nested flyout, `Shift+L`, Caps Lock precision circle, Width / Contrast / Frequency Options Bar controls, bracket and comma/period adjustment keys, manual anchors, Backspace/Delete undo, Esc cancel, and click-start close.

Key UI images inspected:
- `lasso-tool/images/selections-lasso-tool-photoshop-lasso-tools-192102e4.gif` — Lasso flyout contains Lasso, Polygonal Lasso, and Magnetic Lasso.
- `lasso-tool/images/selections-lasso-tool-lasso-tool-selection-52d5da81.gif` — standard lasso draws a continuous freehand outline.
- `polygonal-lasso-tool/images/selections-polygonal-lasso-tool-polygonal-lasso-tool-80c9e176.gif` — polygonal lasso draws straight segments between clicked anchors.
- `polygonal-lasso-tool/images/selections-polygonal-lasso-tool-end-selection-fe21e035.gif` — close-circle cursor near the first point.
- `magnetic-lasso-tool/images/selections-magnetic-lasso-tool-photoshop-lasso-selection-tools-ac499514.gif` — Magnetic Lasso appears in the same lasso flyout and shares `L`.
- `magnetic-lasso-tool/images/selections-magnetic-lasso-tool-magnetic-lasso-tool-circle-icon-e61232d7.gif` — Caps Lock precision circle with center crosshair.
- `magnetic-lasso-tool/images/selections-magnetic-lasso-tool-magnetic-lasso-tool-width-7e4ae8d2.gif`, `selections-magnetic-lasso-tool-edge-contrast-option-20f2e23a.gif`, and `selections-magnetic-lasso-tool-magnetic-lasso-tool-frequency-656e6523.gif` — Magnetic Lasso Options Bar controls.

## Current photoweb coverage
- Standard Lasso and Polygonal Lasso are registered and commit selection operations through shared selection modifier helpers: [lasso.ts](../../../src/tools/lasso.ts#L36), [lasso.ts](../../../src/tools/lasso.ts#L102).
- Polygonal Lasso supports click-to-close near the first point, Enter commit, Escape cancel, Backspace undo last point, and Shift 45-degree segment snapping: [lasso.ts](../../../src/tools/lasso.ts#L110), [lasso.ts](../../../src/tools/lasso.ts#L166).
- Magnetic Lasso already exists as an edge-snapping tool with Width, Contrast, Frequency options, anchor rendering, Enter commit, Escape cancel, and Backspace undo: [magneticLasso.ts](../../../src/tools/magneticLasso.ts#L23), [magneticLasso.ts](../../../src/tools/magneticLasso.ts#L114).
- `Shift+L` already includes `magnetic-lasso` in the app shortcut group: [App.tsx](../../../src/App.tsx#L591).
- Tests cover Magnetic Lasso option round-trip, edge snapping, Esc, Backspace, and close-start commit: [magneticLasso.test.ts](../../../src/test/magneticLasso.test.ts#L33).

## Gaps
- Magnetic Lasso is registered but absent from the toolbar flyout, Options Bar, Status Bar, and tool label map, so users cannot discover or configure it from the UI.
- Magnetic Lasso Width, Contrast, and Frequency do not have Photoshop-style Options Bar controls or bracket/comma/period shortcut tests.
- Magnetic Lasso resolves add/subtract/intersect at commit time, so releasing the modifier after the first click can lose the intended operation.
- Magnetic Lasso is missing from selection cursor badge coverage.
- Polygonal Lasso double-click close is not represented by the tool interface; this is already partially covered by click-start and Enter close.

## Photoshop-habit mismatches
- `selections-lasso-tool-photoshop-lasso-tools-192102e4.gif` and `selections-magnetic-lasso-tool-photoshop-lasso-selection-tools-ac499514.gif` show all three lasso tools in one flyout; photoweb only exposes Lasso and Polygonal Lasso.
- `selections-magnetic-lasso-tool-magnetic-lasso-tool-width-7e4ae8d2.gif`, `selections-magnetic-lasso-tool-edge-contrast-option-20f2e23a.gif`, and `selections-magnetic-lasso-tool-magnetic-lasso-tool-frequency-656e6523.gif` show Magnetic Lasso controls in the Options Bar; photoweb has no UI for them.
- The lesson says `[` / `]` adjust Width and `,` / `.` adjust Contrast while working; photoweb only has setter functions.

## UI / UX issues
- The Options Bar lasso shape buttons call selection-mode setters but do not switch active tools, making the buttons less direct than the toolbar/flyout.
- Magnetic Lasso status text and shortcut reference omit the third lasso, even though the shortcut group can cycle to it.

## Photoshop divergences worth keeping
- Full temporary switching between Magnetic, Polygonal, and standard Lasso with Alt/Option mid-selection is deferred. It requires mixing three gesture engines inside one in-progress selection and is larger than exposing and tightening the existing Magnetic Lasso workflow.
