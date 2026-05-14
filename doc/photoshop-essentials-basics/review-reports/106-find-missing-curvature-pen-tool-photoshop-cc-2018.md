# 106 find-missing-curvature-pen-tool-photoshop-cc-2018
- Lesson path: `doc/photoshop-essentials-basics/find-missing-curvature-pen-tool-photoshop-cc-2018/lesson.md`
- Scope status: `out_of_scope: version_changelog`
- Cluster coverage: `none`

## Lesson Expectations
- Restore a missing Curvature Pen Tool after upgrade by Edit > Toolbar / three-dot toolbar icon, dragging it from Extra Tools back into Toolbar (`2018-curvature-pen-tool-workspaces-photoshop-customize-toolbar-dialog-box-04edb44d.png`).
- Depends on custom workspaces and toolbar customization.

## Photoweb Coverage
- Curvature Pen Tool itself exists in the Pen group (`src/tools/pen.ts:1082`, `src/core/shortcuts.ts:100`).
- Toolbar flyouts and default active tool memory exist (`src/components/Panels/Toolbar.tsx:29`, `src/test/01b-toolbar.test.tsx:145`).

## Gaps / Mismatches
- Edit Toolbar, Extra Tools, custom workspaces, and toolbar reset/customization are excluded.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action.
