# /loop run contract

Every tick of the lessons-driven /loop MUST follow this contract. Read this file before touching any code. The /loop prompt is:

> Process the next unchecked cluster from doc/photoshop-essentials-basics/work-queue.md, per doc/photoshop-essentials-basics/RUN-CONTRACT.md.

The user picked a **fixed-interval /loop** (foreground, ~60 min) with a **conservative stop bar**, **gap-report + plan + commit** artifacts per cluster, and **hand-clustered** thematic groups.

**No external LLM APIs.** Do all analysis, planning, gap-finding, and implementation yourself. Do NOT call DeepSeek, OpenAI, or any other external model from this loop. `scripts/summarize-photoshop-lessons.py` (which uses DeepSeek) was a one-shot data prep job and must not be re-invoked from inside a tick.

---

## 0. Design principle (read first; applies to every section below)

photoweb is **not a Photoshop clone**. It's a user-friendly, professional web photo-editing app whose target audience is **Photoshop-fluent users who must be able to use photoweb immediately, with zero learning, by carrying over their existing habits**.

Three commitments, in order of priority:

1. **Match Photoshop's UI vocabulary, keyboard shortcuts, mouse behavior, modifier keys, and panel layout exactly when there is no good reason not to.** A Photoshop user's muscle memory should just work — same `Ctrl/Cmd+T` for Free Transform, same `Shift` to constrain proportions, same Layers panel structure, same menu item names, same dialog button labels. This is the strongest default and the bar every plan must clear.
2. **Choose Photoshop fidelity over reinvention when in doubt.** If a "better" alternative would force the user to relearn something they already know, prefer Photoshop. Novelty is not a feature.
3. **Diverge deliberately, never accidentally, with good taste.** When a Photoshop behavior cannot or should not be reproduced in the browser (file-system access, OS-level dialogs, Adobe ecosystem features, legacy UI confusion) or has been explicitly excluded in CLAUDE.md §4, make a reasoned departure and record it in [divergence-log.md](divergence-log.md). The departure should still feel native to a Photoshop user — same vocabulary, similar discoverability. "I prefer X" is never a valid reason; "browser cannot do X" and "scope excludes X" are.

**Failure modes to avoid:** modern-web UX patterns that confuse Photoshop users (floating action buttons, gesture-only interactions, hamburger menus, mobile-style toasts as primary feedback, settings hidden behind a single ☰ icon); renaming Photoshop-standard commands to "friendlier" wording; reordering panels because "it's cleaner"; introducing new hotkeys that conflict with Photoshop muscle memory.

The plan.md you write per cluster MUST apply this principle. Each goal answers: *what does a Photoshop user expect here, and are we matching it?* Each deliberate divergence is a one-sentence entry in §5.5 with a hard-constraint reason.

---

## 1. Pre-flight (refuse to start if any fail)

- `git status --porcelain` must be empty. No resuming on a dirty tree.
- Current branch must be `main`. The loop branches off main for each cluster.
- `npx tsc -b` and `npm run lint` must exit cleanly on `main`. No starting from a broken baseline.
- No existing `HUMAN-REVIEW.md` under `doc/photoshop-essentials-basics/<any-cluster>/`. If one exists, stop and surface it.

If any check fails, output a one-paragraph diagnostic and stop. Do NOT attempt to fix the baseline.

---

## 2. Select the cluster

- Read `work-queue.md`. The next item is the first line that starts with `- [ ]`.
- Read `clusters.json` and confirm the cluster's `id`, `name`, `slugs`.
- Create branch: `git checkout -b gap/<cluster-id>` from `main`.

If `work-queue.md` has no unchecked items: print "all clusters complete" and exit. The loop should be stopped by the user at this point.

---

## 3. Read & analyse

For each slug in the cluster:
- Read `doc/photoshop-essentials-basics/<slug>/lesson.md`.
- **Open every image the markdown references.** The Read tool displays PNG/JPG visually; use it on each `![alt](images/<file>)` so you actually see the Photoshop UI layout, panel positions, button placement, cursor shapes, dialog contents, and before/after pixel states. Text alone often loses the visual contract — a lesson may say "click the gear icon" without specifying where it lives until you see the screenshot.
- Skip images only when the markdown's alt text shows it's a decorative hero / before-after marketing shot with no UI information. When in doubt, open it.

Then map current photoweb coverage:
- Use the **Explore** agent (subagent_type=Explore) for breadth; use grep/Read directly when a single file is known.
- For each lesson, note: features described, hotkeys / modifiers, UI surfaces (panel, dialog, options bar, menu), edge cases, hidden tricks, terminology. **Cite which image grounds each UI/layout observation** in the gap report so the reasoning is auditable.

Cap reading at what's needed to make decisions. Don't read the whole src/ tree.

---

## 4. Write `gap-report.md`

Path: `doc/photoshop-essentials-basics/<cluster-id>/gap-report.md`. Sections, in order:

1. **Lessons reviewed** — bullet list: `slug — one-line abstract`.
2. **Current photoweb coverage** — file:line refs grouped by feature.
3. **Gaps** — missing features, broken behaviors, half-implementations, bugs.
4. **Photoshop-habit mismatches** — anything that would surprise or stall a Photoshop user: wrong/missing hotkey, renamed menu item, different modifier behavior, panel in the wrong place, dialog button order swapped, vocabulary mismatch (CLAUDE.md §6: "Photoshop vocabulary in all UI strings"). Cite the lesson screenshot that grounds each observation.
5. **UI / UX issues** — wrong layout, ugly visuals, awkward interactions, accessibility problems separate from #4.
6. **Photoshop divergences worth keeping** — deliberate existing departures we will NOT change (already in [divergence-log.md](divergence-log.md) or about to be added there).

Use markdown link syntax for file refs: `[Layer.ts:42](src/core/Layer.ts#L42)`.

---

## 5. Write `plan.md`

Path: `doc/photoshop-essentials-basics/<cluster-id>/plan.md`. Sections, in order:

1. **Goals — write one Feature spec subsection per gap that will be closed in this tick.** A bullet list of titles is not enough. **plan.md is where final quality is won or lost.** Each Feature spec MUST include, in this order:

   - **What it does** — one paragraph in plain prose. State the outcome a user gets, not the implementation.
   - **Photoshop habit preserved** — the exact hotkey, modifier, menu path, panel position, Options Bar control, dialog button, or terminology that Photoshop users already know. Cite the lesson slug and the screenshot filename that grounds it. If you can't name the habit, you're inventing — re-read the lesson and image.
   - **Invocation** — every Photoshop-equivalent way to trigger this feature: menu path (`Layer > Layer Mask > Reveal All`), toolbar slot + keyboard letter, keyboard shortcut with all modifiers, right-click context entry, Options Bar control, double-click on canvas / panel thumbnail, panel button. Photoshop usually offers multiple paths to the same action — list them all.
   - **Pre-conditions** — required document, layer, selection, mask, or path state. What's grayed-out / disallowed when these aren't met.
   - **Interaction choreography** — numbered steps of the user's mouse + key sequence as they actually perform the gesture. **This is the section that matters most in a professional tool.** Capture every detail that a Photoshop user notices:
     - cursor shape at each step (default arrow, crosshair, hand, eyedropper, transform-rotate, gradient-loaded crosshair, brush-tip ring, "move with arrow" cursor, etc.),
     - modifier-key effects mid-gesture (`Shift` constrain to proportions or 15° increments, `Alt`/`Option` resize-from-center or duplicate, `Space` reposition while dragging a marquee, `Ctrl/Cmd` temporary Move Tool, etc.),
     - live preview state on the canvas during the gesture (marching ants, transform bounding box with handles, gradient line, brush ring, ruler line, crop rule-of-thirds overlay, etc.),
     - what `Esc` / `Enter` / clicking outside the gesture does — commit vs cancel vs nothing,
     - how the Options Bar / Properties panel / status bar text updates as the gesture progresses (size readout, angle readout, "W: 100px H: 100px", etc.),
     - debounce / threshold behavior (click vs drag distinction, double-click timing, hover-preview delays).
   - **Visual feedback** — what the user sees during and after the action, grounded in a specific lesson screenshot (reference its filename under `images/`).
   - **Post-conditions** — final document, layer, selection, history-step state. Whether the gesture creates a single undo entry, or several, and what each is named.
   - **Edge cases** — empty selection, locked Background layer, zero-size drag, gesture started off-canvas, conflicting tool already active, undo/redo interplay with the gesture, oversize or zero input, modifier pressed before vs during the gesture, etc.

   Professional tools are won and lost on this choreography. `Ctrl+T` that scales but ignores `Shift` to constrain is broken, not "good enough". A marquee that doesn't reposition with `Space` mid-drag is broken. Specify the dance precisely so the implementation matches *and the tests can pin every step*.

2. **Out-of-scope-this-tick** — deferred to a future cluster (with a reason).
3. **Files to edit / files to create** — grouped by Feature spec; note which spec each file change serves.
4. **Test cases** — each maps to a Feature spec and exercises its choreography; simulator-driven per CLAUDE.md §5. **At least one test per Feature spec asserts the Photoshop hotkey / shortcut / modifier behavior end-to-end.** Multi-step gestures need multi-step tests (mouse-down → modifier-press → drag → modifier-release → mouse-up) — don't collapse a gesture into a single store-action assertion. Cursor changes, Options Bar text updates, and `Esc`/`Enter` outcomes are testable and should be tested.
5. **Divergences from Photoshop** — each one sentence in the form: *Photoshop does X; photoweb does Y because <browser constraint | scope decision in CLAUDE.md §4 | hard-constraint reason>*. "I prefer X", "it's cleaner", "modern UX" are never valid reasons. Append every divergence to [divergence-log.md](divergence-log.md).
6. **Stop conditions specific to this cluster**.

---

## 6. Implement

Standard CLAUDE.md §5 SOP:
- Edit existing files; create only when architecture in §3 calls for it.
- `npx tsc -b` must exit 0.
- `npm run lint` must show no new errors (pre-existing lint stays).
- `npm test` must be green AND:
  - **≥1 NEW simulator-driven test per new feature or behavior added.**
  - **Every existing test that asserts on a function you edited is updated** to reflect the new contract. The test should still meaningfully exercise the behavior — do not weaken assertions, broaden tolerances, or comment-out cases just to make the suite green.
  - **Tests deleted or skipped (`.skip`, `.todo`, `xit`, `xdescribe`) count as red.** If you genuinely believe a test is obsolete, justify it in `plan.md` before deleting; otherwise update it.
- For UI-affecting work: run `npm run dev` if no server is up, open `http://localhost:5173/`, exercise the golden path and the most likely regression.

The "no half-implementation" rule from CLAUDE.md §6 applies — no `// TODO: implement later` left in the path.

---

## 7. Conservative stop bar

Stop and write `doc/photoshop-essentials-basics/<cluster-id>/HUMAN-REVIEW.md` if ANY of:

- `npm test` is red after two genuine fix attempts.
- `npm run lint` regresses on a file you edited.
- More than **40 file edits** accumulated in this tick.
- A UX divergence from Photoshop feels non-trivial AND is not already in [divergence-log.md](divergence-log.md).
- A test can't be written for a feature you implemented.
- An existing test on a function you edited can't be sensibly updated (assertion no longer maps to the new behavior, structural rewrite needed).
- You're tempted to delete, `.skip`, or weaken existing tests instead of updating them.
- The cluster touches more than 3 unrelated subsystems and would benefit from a smaller split.
- You are about to use `--no-verify`, `--force`, `git reset --hard`, or any other destructive shortcut.

`HUMAN-REVIEW.md` must contain: what was attempted, what's blocking, what was reverted, what was preserved, suggested next move. Then `git stash` or commit a WIP and stop.

---

## 8. Commit & record

On success:

1. Commit on `gap/<cluster-id>` with message:
   ```
   gap/<cluster-id>: <one-line summary>

   <2–4 line body — what landed, what was deferred>
   ```
   No Claude attribution boilerplate (per user preference).
2. Update `work-queue.md`: change `[ ]` → `[x]` and append `  commit: <short-sha>` to that line. Stage and commit `work-queue.md` and any new `gap-report.md` / `plan.md` / `divergence-log.md` additions in a follow-up commit on the same branch:
   ```
   gap/<cluster-id>: record artifacts and queue status
   ```
3. If a remote exists, `git push -u origin gap/<cluster-id>`.
4. Do **not** merge to main. The user reviews per-branch and merges at their pace.
5. Return to `main`: `git checkout main`.

---

## 9. Hand off

End the tick with no dirty tree and on `main`. The next /loop fire re-runs from §1.

If the user has merged some `gap/*` branches into main between ticks, that's fine — the next tick branches from the updated main.

The loop terminates when `work-queue.md` has no `[ ]` items left.

---

## Constants

- **Cluster artifacts directory**: `doc/photoshop-essentials-basics/<cluster-id>/` (create on first write).
- **Branch naming**: `gap/<cluster-id>` (e.g. `gap/06-crop`).
- **Divergence log**: [divergence-log.md](divergence-log.md) — append-only.
