# Plan — 13 Lasso

## Goals

### Feature spec: Expose the full lasso family

**What it does** — The toolbar flyout, Options Bar, Status Bar, shortcut list, and tool labels expose Lasso, Polygonal Lasso, and Magnetic Lasso as one Photoshop-style `L` group.

**Photoshop habit preserved** — `lasso-tool/images/selections-lasso-tool-photoshop-lasso-tools-192102e4.gif` and `magnetic-lasso-tool/images/selections-magnetic-lasso-tool-photoshop-lasso-selection-tools-ac499514.gif` show the three-tool flyout, all sharing `L`.

**Invocation** — Toolbar flyout; `L` to activate the visible lasso; `Shift+L` to cycle Lasso → Polygonal Lasso → Magnetic Lasso; Options Bar lasso buttons.

**Pre-conditions** — A document is open. The active tool can be switched even without a layer, but Magnetic Lasso needs an active layer before it can start an edge-snap selection.

**Interaction choreography**
1. User opens the lasso flyout and sees all three lasso tools.
2. User chooses Magnetic Lasso or presses `Shift+L` until it is active.
3. Options Bar changes to Magnetic Lasso controls; Status Bar shows Magnetic Lasso.

**Visual feedback** — The active toolbar icon/label and Options Bar match the selected lasso family member.

**Post-conditions** — Active tool and toolbar group state persist like existing tool flyouts.

**Edge cases** — Existing `Use Shift Key For Tool Switch` behavior remains intact.

### Feature spec: Magnetic Lasso controls and shortcuts

**What it does** — Magnetic Lasso exposes Width, Contrast, and Frequency in the Options Bar. `[` and `]` adjust Width; `,` and `.` adjust Contrast. The operation mode is captured on first click so modifier release does not change add/subtract/intersect mode.

**Photoshop habit preserved** — `magnetic-lasso-tool/images/selections-magnetic-lasso-tool-magnetic-lasso-tool-width-7e4ae8d2.gif`, `selections-magnetic-lasso-tool-edge-contrast-option-20f2e23a.gif`, and `selections-magnetic-lasso-tool-magnetic-lasso-tool-frequency-656e6523.gif` show the exact Options Bar controls. The lesson explicitly names bracket keys and comma/period keys.

**Invocation** — Edit Options Bar numeric fields; press `[` / `]` or `,` / `.` while Magnetic Lasso is active; click to plant anchors; Enter or click-start to commit; Esc cancels; Backspace/Delete removes anchors.

**Pre-conditions** — Magnetic Lasso is active. Width clamps to 1..256, Contrast and Frequency clamp to 0..100.

**Interaction choreography**
1. User sets Width / Contrast / Frequency before starting, or adjusts Width/Contrast by keyboard while working.
2. First click captures the current selection operation from Shift / Alt / Shift+Alt.
3. Cursor movement snaps the live line to high-contrast edges using the configured options.
4. User commits with Enter or by clicking near the first anchor.

**Visual feedback** — Anchor squares and the live snapped line continue to render; Options Bar fields update as shortcut keys change values.

**Post-conditions** — Commit writes one selection operation with the operation captured at the first click.

**Edge cases** — Backspace and Delete both undo the last anchor. Esc clears the in-progress magnetic lasso without committing.

## Out-of-scope-this-tick
- Alt/Option temporary switching between lasso engines during an in-progress Magnetic or Polygonal Lasso selection is deferred because it requires coordinating three gesture states in one active path.
- A browser-native custom magnetic lasso cursor image is deferred; photoweb keeps crosshair/selection badges and renders the tool geometry on canvas.

## Files to edit / files to create
- `src/store/types.ts`, `src/components/Panels/Toolbar.tsx`, `src/components/Panels/OptionsBar.tsx`, `src/components/layout/StatusBar.tsx`, `src/core/shortcuts.ts`, `src/components/Canvas/Viewport.tsx` — expose Magnetic Lasso UI surfaces.
- `src/tools/magneticLasso.ts` — clamp options, keyboard shortcuts, Delete support, and first-click operation capture.
- `src/test/13-lasso.test.tsx` and existing Magnetic Lasso tests — cover UI exposure, options, shortcuts, and operation capture.

## Test cases
- Toolbar lasso flyout exposes Magnetic Lasso and clicking it activates `magnetic-lasso`.
- Options Bar Magnetic Lasso fields update Width / Contrast / Frequency.
- `]`, `[`, `.`, and `,` adjust Magnetic Lasso options through `onKeyDown`.
- Alt/Option captured on first Magnetic Lasso click still commits subtract after Alt is released.
- Existing lasso, polygonal lasso, magnetic lasso, and `Shift+L` tests remain green.

## Divergences from Photoshop
- Photoshop lets Alt/Option temporarily switch between Magnetic, standard, and Polygonal Lasso during one in-progress selection; photoweb defers this because the current tool architecture keeps each lasso engine's gesture state separate.

## Stop conditions specific to this cluster
- Stop if temporary lasso-engine switching becomes required to keep existing tests meaningful.
- Stop if exposing Magnetic Lasso requires changing the store's selection operation model.
