# 057 create-color-swatches-from-images-in-photoshop-cc-2020
- Lesson path: `doc/photoshop-essentials-basics/create-color-swatches-from-images-in-photoshop-cc-2020/lesson.md`
- Scope status: `in_scope`
- Cluster coverage: 23-color-swatches

## Lesson Expectations
- Duplicate image layer, apply Filter > Pixelate > Mosaic to simplify colors, adjust Cell Size.
- Open Swatches panel, create a new swatch group, use Eyedropper to sample pixelated colors, click New Swatch to add each color.
- Save custom swatch set for reuse.
- Screenshots grounding UI: `2020-create-color-swatches-choose-mosaic-filter-photoshop-169789e8.png`, `2020-create-color-swatches-swatches-panel-photoshop-3952af05.png`, `2020-create-color-swatches-sample-color-with-eyedropper-tool-e06353cf.jpg`, `2020-create-color-swatches-new-color-swatches-photoshop-16cc0442.png`.

## Photoweb Coverage
- Swatches panel supports groups, new group, new swatch, delete, group collapse, and foreground/background color selection in `src/components/Panels/SwatchesPanel.tsx:18`.
- Eyedropper sampling and averaged color behavior are tested in `src/test/23-color-swatches.test.tsx:53`.
- Mosaic filter behavior is tested in `src/test/23-color-swatches.test.tsx:105`.
- Persistent swatch groups are implemented in `src/store/colorSlice.ts:116`.

## Gaps / Mismatches
- Save/export as Photoshop `.aco` swatch set is not present; Photoweb uses local/browser persistence.
- New Swatch dialog naming/confirmation is not obvious; adding a swatch appears one-click from foreground color.
- Workflow is implemented in pieces, not a guided "create swatches from image" command.

## Scope Decision
divergence already accepted

## Recommended Follow-up
No action unless external swatch import/export becomes a product requirement.

