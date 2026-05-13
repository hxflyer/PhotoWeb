#!/usr/bin/env python3
"""
Summarize each downloaded Photoshop Essentials lesson with a one-sentence
description and write an augmented lessons.json.

Inputs
------
- Source index:   doc/photoshop-essentials-basics_bak/lessons.json
- Lesson bodies:  doc/photoshop-essentials-basics/<slug>/lesson.md

Output
------
- doc/photoshop-essentials-basics/lessons.json (same schema as source +
  a new "summary" field per entry). The source file is never modified.

Behavior
--------
- Parallel across PARALLEL_WORKERS threads (default 4).
- Per-lesson wall-clock cap LESSON_TIMEOUT_SECONDS (default 120s).
- Resumable: an existing output file is read first; lessons that already
  have a non-empty summary are kept and skipped (set OVERWRITE=true to redo).
- Atomic writes (tmp + rename); checkpoints during a long run so a Ctrl-C
  doesn't lose completed summaries.

Env vars
--------
    DEEPSEEK_API_KEY       required
    DEEPSEEK_MODEL         default "deepseek-chat"
    PARALLEL_WORKERS       default 4
    LESSON_TIMEOUT_SECONDS default 120
    MAX_LESSONS            optional cap for test runs
    LESSON_SLUGS           comma-separated slug filter
    OVERWRITE              "true" to re-summarize even if summary exists
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path("doc/photoshop-essentials-basics")
SOURCE_JSON = Path("doc/photoshop-essentials-basics_bak/lessons.json")
OUTPUT_JSON = BASE_DIR / "lessons.json"

# Fields persisted to OUTPUT_JSON. `title` is kept in-memory (it feeds the
# LLM prompt) but intentionally not written out — readers can recover it
# from the lesson markdown's H1 or the _bak source. `in_scope` /
# `out_reason` are populated by scripts/classify-lesson-scope.py; we
# carry them forward across re-runs so re-summarizing never wipes scope.
OUTPUT_FIELDS = ("url", "slug", "image_count", "in_scope", "out_reason", "summary")

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

PARALLEL_WORKERS = int(os.environ.get("PARALLEL_WORKERS", "4"))
LESSON_TIMEOUT_SECONDS = int(os.environ.get("LESSON_TIMEOUT_SECONDS", "120"))

_max_lessons_env = os.environ.get("MAX_LESSONS", "").strip()
MAX_LESSONS = int(_max_lessons_env) if _max_lessons_env else None
LESSON_SLUGS = [s.strip() for s in os.environ.get("LESSON_SLUGS", "").split(",") if s.strip()]
OVERWRITE = os.environ.get("OVERWRITE", "false").lower() == "true"

# How much of the lesson body to send to the model. Most lessons fit in a
# few thousand chars of body text; we don't need to send screenshots' URLs.
MAX_BODY_CHARS = 6000

_PRINT_LOCK = threading.Lock()
_SAVE_LOCK = threading.Lock()


def _log(slug: str, msg: str) -> None:
    with _PRINT_LOCK:
        print(f"[{slug}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------
def load_source_lessons() -> list[dict]:
    return json.loads(SOURCE_JSON.read_text(encoding="utf-8"))


def load_existing_output() -> dict[str, dict]:
    """Return slug -> entry dict from any pre-existing output JSON."""
    if not OUTPUT_JSON.exists():
        return {}
    try:
        raw = json.loads(OUTPUT_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {e["slug"]: e for e in raw if isinstance(e, dict) and "slug" in e}


def _project(entry: dict) -> dict:
    return {k: entry[k] for k in OUTPUT_FIELDS if k in entry}


def save_output_atomically(entries: list[dict]) -> None:
    """Write entries to OUTPUT_JSON via tmp+rename so crashes can't corrupt it."""
    with _SAVE_LOCK:
        OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
        tmp = OUTPUT_JSON.with_suffix(".json.tmp")
        slim = [_project(e) for e in entries]
        tmp.write_text(
            json.dumps(slim, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        tmp.replace(OUTPUT_JSON)


_HEADER_RE = re.compile(
    r"^#\s+.*?\n+>\s+Source:.*?\n>\s+Downloaded and converted to Markdown\.\n+",
    re.DOTALL,
)


def read_lesson_body(slug: str) -> str | None:
    """Return the lesson body text (header stripped, truncated) or None."""
    path = BASE_DIR / slug / "lesson.md"
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    text = _HEADER_RE.sub("", text, count=1)
    text = text.strip()
    if len(text) < 80:
        return None
    return text[:MAX_BODY_CHARS]


# ---------------------------------------------------------------------------
# DeepSeek call
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You write a short-paragraph summary of a Photoshop tutorial.\n"
    "Constraints:\n"
    "- Maximum 200 words. Shorter is fine. Aim for 2-5 sentences.\n"
    "- Describe concretely what the reader will be able to do and which\n"
    "  Photoshop features, tools, menus, panels, or shortcuts are involved.\n"
    "- Cover the specific techniques and any non-obvious caveats; do not be\n"
    "  generic or vague. Prefer the lesson's actual terminology.\n"
    "- Do NOT start with meta phrases like 'This lesson', 'In this tutorial',\n"
    "  'Learn how to', 'A guide to', 'This article'. Begin with the substantive\n"
    "  topic or imperative verb.\n"
    "- Output ONE plain-text paragraph only. No markdown, no quotes, no\n"
    "  bullet/numbered lists, no headings, no preamble, no trailing notes.\n"
    "  Newlines inside the paragraph are not allowed.\n"
)


def summarize_one(title: str, url: str, body: str, timeout: float) -> str:
    """Call DeepSeek and return a cleaned one-sentence summary string."""
    from openai import OpenAI

    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        timeout=timeout,
    )
    user_prompt = (
        f"Title: {title}\n"
        f"URL: {url}\n\n"
        f"Lesson markdown (excerpt):\n{body}"
    )
    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    content = response.choices[0].message.content or ""
    content = content.strip()

    # Defensive cleanups: the model occasionally wraps in quotes/code fences
    # or emits a multi-line paragraph despite being told to use one line.
    if content.startswith("```"):
        nl = content.find("\n")
        if nl != -1:
            content = content[nl + 1:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
    content = content.strip("\"'` ")
    # Collapse any internal newlines / runs of whitespace into single spaces so
    # the summary lives on one JSON line.
    content = re.sub(r"\s+", " ", content).strip()

    return content


# ---------------------------------------------------------------------------
# Per-lesson worker
# ---------------------------------------------------------------------------
def process_lesson(entry: dict) -> tuple[dict, bool]:
    """Return (updated_entry, success). Always returns the entry (possibly
    unchanged) so the caller can keep the order stable."""
    slug = entry["slug"]
    title = entry["title"]
    url = entry["url"]

    if entry.get("summary") and not OVERWRITE:
        _log(slug, "SKIP: already has summary")
        return entry, True

    body = read_lesson_body(slug)
    if body is None:
        _log(slug, "SKIP: lesson.md missing or too short")
        return entry, False

    started = time.monotonic()
    try:
        summary = summarize_one(title, url, body, timeout=LESSON_TIMEOUT_SECONDS)
    except Exception as e:
        elapsed = time.monotonic() - started
        _log(slug, f"ERROR after {elapsed:.1f}s: {type(e).__name__}: {e}")
        return entry, False

    elapsed = time.monotonic() - started
    if not summary:
        _log(slug, f"WARN: empty summary ({elapsed:.1f}s)")
        return entry, False

    updated = dict(entry)
    updated["summary"] = summary
    _log(slug, f"DONE in {elapsed:.1f}s: {summary[:100]}")
    return updated, True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    if not DEEPSEEK_API_KEY:
        print("ERROR: DEEPSEEK_API_KEY not set.")
        return

    source = load_source_lessons()
    print(f"Loaded {len(source)} lessons from {SOURCE_JSON}")

    existing_by_slug = load_existing_output()
    if existing_by_slug:
        kept = sum(1 for v in existing_by_slug.values() if v.get("summary"))
        print(f"Found existing {OUTPUT_JSON} with {kept} prior summaries")

    # Build the working list in source order. Carry forward any scope
    # annotations and prior summaries that exist in the output file so a
    # re-run never erases work done by the classifier or a previous run.
    carry_keys = tuple(k for k in OUTPUT_FIELDS if k not in ("url", "slug", "image_count"))
    entries: list[dict] = []
    for src in source:
        slug = src.get("slug")
        merged = dict(src)
        existing = existing_by_slug.get(slug, {})
        for key in carry_keys:
            if key in existing:
                merged[key] = existing[key]
        entries.append(merged)

    # Apply slug / max filters to decide what to actually run.
    candidates = entries
    if LESSON_SLUGS:
        wanted = set(LESSON_SLUGS)
        candidates = [e for e in entries if e.get("slug") in wanted]
        print(f"Filtered to {len(candidates)} lessons by LESSON_SLUGS")
    if MAX_LESSONS:
        candidates = candidates[:MAX_LESSONS]
        print(f"Capped to {MAX_LESSONS} lessons (MAX_LESSONS set)")

    todo = [e for e in candidates if OVERWRITE or not e.get("summary")]
    print(
        f"Lessons to summarize: {len(todo)} "
        f"(of {len(candidates)} candidates; {len(candidates) - len(todo)} already have summaries)"
    )

    if not todo:
        save_output_atomically(entries)
        print(f"Nothing to do. Wrote {OUTPUT_JSON}.")
        return

    workers = max(1, min(PARALLEL_WORKERS, len(todo)))
    print(
        f"Running with {workers} worker(s); per-lesson timeout {LESSON_TIMEOUT_SECONDS}s.\n"
    )

    # entries_by_slug is the live working map; we mutate it as futures finish
    # and periodically flush to disk. Insertion order matches `entries`.
    entries_by_slug = {e["slug"]: e for e in entries}

    total = len(todo)
    save_every = max(1, total // 50)
    success = fail = done = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(process_lesson, e): e for e in todo}
        for fut in as_completed(futures):
            done += 1
            try:
                updated, ok = fut.result()
            except Exception as e:
                slug = futures[fut].get("slug", "?")
                _log(slug, f"ERROR: worker crashed: {type(e).__name__}: {e}")
                ok = False
                updated = futures[fut]
            entries_by_slug[updated["slug"]] = updated
            if ok:
                success += 1
            else:
                fail += 1
            if done % save_every == 0 or done == total:
                save_output_atomically(list(entries_by_slug.values()))
            with _PRINT_LOCK:
                print(
                    f"--- progress: {done}/{total} "
                    f"(ok={success} fail={fail}) ---",
                    flush=True,
                )

    # Final save in original source order.
    final = [entries_by_slug[e["slug"]] for e in entries]
    save_output_atomically(final)

    print()
    print(f"Summary: {success} succeeded, {fail} failed of {total} lessons")
    print(f"Output:  {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
