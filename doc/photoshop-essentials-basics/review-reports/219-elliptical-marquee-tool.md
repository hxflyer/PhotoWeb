# 219 elliptical-marquee-tool
- Lesson path: `doc/photoshop-essentials-basics/elliptical-marquee-tool/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: `12-marquee`

## Lesson Expectations
- Elliptical Marquee draws ovals; Shift constrains to circle; Alt/Option draws from center; Space repositions while drawing.
- Options Bar supports Feather, Anti-alias, Style (`Normal`, Fixed Ratio, Fixed Size), Width/Height.
- Deselect via `Select > Deselect` or `Ctrl/Cmd+D`.
- UI screenshots: `selections-emt-photoshop-elliptical-marquee-tool-add9b85f.gif`, `selections-emt-use-shift-key-c17005b0.gif`, `selections-emt-reposition-selection-outline-e1fd0cc1.gif`.

## Photoweb Coverage
- Elliptical marquee registered as `marquee-ellipse` (`src/tools/marquee.ts:383-389`).
- Marquee engine handles Shift constrain, Alt center, fixed ratio/size, anti-alias/feather mask generation, and Space repositioning (`src/tools/marquee.ts:54-117`, `src/tools/marquee.ts:204-313`).
- Options Bar exposes marquee style/width/height/swap (`src/components/Panels/OptionsBar.tsx:384-421`).
- Tests cover fixed ratio/size, ellipse anti-alias, and Space repositioning (`src/test/12-marquee.test.tsx:63-130`, `src/test/marqueeFeather.test.ts`).

## Gaps / Mismatches
- No major mismatch found for marquee choreography.
- Confirm Options Bar exposes Feather and Anti-alias close enough to Photoshop; implementation exists but line evidence was less direct than style/size controls.

## Scope Decision
Fix.

## Recommended Follow-up
Add a small UI test that specifically asserts Elliptical Marquee Feather and Anti-alias controls are visible and affect selection state.
