# 047 select-subject-vs-remove-background-in-photoshop
- Lesson path: `doc/photoshop-essentials-basics/select-subject-vs-remove-background-in-photoshop/lesson.md`
- Scope status: `out_of_scope: ai_cloud_selection`
- Cluster coverage: none

## Lesson Expectations
- Convert Background layer to a normal layer, then use Properties panel Quick Actions: Select Subject or Remove Background.
- Select Subject creates a subject selection for refinement; Remove Background immediately creates/removes background content, commonly via mask/delete workflow.
- Screenshots grounding UI: `cc-select-subject-vs-remove-background-properties-panel-remove-background-71470db4.png`, `cc-select-subject-vs-remove-background-choose-select-subject-photoshop-3264af05.png`, `cc-select-subject-vs-remove-background-remove-background-button-0a71b2bb.png`.

## Photoweb Coverage
- Non-AI Object Selection, Magic Wand, Quick Selection, masks, and Refine Edge are covered elsewhere.
- The Properties panel intentionally omits AI quick actions; see `src/components/Panels/PropertiesPanel.tsx:151` for the background quick-action set.

## Gaps / Mismatches
- No Select Subject or Remove Background buttons in Properties.
- No Adobe Sensei/cloud AI subject detector.
- This is a deliberate scope exclusion, not a missing implementation.

## Scope Decision
out of scope

## Recommended Follow-up
No action; keep manual/non-AI selection workflows strong.

