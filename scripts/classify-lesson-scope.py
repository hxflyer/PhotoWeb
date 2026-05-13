#!/usr/bin/env python3
"""
Classify each lesson in doc/photoshop-essentials-basics/lessons.json as
in-scope or out-of-scope for photoweb, based on the rules captured in
CLAUDE.md section 4 ("Scope Guardrails") plus the 30-question Q&A.

Writes `in_scope: bool` (always) and `out_reason: str` (only when False)
back into the same JSON file. The file is otherwise preserved (url, slug,
image_count, summary stay intact). Atomic tmp+rename write.

Rules are applied first-match-wins in declaration order, so put more
specific reasons before broader ones. To revisit scope: edit the RULES
list and re-run `python3 scripts/classify-lesson-scope.py`.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

LESSONS_PATH = Path("doc/photoshop-essentials-basics/lessons.json")


# Manual overrides keyed by slug: lessons whose slug does not betray their
# subject but whose body is wholly out of scope. Reviewed by hand during the
# Phase 0 clustering pass.
MANUAL_OUT: dict[str, str] = {
    # Pure orientation lesson whose substance is all out-of-scope topics:
    # Creative Cloud update, install Bridge, Color Settings, prefs reset.
    "getting-started-photoshop": "adobe_bridge",
    # Entirely about Select Subject / Remove Background on Adobe's cloud.
    "how-to-make-complex-selections-instantly-in-photoshop": "ai_cloud_selection",
    # The lesson IS the Adobe Bridge workflow; the non-Bridge equivalent is
    # covered by open-multiple-images-as-layers-in-photoshop.
    "images-as-layers": "adobe_bridge",
    # Adobe Bridge CS4 tour.
    "quick-tour": "adobe_bridge",
}


# (reason, predicate(slug)) — first match wins. Predicates take the slug
# (already lowercased) and return True if the lesson is out-of-scope for
# that reason.
RULES: list[tuple[str, callable]] = [
    # --- AI / cloud-assisted features -------------------------------------
    ("ai_cloud_selection", lambda s: (
        "select-subject" in s
        or "remove-background" in s
        or "object-finder" in s
        or "powerful-new-cloud-option" in s
    )),
    ("generative_ai", lambda s: (
        "generative" in s
        or "firefly" in s
    )),
    ("content_aware", lambda s: "content-aware" in s),

    # --- Non-destructive containers / automation --------------------------
    ("smart_objects", lambda s: "smart-object" in s),
    ("smart_filters", lambda s: "smart-filter" in s),
    ("actions_automation", lambda s: s in {
        "default-actions",
        "more-built-in-actions",
        "how-to-use-actions",
        "record-action",
        "editing-an-action",
        "step-through",
        "save-load-actions",
        "creating-new-background-layer-action-photoshop",
    }),

    # --- Adobe ecosystem --------------------------------------------------
    ("adobe_bridge", lambda s: "bridge" in s),
    ("lightroom_integration", lambda s: "lightroom" in s),
    ("camera_raw", lambda s: "camera-raw" in s or s == "open-image-camera-raw"),
    ("creative_cloud", lambda s: (
        "cloud-documents" in s
        or "creative-cloud" in s
        or "sync-photoshops-color-settings" in s
    )),
    ("camera_import", lambda s: "download-photos" in s or s == "get-photos"),

    # --- App management / OS / install -----------------------------------
    ("install_update", lambda s: (
        "update-photoshop" in s
        or "download-the-photoshop-beta" in s
    )),
    ("changelog", lambda s: "fixed-in-latest-update" in s),
    ("os_integration", lambda s: "default-image-editor" in s),
    ("prefs_reset", lambda s: "reset-photoshop-preferences" in s),

    # --- Output / metadata / print ---------------------------------------
    ("print_output", lambda s: "for-print" in s or "match-frame-sizes" in s),
    ("file_metadata", lambda s: "contact-copyright" in s or "add-contact" in s),
    ("watermark_workflow", lambda s: "watermark" in s),

    # --- UI history / legacy / start screen ------------------------------
    ("legacy_ui", lambda s: "legacy" in s),
    ("home_screen", lambda s: (
        "home-screen" in s
        or "start-screen" in s
        or "start-workspace" in s
        or "recent-files" in s
    )),
    ("rich_tooltips", lambda s: "rich-tool-tips" in s or s == "rich-tool-tips-photoshop-cc-2018"),

    # --- Workspaces / shortcuts / toolbar customization -----------------
    ("workspaces", lambda s: "workspace" in s),
    ("custom_shortcuts", lambda s: "custom-keyboard-shortcuts" in s),
    ("toolbar_customization", lambda s: "custom-toolbar" in s or "reset-toolbar" in s),

    # --- Specific tools dropped from scope -------------------------------
    ("frame_tool", lambda s: "frame-tool" in s),
    ("nav_extras", lambda s: (
        "birds-eye-view" in s
        or "rotate-view" in s
        or "overscroll" in s
        or ("navigator" in s and "panel" in s)
    )),

    # --- Color management -------------------------------------------------
    ("color_management", lambda s: s == "color-settings"),
    # Photoshop CC 2014 Color *Panel* is a UI version-note, classified below.

    # --- Multi-document tabbed / floating UI ----------------------------
    ("multi_doc_ui", lambda s: (
        "tabbed" in s
        or s == "arrange-documents"
        or s == "view-multiple-images-photoshop"
        or s == "zoom-and-pan-all-images-at-once-in-photoshop"
        or s == "move-photos-tabbed-documents"
    )),

    # --- Pure version-changelog lessons ----------------------------------
    # "type-changes-photoshop-cc-2019", "...-new-features-and-changes"
    ("version_changelog", lambda s: bool(re.search(r"(^|-)changes(-|$)", s))),
    # "new-darker-dialog-boxes-in-photoshop-cc-2015", "the-new-gradients-...",
    # "new-ways-to-add-gradients-in-photoshop-cc-2020"
    ("version_changelog", lambda s: bool(
        re.match(r"(the-)?new-", s) and ("-photoshop-cc" in s or "-photoshop-2" in s)
    )),
    # "find-missing-shapes-...-cc-2020" — "where did this UI go" notes.
    ("version_changelog", lambda s: "find-missing" in s),
    # "what's-new" articles
    ("version_changelog", lambda s: "whats-new" in s or "what's-new" in s),
    # Specific CS/CC era UI version notes
    ("version_changelog", lambda s: s in {
        "photoshop-cc-2014-color-panel",
        "new-darker-dialog-boxes-in-photoshop-cc-2015",
    }),
]


def classify(slug: str) -> tuple[bool, str | None]:
    s = slug.lower()
    if s in MANUAL_OUT:
        return False, MANUAL_OUT[s]
    for reason, predicate in RULES:
        if predicate(s):
            return False, reason
    return True, None


def main() -> None:
    raw = json.loads(LESSONS_PATH.read_text(encoding="utf-8"))

    in_count = 0
    by_reason: Counter[str] = Counter()
    out_examples: dict[str, list[str]] = {}

    updated: list[dict] = []
    for entry in raw:
        slug = entry["slug"]
        in_scope, reason = classify(slug)
        new_entry = dict(entry)
        new_entry["in_scope"] = in_scope
        if not in_scope:
            new_entry["out_reason"] = reason
            by_reason[reason] += 1
            out_examples.setdefault(reason, []).append(slug)
        else:
            new_entry.pop("out_reason", None)
            in_count += 1
        updated.append(new_entry)

    tmp = LESSONS_PATH.with_suffix(".json.tmp")
    tmp.write_text(
        json.dumps(updated, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    tmp.replace(LESSONS_PATH)

    total = len(raw)
    print(f"Classified {total} lessons:")
    print(f"  in_scope:     {in_count}")
    print(f"  out_of_scope: {total - in_count}")
    print()
    print("By out_reason:")
    for reason, n in by_reason.most_common():
        sample = ", ".join(out_examples[reason][:3])
        more = "" if len(out_examples[reason]) <= 3 else f", +{len(out_examples[reason]) - 3}"
        print(f"  {reason:24s} {n:3d}   e.g. {sample}{more}")


if __name__ == "__main__":
    main()
