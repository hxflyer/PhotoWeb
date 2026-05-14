# 142 layers-panel
- Lesson path: `doc/photoshop-essentials-basics/layers-panel/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `07a-layers-panel`

## Lesson Expectations
- Opens the Layers panel from Window > Layers or `F7`.
- Shows layer rows with thumbnails, visibility eyes, active-layer highlight, names, stacking order, blend mode, opacity, fill, lock controls, and add/delete controls.
- Supports dragging/reordering, renaming, and panel options such as thumbnail size.
- Grounding lesson images include Layers panel and Panel Options screenshots.

## Photoweb Coverage
- `src/components/Panels/LayersPanel.tsx:33` stores thumbnail preferences and `src/components/Panels/LayersPanel.tsx:196` implements Layers Panel Options.
- `src/components/Panels/LayersPanel.tsx:592` exposes the flyout menu including Panel Options.
- `src/components/Panels/LayersPanel.tsx:640` implements blend/opacity UI; `src/components/Panels/LayersPanel.tsx:674` implements locks/fill UI.
- `src/components/Panels/LayersPanel.tsx:728` renders layer rows, visibility, thumbnails, active state, and row interactions; `src/components/Panels/LayersPanel.tsx:1029` exposes bottom buttons.
- `src/test/07a-layers-panel.test.tsx:33` covers the panel's expected behaviors.

## Gaps / Mismatches
- No clear gap found in the basic panel surface.
- Keyboard access for `F7` should remain covered with the shortcut report for lesson 139.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action.
