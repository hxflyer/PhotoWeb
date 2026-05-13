# plan — 01e-neutral-color-mode

One small Feature spec. The full Interface IA rework is in 02-preferences; this tick adds one checkbox.

---

## 1. Goals

### 1.1 Feature spec — Neutral Color Mode

**What it does.** Adds a `Neutral Color Mode` checkbox to Preferences > Interface. When checked, `--accent-primary` and `--accent-highlight` on `:root` are overridden to neutral gray values (matching `--text-main` lightness, no hue). The change is live (no save/reload), persistent, and off by default.

**Photoshop habit preserved.** Label "Neutral Color Mode" verbatim; location Preferences > Interface; default off; live update. Color-related surfaces (Color Picker, Gradient Editor, Swatches) are unaffected because they don't use the accent tokens. Grounded in `remove-distractions-with-neutral-color-mode-in-photoshop-2022/lesson.md:36-50`.

**Invocation.** Click the checkbox under Preferences > Interface > Neutral Color Mode. No keyboard shortcut. No toolbar affordance.

**Pre-conditions.** None.

**Interaction choreography.**
1. User opens Preferences (`Ctrl/Cmd+K`).
2. Interface section shows: color-theme thumbnails row, then a new "Neutral Color Mode" checkbox row.
3. User clicks the checkbox. The state flips immediately. Accent overrides apply live — active tool buttons, active panel tabs, dialog commit buttons swap from blue to gray.
4. User closes the dialog. State persists in localStorage at `photoweb:chromePrefs:v1`.
5. Reopening Preferences shows the checkbox in the same state.

**Visual feedback.** Standard checkbox row with a label. No icon. No animation on the accent swap (CSS-variable swap is instant).

**Post-conditions.** `neutralColorMode: boolean` in viewSlice, persisted.

**Edge cases.**
- localStorage unavailable: in-memory only.
- Mode on, then user switches color theme (01a) to a lighter theme: the gray accent override stays on top of whatever the theme's text/background colors are. Acceptable — neutral is neutral.
- Tests that mount components requiring accents (e.g. snapshot tests for tab highlight) read the live computed style; they're unaffected because the default is off.

---

## 2. Out-of-scope-this-tick

- **Preferences dialog category-sidebar restructure** (defer to 02-preferences).
- **Per-element granular neutral-mode** (e.g. only neutralising buttons but not tabs). Photoshop's toggle is binary; ours matches.
- **Animation on the swap.** Instant matches Photoshop.

## 3. Files to edit / create

| Concern | Files |
|---|---|
| Store | edit [src/store/types.ts](src/store/types.ts) (`neutralColorMode: boolean` + setter); edit [src/store/viewSlice.ts](src/store/viewSlice.ts) (initial value from chromePrefs + persist). |
| UI | edit [src/components/Dialogs/PreferencesDialog.tsx](src/components/Dialogs/PreferencesDialog.tsx) (new checkbox row under Interface). |
| Apply | edit [src/App.tsx](src/App.tsx) (useEffect → setProperty / removeProperty on documentElement). |
| Tests | **new** `src/test/01e-neutral-color-mode.test.tsx`. |

4 files (1 new). Far under the 40-file stop bar.

## 4. Test cases

- `setNeutralColorMode(true)` flips store + persists.
- Default value is `false`.
- Checkbox in PreferencesDialog flips the state.
- Once on, `document.documentElement.style.getPropertyValue('--accent-primary')` reflects a gray value.
- Once off again, the inline override is cleared.

## 5. Divergences from Photoshop

1. **No "blue Share button" to neutralise.** photoweb has no cloud share feature (CLAUDE.md §4 excludes Creative Cloud). The toggle still has value for any blue chrome (active tabs, dialog buttons). *Same UI, different surfaces affected.*
2. **Gray-only override.** Photoshop may pick a specific neutral hue; we use `0 0% 56%` (matches `--text-muted`) for `--accent-primary` and `0 0% 70%` for `--accent-highlight`. *Defensible default.*

## 6. Stop conditions specific to this cluster

- Stop if any panel/component shows that it had been *abusing* `--accent-primary` for image-data rendering (e.g. swatches that should be color-data). None observed; if found, swap to a dedicated color-data token instead of letting neutral mode break the picker.
