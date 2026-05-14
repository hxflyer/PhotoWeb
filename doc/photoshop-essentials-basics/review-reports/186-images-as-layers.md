# 186 images-as-layers
- Lesson path: `doc/photoshop-essentials-basics/images-as-layers/lesson.md`
- Scope status: `out_of_scope: adobe_bridge`
- Cluster coverage: `none`

## Lesson Expectations
- Adobe Bridge selects multiple images and runs Tools > Photoshop > Load Files into Photoshop Layers (`layers-images-as-layers-load-files-into-photoshop-layers-e8ca81a4.gif`).
- Resulting Photoshop document has each source image as a named layer; Alt/Option-click eye solos a layer; layers can be renamed.

## Photoweb Coverage
- Browser-native Load Files into Stack exists through a hidden multiple file input in `src/App.tsx:939`.
- Layer visibility solo/rename are part of the Layers panel surface in `src/components/Panels/LayersPanel.tsx:475` and tests under `src/test/07a-layers-panel.test.tsx`.

## Gaps / Mismatches
- Bridge selection and Tools > Photoshop integration are explicitly out of scope.
- If this lesson were treated only as "multi-image stack", coverage exists elsewhere; lessons.json excludes it because the source workflow is Adobe Bridge.

## Scope Decision
out of scope.

## Recommended Follow-up
No action.
