# 204 magic-wand-tool
- Lesson path: `doc/photoshop-essentials-basics/magic-wand-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `14a-content-selection-tools`

## Lesson Expectations
- Magic Wand is nested behind Quick Selection; W/Shift+W cycles tools (`selections-magic-wand-tool-photoshop-magic-wand-tool-85dc96a6.gif`).
- Options Bar Tolerance controls tonal range; default 32, 0 selects exact tone, higher selects broader range (`selections-magic-wand-tool-magic-wand-tolerance-410149eb.gif`).
- Contiguous selects touching pixels only; non-contiguous selects all matching pixels; add/subtract selection modifiers work.

## Photoweb Coverage
- Shortcut group includes Magic Wand in `src/App.tsx:720`.
- Selection slice implements tolerance-based flood grow and similar selection in `src/store/selectionSlice.ts:149` and `src/store/selectionSlice.ts:181`.
- Magic Wand tool implementation lives in `src/tools/magicWand.ts`; content-selection tests cover this cluster in `src/test/14a-content-selection-tools.test.tsx`.

## Gaps / Mismatches
- Need focused Magic Wand tests for tolerance 0 vs 32/64 and Contiguous on/off if not already present outside the searched filenames.
- Anti-alias/Sample All Layers options should be audited against the Options Bar.

## Scope Decision
Fix.

## Recommended Follow-up
Add focused Magic Wand regression tests for tolerance, contiguous, anti-alias, Sample All Layers, and modifier modes.
