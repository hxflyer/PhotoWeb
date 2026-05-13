# gap-report — 01c-panels

## Lessons reviewed

- `managing-panels-photoshop-cc` — full pass over Photoshop CC panel management: panel groups with tabs, drag-to-reorder within a group, drag-between-groups (blue highlight box), drag-create-new-group (blue highlight bar), collapse/expand groups, close-single-panel vs close-tab-group via panel menu icon (☰) or right-click on tab, Window menu opens / lists all panels with checkmark beside open+active panel, sticky panel memory, secondary icon-only column, resize column, Tab / Shift+Tab to hide all panels.
- `managing-panels-in-photoshop-cs6` — CS6 version of the same concepts. Same affordances minus the Libraries panel (out of scope per CLAUDE.md §4 — Creative Cloud).

## Current photoweb coverage

- [src/components/Panels/RightPanelDock.tsx:84-234](src/components/Panels/RightPanelDock.tsx#L84-L234) — three fixed groups (Top: Navigator/Info/Color/Swatches/Adjustments; Middle: Character/Paragraph; Bottom: Layers/Channels/Paths/History/Properties/Brush Presets/Pattern Presets). Each group renders tabs as `<button>` elements that switch the active panel.
- [src/components/Panels/RightPanelDock.tsx:118-130](src/components/Panels/RightPanelDock.tsx#L118-L130) — top group has a `▴/▾` chevron toggle for collapse/expand. Middle group has the same. Bottom group does NOT.
- [src/store/panelsSlice.ts:146-151](src/store/panelsSlice.ts#L146-L151) — `panelVisibility` map + `togglePanelVisibility` + `setPanelVisibility` already exist; closing a panel is one store call away.
- [src/components/layout/MenuBar.tsx:596-614](src/components/layout/MenuBar.tsx#L596-L614) — Window menu has `chk` (checkmark) entries for History/Layers/Channels/Paths/Color/Swatches/Adjustments/Character/Paragraph/Properties. **Navigator and Info entries are `act(..., () => {}, undefined, true)` — disabled placeholders** even though both panels exist and render correctly in RightPanelDock.
- No `Tab` / `Shift+Tab` global shortcut to hide panels.
- No F-key shortcuts for Window menu items (F5 Brush, F6 Color, F7 Layers, F8 Info, F9 Actions).
- No `☰` panel menu icon at top-right of any group.
- No `onContextMenu` on tab buttons → no right-click Close.
- No drag-to-reorder on tabs.
- No drag-between-groups (out of scope this tick — see §6).

## Gaps

| # | Gap | Where |
|---|---|---|
| 1 | No `☰` menu icon at top-right of panel groups. Photoshop puts it there with `Close` / `Close Tab Group` (plus panel-specific entries deferred to per-panel clusters). | [RightPanelDock.tsx:112-131](src/components/Panels/RightPanelDock.tsx#L112-L131) (top group), 155-173 (middle), 187-204 (bottom). |
| 2 | Right-click on tab does nothing. Photoshop's alternate close path is **right-click tab → Close / Close Tab Group**. | All three groups' tab buttons. |
| 3 | Tab order within a group is hard-coded; no drag-to-reorder. Photoshop's primary panel-management gesture is drag-tabs-left-or-right. | RightPanelDock tab buttons; needs new `tabOrder` map in viewSlice. |
| 4 | Bottom group has no collapse/expand chevron — only top + middle groups do. | [RightPanelDock.tsx:186-204](src/components/Panels/RightPanelDock.tsx#L186-L204). |
| 5 | Window menu's Navigator and Info entries are **disabled placeholders** despite the panels working. | [MenuBar.tsx:610-611](src/components/layout/MenuBar.tsx#L610-L611). |
| 6 | No F-key shortcuts in Window menu (Photoshop: F5 Brush Presets, F6 Color, F7 Layers, F8 Info, F9 Actions where applicable). | [MenuBar.tsx:596-614](src/components/layout/MenuBar.tsx#L596-L614) + global key handler in [App.tsx](src/App.tsx). |
| 7 | `Tab` doesn't hide all panels + toolbar + options bar. `Shift+Tab` doesn't hide only the right panels. | New global handler in [App.tsx](src/App.tsx) + `panelsHidden` flag in viewSlice. |
| 8 | Window menu checkmark = panel visibility, not panel **active in its group**. Photoshop puts the check on the active-in-group panel only. | [MenuBar.tsx:596-614](src/components/layout/MenuBar.tsx#L596-L614). Currently low-impact because tab-state lives in component-local state, but worth fixing once tab state moves to the store. |

## Photoshop-habit mismatches

1. **`☰` menu icon placement** — Photoshop puts it at the **top-right of each panel group**, immediately right of the tabs row. Grounded in `managing-panels-photoshop-cc/images/interface-panels-photoshop-select-and-close-panel-8ba0a991.png` (Swatches tab open, `☰` circled at top-right).
2. **Close menu order** — the menu shows panel-specific options first (e.g., "Web Hues", "Web Safe Colors" for Swatches), then a separator, then `Close` / `Close Tab Group`. Grounded in `…/interface-panels-photoshop-close-panel-14edd087.png`. For this tick we ship only the bottom-section entries; panel-specific menu items belong in each panel's per-panel cluster.
3. **Right-click tab** — same menu opens on right-click on any tab. Grounded in lesson body line 165 (CC) / similar in CS6.
4. **Window menu has F-key shortcuts** — `F5 Brush`, `F6 Color`, `F7 Layers`, `F8 Info`, `F9 Actions`. Visible in `interface-panels-photoshop-panels-list-1af54ebd.png` (right column shows `F7` next to Layers, `F6` next to Color, `F8` next to Info).
5. **Tab toggles all chrome**; **Shift+Tab toggles only right panels**. Grounded in `managing-panels-in-photoshop-cs6/lesson.md:258-263`.

## UI / UX issues (separate from §4)

- The current bottom-group tab area has no flexible right-side cluster (no chevron, no ☰). Adding both at once is consistent with top + middle.
- Top + middle groups' chevron uses Unicode arrow characters (`▴` / `▾`). Toolbar uses lucide chevrons elsewhere. Not changing here to keep this tick scoped.
- Window menu function-key entries currently have NO entries for Brush/Brush Presets/Actions/Histogram/Glyphs/etc. — those are tracked in other clusters; F-key bindings only wire up for panels that already exist in our menu.

## Photoshop divergences worth keeping

- **No floating panel windows.** Browser apps can't OS-float arbitrary subtrees; panels stay docked in the right column. Drag-to-float is out forever (record in divergence-log).
- **No secondary icon-only column.** photoweb has a single right column already wide enough for tabs; the secondary column is a Photoshop space-saver that doesn't match our browser layout. Deferred and possibly never built — record as a divergence.
- **No "Reset Essentials" / workspace-reset.** Workspaces are scope-excluded per CLAUDE.md §4. A future "Reset Panels" action could exist without invoking the workspace concept; deferred to a follow-up cluster.
- **No drag-between-groups in this tick.** Self-contained drag-within-a-group is shipped; cross-group drag with the blue-highlight-box machinery (drop on group → join; drop between groups → new group) is deferred to its own follow-up. Record as deferred, not as a permanent divergence.
