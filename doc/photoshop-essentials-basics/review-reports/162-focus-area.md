# 162 focus-area
- Lesson path: `doc/photoshop-essentials-basics/focus-area/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `16b-focus-area`

## Lesson Expectations
- Opens Select > Focus Area and performs automatic analysis.
- Provides View modes with `F`, In-Focus Range, Advanced Image Noise, Add/Subtract Focus Area brush tools, Preview `P`, Soften Edges, Output To, and a Refine Edge path.
- Grounding screenshots include `cc-2014-focus-area-select-focus-area-ed911f0b.gif`, `cc-2014-focus-area-focus-area-dialog-box-395c244d.gif`, and `cc-2014-focus-area-focus-area-add-subtract-4f3c6a10.gif`.

## Photoweb Coverage
- `src/components/Dialogs/FocusAreaDialog.tsx:43` manages Focus Area state; `src/components/Dialogs/FocusAreaDialog.tsx:69` computes the mask.
- `src/components/Dialogs/FocusAreaDialog.tsx:86` implements `F`, `P`, `E`, and bracket brush shortcuts.
- `src/components/Dialogs/FocusAreaDialog.tsx:113` handles add/subtract brush strokes, including `Alt/Option` inversion; `src/components/Dialogs/FocusAreaDialog.tsx:126` handles output.
- `src/utils/focusArea.ts:16` computes masks and `src/utils/focusArea.ts:80` applies add/subtract painting.
- `src/test/16b-focus-area.test.tsx:70` covers mask computation; `src/test/16b-focus-area.test.tsx:100` covers subtract brush; `src/test/16b-focus-area.test.tsx:145` covers shortcuts.

## Gaps / Mismatches
- The automatic focus mask is a browser implementation and will not match Photoshop's subject/focus detection quality.
- In-Focus Range and Image Noise controls are present in the lesson expectations but should be verified for UI parity and test coverage if exposed.

## Scope Decision
Fix

## Recommended Follow-up
Add regression fixtures for Focus Area output quality and verify In-Focus Range, noise, view mode, preview, brush add/subtract, and output modes against the cluster checklist.
