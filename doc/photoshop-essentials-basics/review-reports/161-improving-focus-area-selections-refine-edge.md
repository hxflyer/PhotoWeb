# 161 improving-focus-area-selections-refine-edge
- Lesson path: `doc/photoshop-essentials-basics/improving-focus-area-selections-refine-edge/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `16b-focus-area`

## Lesson Expectations
- Starts from Focus Area and opens Refine Edge.
- Uses View Mode and `F` cycling, Zoom/Hand navigation, Edge Detection Radius, Show Radius, Smart Radius, Refine Radius and Erase Refinements brushes, Preview `P`, Adjust Edge sliders, and Output settings.
- Grounding screenshots include `2014-focus-area-pt2-focus-area-refine-edge-378002b2.gif`, `2014-focus-area-pt2-refine-edge-dialog-box-0a88cd1a.gif`, `2014-focus-area-pt2-refine-edge-navigation-tools-ada7218f.gif`, and `2014-focus-area-pt2-smart-radius-3bfe1c6b.gif`.

## Photoweb Coverage
- `src/components/Dialogs/FocusAreaDialog.tsx:172` hands off to Refine Edge.
- `src/components/Dialogs/RefineEdgeDialog.tsx:77` computes live preview; `src/components/Dialogs/RefineEdgeDialog.tsx:135` applies output.
- `src/components/Dialogs/RefineEdgeDialog.tsx:166` renders view mode selection; `src/components/Dialogs/RefineEdgeDialog.tsx:196` renders Radius, Smooth, Feather, Contrast, Shift Edge, and Smart Radius controls.
- `src/test/16b-focus-area.test.tsx:119` covers new layer with mask and Refine Edge handoff; `src/test/refineEdge.test.ts:33` covers refine calculations.

## Gaps / Mismatches
- Refine Radius and Erase Refinements brush tools were not found.
- Show Radius, dialog Zoom/Hand navigation, and `F`/`P` shortcut parity in Refine Edge appear incomplete or untested.
- The implementation has useful sliders, but Photoshop's edge-brushing workflow is only partially represented.

## Scope Decision
Fix

## Recommended Follow-up
Add Refine Radius/Erase Refinements tools or explicitly accept slider-only refinement; test View Mode cycling, Preview, Smart Radius, Show Radius, and dialog navigation shortcuts.
