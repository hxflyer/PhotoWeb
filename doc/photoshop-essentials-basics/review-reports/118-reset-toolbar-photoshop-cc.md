# 118 reset-toolbar-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/reset-toolbar-photoshop-cc/lesson.md`
- Scope status: `out_of_scope: toolbar_customization`
- Cluster coverage: `none`

## Lesson Expectations
- Reset Toolbar via three-dot/Edit Toolbar customization or Reset All Tools from the Options Bar tool preset menu (`interface-reset-tools-panel-photoshop-reset-all-tools-fd2b3e1d.png`, `interface-reset-tools-panel-photoshop-reset-tools-panel-594eeaed.png`).
- Restores default primary tools and tool option settings.

## Photoweb Coverage
- Toolbar groups, flyouts, active subtool memory, and column toggle exist (`src/components/Panels/Toolbar.tsx:29`, `src/store/viewSlice.ts:322`, `src/test/01b-toolbar.test.tsx:145`).
- No toolbar reset/customization UI was found.

## Gaps / Mismatches
- Toolbar customization/reset is explicitly excluded.
- Reset Tool / Reset All Tools for tool option defaults may be useful, but this lesson is classified under toolbar customization.

## Scope Decision
Out of scope.

## Recommended Follow-up
No action unless product separately wants Reset Tool for option-state recovery.
