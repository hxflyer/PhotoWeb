# 071 copy-layer-effects-photoshop
- Lesson path: `doc/photoshop-essentials-basics/copy-layer-effects-photoshop/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 08a-layer-ops

## Lesson Expectations
- Alt/Option-drag a single effect name to copy one effect; Alt/Option-drag `Effects` to copy all effects.
- Right-click source layer > Copy Layer Style, right-click target > Paste Layer Style for full style/blending-options copy.
- Can paste style to groups; Fill value matters for visual matching.
- Screenshots grounding UI: `layer-effects-copy-paste-copy-single-layer-effect-5db3dc32.png`, `layer-effects-copy-paste-copy-all-layer-effects-958b02af.png`, `layer-effects-copy-paste-copy-layer-style-42839ae3.png`, `layer-effects-copy-paste-paste-layer-style-6c4f5489.png`.

## Photoweb Coverage
- Layer Style menu exposes Copy/Paste/Clear in `src/components/layout/MenuBar.tsx:446`.
- Layers panel supports dragging effects to copy all effects by copying then pasting style in `src/components/Panels/LayersPanel.tsx:543`.
- Store copies and pastes full layer style/effects in `src/store/layersSlice.ts:1526`.
- Test covers Alt-dragging an fx badge copies all effects in `src/test/08a-layer-ops.test.tsx:104`.

## Gaps / Mismatches
- Single-effect Alt/Option-drag by effect name was not verified; code path appears to copy all effects from an effects badge.
- Pasting onto a group needs explicit verification if group effects are intended.
- Context menu parity for right-click Copy/Paste Layer Style appears partially present, but exact row/menu behavior was not fully inspected.

## Scope Decision
Fix

## Recommended Follow-up
Add single-effect copy/drag coverage or document that Photoweb only supports full style copy.

