# 038 using-the-object-selection-tool-and-object-finder-in-photoshop-2022
- Lesson path: `doc/photoshop-essentials-basics/using-the-object-selection-tool-and-object-finder-in-photoshop-2022/lesson.md`
- Scope status: `out_of_scope: ai_cloud_selection` from lessons.json
- Cluster coverage: none

## Lesson Expectations
- Object Selection Tool rectangle/lasso modes plus 2022 Object Finder, refresh, Object Finder modes, overlays, automatic object detection, and add/subtract object workflows.
- Screenshots include `2022-object-selection-tool-object-selection-tool-photoshop-2022-4f404c6c.png`, `2022-object-selection-tool-object-selection-tool-mode-fef88612.png`, and Object Finder overlay screenshots.

## Photoweb Coverage
- Non-AI Object Selection is kept and appears in the W selection tool group (`src/components/Panels/Toolbar.tsx:48`, `src/components/Panels/Toolbar.tsx:50`).
- Options Bar exposes rectangle/lasso modes, Sample All Layers, Auto-Enhance, and Object Subtract-ish local controls (`src/components/Panels/OptionsBar.tsx:591`, `src/components/Panels/OptionsBar.tsx:609`, `src/components/Panels/OptionsBar.tsx:652`).
- AI Object Finder/cloud detection is excluded and logged as a divergence (`CLAUDE.md:137`, `doc/photoshop-essentials-basics/divergence-log.md:407`).

## Gaps / Mismatches
- No Object Finder auto-detected overlays, refresh, cloud/object recognition, or AI Select Subject behavior.

## Scope Decision
out of scope

## Recommended Follow-up
No action.
