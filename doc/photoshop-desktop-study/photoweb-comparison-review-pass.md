# Photoweb Comparison Review Pass

Scope: review of all generated Photoweb comparison documents against the source note files in `doc/photoshop-desktop-study/pages/`.

Review date: 2026-05-10

## Coverage Check

- Comparison documents reviewed: 7
- Source note references found in comparison documents: 549
- Source note files in `pages/`: 549
- Missing source references: 0
- Unreferenced source notes: 0

Section counts:
- `photoweb-function-comparison-0001-0010.md`: 10
- `photoweb-function-comparison-0011-0110.md`: 100
- `photoweb-function-comparison-0111-0210.md`: 100
- `photoweb-function-comparison-0211-0310.md`: 100
- `photoweb-function-comparison-0311-0406.md`: 100
- `photoweb-function-comparison-0407-0505.md`: 100
- `photoweb-function-comparison-0506-0544.md`: 39

Total: 549 sections for 549 source note files.

## Review Method

- Confirmed every `Source note` reference in the comparison files points to an existing note file.
- Confirmed every note file in `pages/` is referenced exactly through the comparison set.
- Reopened representative source note bodies from each major area, including GPU settings, layer effects, contextual removal, dynamic text, selection refinement, custom shapes, star shapes, export, and troubleshooting.
- Rechecked high-risk comparisons against Photoweb code where titles alone could understate implemented placeholders or partial implementations.

## Corrections Made

- `0211 - Select Only An Area Intersected By Other Selections`: changed intersect selection from effectively missing to `Partial` because Photoweb has a Shift+Alt/Option-style intersect operation path, while still needing correctness and polish.
- `0335 - Create Shapes`: clarified that Photoweb supports rectangle, rounded rectangle, ellipse, polygon, and line drawing, while shape/path/pixel mode behavior remains partial.
- `0337 - Draw Shapes`: changed polygon and line tools to `Present with differences`; kept custom shapes as missing/non-functional.
- `0339 - Draw Custom Shapes`: changed overall status to `Partial` because a Custom Shape tool entry is registered, but preset-based custom shape rendering is not implemented.
- `0340 - Create Star Shapes`: changed overall status to `Partial` because Photoweb has a polygon tool, but lacks Photoshop-style star-specific options.
- `0342 - Draw Lines And Curves`: changed dedicated line tool to `Present with differences`.
- `0344 - Draw Lines And Line Segments`: changed Line Shape tool to `Present with differences`; arrowhead and full Photoshop line options remain missing.
- Updated related summary wording for selection intersection and shape tools.

## Remaining Risk

- The comparison documents are now coverage-checked and corrected for the issues found in this review pass, but they are still concise comparison summaries rather than exhaustive per-paragraph audits.
- Areas with the highest risk of needing future detail are features where Photoweb has placeholders or partial code paths: shape modes, custom shapes, layer masks from selections, selection intersection, export formats, and browser-dependent file support.
