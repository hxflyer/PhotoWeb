# 019 how-to-use-live-gradients-in-photoshop-2023
- Lesson path: `doc/photoshop-essentials-basics/how-to-use-live-gradients-in-photoshop-2023/lesson.md`
- Scope status: `in_scope` from lessons.json
- Cluster coverage: 22b-live-gradients

## Lesson Expectations
- Gradient Tool in Gradient mode creates a non-destructive Gradient Fill layer with on-canvas controls for endpoint, midpoint, angle, scale/position, and editable color stops.
- Screenshots include `2023-live-gradients-gradient-mode-option-88e47bfb.png`, `2023-live-gradients-gradient-styles-icons-4f78b507.png`, and `2023-live-gradients-drawing-live-gradient-in-photoshop-3878e479.jpg`.

## Photoweb Coverage
- Options Bar switches between `Gradient` and `Classic Gradient` modes (`src/components/Panels/OptionsBar.tsx:1424`, `src/test/gradientEditor.test.tsx:245`).
- Gradient tool creates editable live state and Gradient Fill layers (`src/tools/gradient.ts:128`, `src/tools/gradient.ts:618`, `src/tools/gradient.ts:623`, `src/test/liveGradientSliceI.test.ts:194`).
- Enter commits as one history entry; dragging endpoints after pointer-up repositions the gradient (`src/test/liveGradientSliceI.test.ts:92`, `src/test/liveGradientSliceI.test.ts:126`, `src/test/liveGradientSliceI.test.ts:220`).

## Gaps / Mismatches
- Photoshop's full contextual task bar and every on-canvas stop/edit affordance are not fully represented; photoweb covers endpoint/live-layer editing and Gradient Editor stops.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
