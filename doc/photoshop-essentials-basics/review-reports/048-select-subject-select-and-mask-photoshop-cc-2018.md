# 048 select-subject-select-and-mask-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/select-subject-select-and-mask-photoshop-cc-2018/lesson.md`
- Scope status: `out_of_scope: ai_cloud_selection`
- Cluster coverage: none

## Lesson Expectations
- Select Subject from Select menu, selection-tool Options Bar, Properties panel, and Select and Mask workspace.
- AI chooses the main subject, then user refines edge problems in Select and Mask.
- Screenshots grounding UI: `select-subject-update-photoshop-select-subject-menubar-9dc767f2.png`, `select-subject-update-select-subject-button-options-bar-670f6105.png`, `select-subject-update-select-subject-in-select-and-mask-ff2827bf.png`.

## Photoweb Coverage
- Select and Mask / Refine Edge style coverage exists for manual selections, but AI Select Subject does not.
- Non-AI Object Selection is registered in the W group (`src/components/Panels/Toolbar.tsx:50`) and implemented in `src/tools/objectSelection.ts:148`.
- Object Selection tests are in `src/test/14a-content-selection-tools.test.tsx:62`.

## Gaps / Mismatches
- No Select > Subject menu path, Options Bar button, Properties button, or Select and Mask AI button.
- This is correct per explicit AI/cloud selection exclusion.

## Scope Decision
out of scope

## Recommended Follow-up
No action.

