# 144 type-on-a-path
- Lesson path: `doc/photoshop-essentials-basics/type-on-a-path/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `25a-type-on-path-warp`

## Lesson Expectations
- Draws a path or ellipse, then uses the Type Tool when the cursor changes to a path I-beam.
- Clicking the path creates editable type-on-path.
- Path Selection moves text along the path, flips it across the path, and uses start/end brackets.
- Selecting another layer hides the path outline; screenshot `cs6-type-on-a-path-select-background-layer-144ed013.png` grounds this behavior.

## Photoweb Coverage
- `src/tools/type.ts:8` defines path and shape text modes; `src/tools/type.ts:88` stores path text data.
- `src/tools/type.ts:475` renders type-on-path handles and `src/tools/type.ts:587` creates text-on-path from a path hit.
- `src/test/25a-type-on-path-warp.test.tsx:74` covers shape path mode, `src/test/25a-type-on-path-warp.test.tsx:92` covers type-on-path creation, and `src/test/25a-type-on-path-warp.test.tsx:121` covers Direct Selection dragging and flipping.

## Gaps / Mismatches
- No explicit gap found for the core type-on-path habit.
- Photoshop's exact cursor glyph changes and path-hide polish may need visual QA beyond the unit tests.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless visual QA shows cursor/path-state mismatches.
