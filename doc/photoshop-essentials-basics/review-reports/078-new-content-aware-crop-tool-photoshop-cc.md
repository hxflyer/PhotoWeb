# 078 new-content-aware-crop-tool-photoshop-cc
- Lesson path: `doc/photoshop-essentials-basics/new-content-aware-crop-tool-photoshop-cc/lesson.md`
- Scope status: `out_of_scope: content_aware`
- Cluster coverage: none

## Lesson Expectations
- Crop Tool Options Bar Content-Aware checkbox; Straighten Tool rotates crop and Photoshop fills transparent corners.
- User can extend crop beyond image bounds and content-aware synthesis fills new empty regions.
- Screenshots grounding UI: `2015-content-aware-crop-crop-tool-content-aware-1a435c52.png`, `2015-content-aware-crop-select-straighten-tool-2184c4b9.png`, `2015-content-aware-crop-empty-corners-after-straightening-189fd6b8.jpg`, `2015-content-aware-crop-content-aware-result-14701c7a.jpg`.

## Photoweb Coverage
- Crop and Straighten exist; Content-Aware fill does not.
- Crop Options Bar has Straighten and Delete Cropped Pixels in `src/components/Panels/OptionsBar.tsx:743`, but no Content-Aware option.

## Gaps / Mismatches
- No Content-Aware Crop checkbox or synthesized fill for transparent corners/out-of-bounds expansion.
- This is intentionally excluded by `content_aware`.

## Scope Decision
out of scope

## Recommended Follow-up
No action.

