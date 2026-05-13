# Gap Report — 11a Selections Overview

## Lessons reviewed
- `make-selections-photoshop` — selections are the bridge between Photoshop's pixel model and the user's object intent; overview of marquee, lasso, wand, quick selection, color range, pen, Focus Area, and Transform Selection.
- `why-make-selections` — selections constrain edits to protected pixels, show as animated dashed "marching ants", can be hidden with `Ctrl/Cmd+H`, and make Layer via Copy copy only selected pixels.
- `basic-selections` — the Options Bar exposes New / Add / Subtract / Intersect selection modes; `Shift`, `Alt/Option`, and `Shift+Alt/Option` temporarily select Add / Subtract / Intersect before starting a selection, with cursor `+`, `-`, and `x` badges.

Key UI images inspected:
- `basic-selections/images/photo-editing-basic-selections-options-bar-94097c33.gif` — four selection operation buttons at the left of the Options Bar.
- `basic-selections/images/photo-editing-basic-selections-plus-sign-5cf2f968.gif` — `Shift` shows a cursor plus badge.
- `basic-selections/images/photo-editing-basic-selections-minus-sign-8131ec01.gif` — `Alt/Option` shows a cursor minus badge.
- `basic-selections/images/photo-editing-basic-selections-intersect-with-275f89ce.gif` — `Shift+Alt/Option` shows a cursor x badge.
- `why-make-selections/images/selections-why-photoshop-selection-outline-3d297025.jpg` — marching ants vocabulary and visual state.

## Current photoweb coverage
- Selection operation stack and real intersection: [selectionModifiers.ts](src/tools/selectionModifiers.ts#L32) rasterizes true overlaps for mixed selections.
- Marquee tools already capture the selection operation at pointer-down: [marquee.ts](src/tools/marquee.ts#L149).
- Lasso, Magic Wand, and Quick Selection route through shared selection commit helpers: [lasso.ts](src/tools/lasso.ts#L40), [magicWand.ts](src/tools/magicWand.ts#L196), [quickSelection.ts](src/tools/quickSelection.ts#L114).
- Marching ants render from the rasterized selection mask: [Viewport.tsx](src/components/Canvas/Viewport.tsx#L655).
- `Select > All`, `Deselect`, `Inverse`, and the global shortcuts for All / Deselect / Reselect / Hide Edges exist: [MenuBar.tsx](src/components/layout/MenuBar.tsx#L532), [App.tsx](src/App.tsx#L432).

## Gaps
- The Options Bar operation icons existed but were inert, so selecting Add/Subtract/Intersect there did not affect the next selection gesture.
- Lasso and Polygonal Lasso resolved `Shift` / `Alt` on commit, not at gesture start. Photoshop's lesson explicitly says only the modifier state before mouse-down is required.
- Magic Wand and Quick Selection used modifier gestures but their shared "inside selection means move" decision did not understand Options Bar Add/Subtract/Intersect mode.
- Registered selection tools only showed plus/minus cursor badges for the legacy `select` tool, not for `marquee-*`, `lasso`, `magic-wand`, or `quick-selection`, and no intersect x cursor existed.
- `Select > Reselect` was permanently disabled even though `reselect()` exists.
- The app shortcut for Inverse Selection was `Cmd/Ctrl+I`, while the Select menu and Photoshop habit are `Cmd/Ctrl+Shift+I`.

## Photoshop-habit mismatches
- `basic-selections` shows the four operation icons as live modes in the Options Bar; photoweb treated them as decorative.
- `basic-selections` states the user can release `Shift`, `Alt/Option`, or `Shift+Alt/Option` after starting the drag; lasso-family tools could lose the intended operation if the user released modifiers before commit.
- Cursor feedback from `photo-editing-basic-selections-plus-sign-5cf2f968.gif`, `photo-editing-basic-selections-minus-sign-8131ec01.gif`, and `photo-editing-basic-selections-intersect-with-275f89ce.gif` was incomplete.
- `Select > Reselect` and `Select > Inverse` did not fully match the command surface shown by Photoshop's Select menu conventions.

## UI / UX issues
- Inert toolbar buttons were discoverability traps: they looked clickable but did not change behavior.
- Missing cursor x feedback made Intersect hard to distinguish from Add/Subtract during the gesture.

## Photoshop divergences worth keeping
- None for this cluster.
