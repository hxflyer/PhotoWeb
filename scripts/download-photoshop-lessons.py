#!/usr/bin/env python3
"""
Download complete lesson content from Photoshop Essentials Basics.

For each lesson in the README index:
1. Download the full HTML from the lesson URL
2. Clean the HTML (strip ads, nav, sidebar, scripts, etc.)
3. Feed the cleaned HTML to DeepSeek API to extract structured markdown
4. Download images locally
5. Write complete lesson.md with local image references

Usage:
    python3 scripts/download-photoshop-lessons.py

Environment variables:
    DEEPSEEK_API_KEY: Your DeepSeek API key (required)
    DEEPSEEK_MODEL: Model name (default: deepseek-chat)
    MAX_LESSONS: Max lessons to process (default: all, set to e.g. 3 for testing)
    SKIP_EXISTING: Skip lessons that already have a complete lesson.md (default: true)
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import ssl
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup, Tag

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = Path("doc/photoshop-essentials-basics")
LESSONS_JSON_PATH = Path("doc/photoshop-essentials-basics_bak/lessons.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
SSL_CONTEXT = ssl._create_unverified_context()

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"

_max_lessons_env = os.environ.get("MAX_LESSONS", "").strip()
MAX_LESSONS = int(_max_lessons_env) if _max_lessons_env else None
SKIP_EXISTING = os.environ.get("SKIP_EXISTING", "true").lower() == "true"
# Comma-separated list of slugs to filter to (for targeted testing).
LESSON_SLUGS = [s.strip() for s in os.environ.get("LESSON_SLUGS", "").split(",") if s.strip()]

# Rate limiting
REQUEST_DELAY = 0.5  # seconds between HTTP requests
API_DELAY = 2.0  # seconds between API calls

# Max HTML size to send to API (characters). DeepSeek-chat has a ~64K-token
# context window (~256K chars). After reserving room for the system prompt
# and a 16K-token completion budget, ~150K chars of HTML is safe and lets
# long lessons (82+ images) through without truncation losing content.
MAX_HTML_CHARS = 150000

# Hard per-lesson wall-clock cap. If a single lesson (HTML fetch + clean +
# LLM call + image downloads) takes longer than this, abort it and move on.
LESSON_TIMEOUT_SECONDS = int(os.environ.get("LESSON_TIMEOUT_SECONDS", "600"))

# Number of lessons to process concurrently in a thread pool.
PARALLEL_WORKERS = int(os.environ.get("PARALLEL_WORKERS", "4"))

# Thread-safe stdout lock — print blocks per worker without interleaving.
_PRINT_LOCK = threading.Lock()


def _log(slug: str, msg: str) -> None:
    """Thread-safe single-line log prefixed with the lesson slug."""
    with _PRINT_LOCK:
        print(f"[{slug}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
class LessonTimeout(Exception):
    """Raised when a single lesson exceeds LESSON_TIMEOUT_SECONDS."""


def remaining_budget(started: float, budget: int) -> float:
    """Return seconds left in the budget; raise LessonTimeout if exhausted."""
    if budget <= 0:
        return float("inf")
    left = budget - (time.monotonic() - started)
    if left <= 0:
        raise LessonTimeout(f"exceeded {budget}s budget")
    return left


def fetch(url: str) -> str:
    """Download a URL and return its text content."""
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=60, context=SSL_CONTEXT) as res:
        return res.read().decode("utf-8", errors="replace")


def download_image(img_url: str, dest_path: Path) -> bool:
    """Download an image to a local path. Returns True on success."""
    if dest_path.exists():
        return True
    try:
        req = Request(img_url, headers={"User-Agent": UA})
        with urlopen(req, timeout=30, context=SSL_CONTEXT) as res:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            dest_path.write_bytes(res.read())
        return True
    except Exception as e:
        print(f"  [WARN] Failed to download {img_url}: {e}")
        return False


def slug_from_url(url: str) -> str:
    """Extract a filesystem-safe slug from a URL path."""
    path = urlparse(url).path.strip("/")
    return path.split("/")[-1] or "index"


def sanitize_filename(name: str) -> str:
    """Make a string safe for use as a filename."""
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = re.sub(r"\s+", "_", name)
    return name.strip("._")


# ---------------------------------------------------------------------------
# Parse lessons.json to get lesson list
# ---------------------------------------------------------------------------
def parse_lessons_json() -> list[dict]:
    """Read lessons.json (the canonical lesson index)."""
    raw = json.loads(LESSONS_JSON_PATH.read_text(encoding="utf-8"))
    lessons = []
    for entry in raw:
        url = entry["url"].rstrip("/") + "/"
        lessons.append({
            "title": entry["title"],
            "url": url,
            "folder": entry["slug"],
            "image_count": entry.get("image_count", 0),
            "heading_count": entry.get("heading_count", 0),
        })
    return lessons


# ---------------------------------------------------------------------------
# HTML cleaning: extract the main article content
# ---------------------------------------------------------------------------
def clean_article_html(html_content: str, url: str) -> str:
    """
    Extract and clean the main article content from the page HTML.
    Returns a cleaned HTML string with only the lesson content.

    The site uses WordPress with this structure:
    - <article> contains the lesson content
    - Inside <article>: title-area, social sharing (mashsb), featured-image,
      summary-novideo, author, lesson paragraphs/steps/images, ads, members-ad
    - Chapter index pages have <article class="learning-guide"> entries
      that link to other lessons (these should be removed)
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # ------------------------------------------------------------------
    # Phase 1: Remove global non-content elements from the entire page
    # ------------------------------------------------------------------
    for selector in [
        "script", "style", "noscript", "iframe", "nav",
        "header", "footer",
        # Ads and ad containers. Selectors must NOT use bare "ad" as a
        # substring match — "category-gradients", "loaded", "header" etc.
        # would all be false-positives. Anchor with separators / specific words.
        "ins.adsbygoogle",
        "[class*=adsbygoogle]", "[class*=advertisement]",
        "[class*=ad-container]", "[class*=ad-block]", "[class*=ad-unit]",
        "[class*=adunit]", "[class~=ad]", "[class*=-ads]", "[class*=ads-]",
        "[id*=adsbygoogle]", "[id^=ad-]", "[id$=-ad]", "[id*=advert]",
        # Sidebars, widgets, comments
        "[class*=sidebar]", "[id*=sidebar]",
        "[class*=widget]", "[id*=widget]",
        "[class*=comment]", "[id*=comment]",
        # Social sharing
        "[class*=mashsb]", "[class*=share]", "[class*=social]",
        "[id*=social]",
        # Related posts
        "[class*=related]", "[id*=related]",
        # Breadcrumbs
        "[class*=breadcrumb]", "[id*=breadcrumb]",
        # Membership / PDF download promos
        "[class*=members-ad]", "[class*=pdf-download]",
        # Author bio
        "#author",
    ]:
        for el in soup.select(selector):
            el.decompose()

    # ------------------------------------------------------------------
    # Phase 2: Find the main article container
    # ------------------------------------------------------------------
    article = None
    for selector in [
        "article.post",
        "article",
        "[class*=entry-content]",
        "[class*=post-content]",
        "[class*=article-content]",
        "[class*=content-area]",
        "main",
        "[role=main]",
    ]:
        article = soup.select_one(selector)
        if article:
            break

    if not article:
        # Fallback: use body
        article = soup.find("body") or soup

    # ------------------------------------------------------------------
    # Phase 3: Remove non-content elements inside the article
    # ------------------------------------------------------------------

    # Remove chapter index / learning guide entries (these are navigation
    # elements that link to other lessons, not the lesson content itself)
    for el in article.select("article.learning-guide, .learning-guide"):
        el.decompose()

    # Preserve the featured/hero image before stripping #title-area.
    # The site puts the lesson's primary image inside
    # <div id="title-area"><div class="postthumb-main"><img></div></div>.
    # We want to drop the duplicate h1 but keep the image at the article top.
    title_area = article.select_one("#title-area")
    if title_area is not None:
        featured_img = title_area.select_one(".postthumb-main img, .post-thumbnail img, img.wp-post-image")
        if featured_img is not None:
            featured_img.extract()
            # Insert as the first child of the article so it shows above the body.
            article.insert(0, featured_img)

    # Remove any remaining social sharing, ads, promos inside article
    for selector in [
        "aside.mashsb-container",
        ".mashsb-container",
        ".members-ad",
        "#author",
        "ins.adsbygoogle",
        # Remove the title-area div (h1 title is redundant with our header).
        # Featured image was already extracted above.
        "#title-area",
    ]:
        for el in article.select(selector):
            el.decompose()

    # Remove trailing navigation/outro sections. The article often ends with
    # one of: "Where to go next..." (h2/h3), "Related tutorials:" /
    # "Related lessons:" (a bolded <p>), or a "Download as PDFs" promo.
    # Once we hit any of these, strip the trigger and every following sibling.
    outro_phrases = (
        "where to go next",
        "related tutorials",
        "related lessons",
        "related posts",
    )

    def _is_outro_trigger(el):
        if el.name not in ("h2", "h3", "h4", "p"):
            return False
        txt = el.get_text(" ", strip=True).lower()
        if not txt or len(txt) > 80:
            return False
        return any(p in txt for p in outro_phrases)

    trigger = None
    for el in list(article.find_all(["h2", "h3", "h4", "p"])):
        if _is_outro_trigger(el):
            trigger = el
            break
    if trigger is not None:
        current = trigger
        while current is not None:
            next_el = current.find_next_sibling()
            current.decompose()
            current = next_el

    # ------------------------------------------------------------------
    # Phase 4: Process images - handle lazy loading, extract from noscript
    # ------------------------------------------------------------------
    for img in list(article.find_all("img")):
        if not isinstance(img, Tag):
            continue
        # Handle lazy-loaded images (data-lazy-src, data-src)
        lazy_src = img.get("data-lazy-src") or img.get("data-src") or ""
        if lazy_src:
            img["src"] = lazy_src
        # If after lazy-load resolution the src is still a data URI or empty,
        # this is a placeholder with no real image — drop it.
        src = img.get("src", "")
        if not src or src.startswith("data:"):
            img.decompose()
            continue
        # Strip noisy attributes so the LLM doesn't classify this img as a
        # decoration / thumbnail / icon and discard it. Keep only src + alt.
        keep = {"src": img["src"]}
        if img.get("alt"):
            keep["alt"] = img["alt"]
        img.attrs = keep

    # ------------------------------------------------------------------
    # Phase 5: Clean up empty tags and decorative elements
    # ------------------------------------------------------------------
    # Remove empty tags that don't contain images
    for tag in article.find_all(["p", "div", "span", "section"]):
        if not tag.get_text(strip=True) and not tag.find(["img", "figure"]):
            tag.decompose()

    # Remove divs that only contain a background image (lazy load placeholders)
    for div in article.find_all("div"):
        if isinstance(div, Tag):
            bg = div.get("data-bg", "")
            if bg and not div.get_text(strip=True) and not div.find("img"):
                div.decompose()

    # ------------------------------------------------------------------
    # Phase 6: Keep only essential content structure
    # ------------------------------------------------------------------
    # The article should contain:
    # - featured-image (main lesson image)
    # - summary-novideo (lesson summary)
    # - <p> tags (lesson text)
    # - <h2>, <h3>, <h4> tags (headings)
    # - <img> tags (screenshots)
    # - <div class="caption"> (image captions)
    # - <ul>, <ol>, <li> (lists)
    # - <strong>, <em>, <code>, <a> (inline formatting)

    result = str(article)
    return result


# ---------------------------------------------------------------------------
# DeepSeek API call
# ---------------------------------------------------------------------------
def call_deepseek_for_markdown(
    cleaned_html: str,
    lesson_title: str,
    lesson_url: str,
    timeout: float = 300,
) -> str:
    """
    Send cleaned HTML to DeepSeek API and get back structured markdown.
    """
    from openai import OpenAI

    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
        timeout=timeout,
    )

    system_prompt = """You convert HTML tutorial content into clean Markdown.

INPUT GUARANTEE from the caller: the HTML you receive has already been
sanitized. Sidebars, headers, footers, ads, social-share widgets, author
bios, comments, related-post lists, and decorative/empty <img>s have all
been stripped. EVERY <img> remaining in the input is a real lesson image
(this includes the FIRST <img>, which is the featured/hero image, even if
small). You must include EVERY <img> in your output in document order —
do not skip any image on suspicion that it is a thumbnail or decoration.

OUTPUT RULES:
1. Begin output with the FIRST image or paragraph from the article body.
   The caller has already written a top-level "# Title" line for the
   lesson — do NOT repeat the page's h1 title.
2. Do NOT add any preamble such as "Here is the converted content..." or
   "Below is the Markdown:". The first line of your output must be the
   first actual piece of content.
3. Do NOT wrap your output in a ```markdown ... ``` code fence.
4. Render every <img> as ![alt text](EXACT_SRC_URL) at its exact position.
   Preserve the URL verbatim — do not modify, shorten, or strip query
   strings. Include the featured/hero image at the very top of the output.
5. Map headings: source h2 -> "##", h3 -> "###", h4 -> "####". Include
   every sub-heading in order. Do not invent new headings.
6. Include EVERY paragraph of body text in order. Do not summarize, merge,
   or drop paragraphs.
7. Preserve inline formatting: bold, italic, code, links. Keep link hrefs
   exactly as in the HTML. Convert EVERY remaining inline HTML tag to its
   Markdown equivalent: <a href="X">Y</a> -> [Y](X), <strong>Y</strong> ->
   **Y**, <em>Y</em> -> *Y*. The final output must contain ZERO raw HTML
   tags (except for image captions which become italic Markdown).
8. Preserve image captions: text inside <div class="caption"> or an <em>
   immediately following an image becomes an italic line directly after
   the image markdown.
9. Convert lists (<ul>/<ol>) to Markdown lists.
10. Do NOT emit <iframe>, <video>, <script>, <style>, or anything that
    isn't part of the readable lesson.
11. Do NOT emit any commentary about what you did or didn't include."""

    user_prompt = f"""Convert this HTML tutorial content to Markdown.

Lesson title: {lesson_title}
Source URL: {lesson_url}

HTML content:
```html
{cleaned_html}
```"""

    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=16000,
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("DeepSeek returned empty content")
    content = content.strip()

    # Strip ```markdown ... ``` (or ``` ... ```) wrapping if the model emitted it.
    if content.startswith("```"):
        first_newline = content.find("\n")
        if first_newline != -1:
            content = content[first_newline + 1:]
        if content.endswith("```"):
            content = content[:-3].rstrip()

    # Drop a leading preamble line such as
    #   "Here is the HTML tutorial content converted to clean Markdown."
    # The model sometimes emits one despite being told not to.
    preamble_pat = re.compile(
        r"^(?:here'?s|here is|below is|the following is)\b[^\n]*\n+",
        re.IGNORECASE,
    )
    content = preamble_pat.sub("", content, count=1).lstrip()

    # Drop a leading duplicate H1 if the model still emitted the page title.
    if content.startswith("# "):
        nl = content.find("\n")
        if nl != -1:
            content = content[nl + 1:].lstrip()

    # Convert any leftover inline HTML (sometimes the model leaves <a>/<strong>
    # tags untouched inside an otherwise-Markdown paragraph).
    content = re.sub(
        r'<a\s+[^>]*href=(["\'])([^"\']+)\1[^>]*>(.*?)</a>',
        r"[\3](\2)",
        content,
        flags=re.DOTALL | re.IGNORECASE,
    )
    content = re.sub(r"</?strong>", "**", content, flags=re.IGNORECASE)
    content = re.sub(r"</?b>", "**", content, flags=re.IGNORECASE)
    content = re.sub(r"</?em>", "*", content, flags=re.IGNORECASE)
    content = re.sub(r"</?i>", "*", content, flags=re.IGNORECASE)
    content = re.sub(r"<br\s*/?>", "  \n", content, flags=re.IGNORECASE)

    return content


# ---------------------------------------------------------------------------
# Extract image URLs from markdown
# ---------------------------------------------------------------------------
def extract_image_urls_from_markdown(markdown: str) -> list[str]:
    """Extract all image URLs from markdown content."""
    pattern = re.compile(r"!\[.*?\]\((https?://[^\s)]+)\)")
    return pattern.findall(markdown)


# ---------------------------------------------------------------------------
# Download images and update markdown references
# ---------------------------------------------------------------------------
def download_and_relink_images(
    markdown: str, lesson_folder: Path, lesson_url: str
) -> str:
    """
    Download all images referenced in the markdown to the lesson's images/ folder,
    and update the markdown to use local relative paths.
    Returns the updated markdown.
    """
    images_dir = lesson_folder / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    def _replace_image(match):
        alt_text = match.group(1)
        img_url = match.group(2)

        # Skip data URIs
        if img_url.startswith("data:"):
            return match.group(0)

        # Determine filename
        parsed = urlparse(img_url)
        path_part = parsed.path.strip("/")
        # Use last meaningful path segments
        parts = path_part.split("/")
        # Filter out common CDN prefixes
        meaningful = [p for p in parts if p not in ("wp-content", "uploads", "newsite", "basics")]
        if not meaningful:
            meaningful = parts[-2:] if len(parts) >= 2 else parts

        base = "-".join(meaningful[-3:]) if len(meaningful) >= 3 else "-".join(meaningful)

        # Determine extension (case-insensitive); separate it from the base so
        # we don't end up with "image.JPG.jpg".
        known_exts = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg")
        ext = ""
        for candidate in known_exts:
            if base.lower().endswith(candidate):
                ext = candidate
                base = base[: -len(candidate)]
                break
        if not ext:
            ext_match = re.search(r"\.(jpg|jpeg|png|gif|webp|svg)(?:\?|$)", img_url, re.I)
            ext = "." + ext_match.group(1).lower() if ext_match else ".jpg"

        # Append a short hash of the full URL so distinct images don't collide
        # on filename (year/month WordPress paths produce many duplicates).
        url_hash = hashlib.md5(img_url.encode("utf-8")).hexdigest()[:8]
        filename = sanitize_filename(f"{base}-{url_hash}{ext}")
        dest = images_dir / filename

        # Download
        success = download_image(img_url, dest)
        if success:
            rel_path = f"images/{filename}"
            return f"![{alt_text}]({rel_path})"
        else:
            # Keep original URL as fallback
            return match.group(0)

    pattern = re.compile(r"!\[(.*?)\]\((https?://[^\s)]+)\)")
    updated = pattern.sub(_replace_image, markdown)
    return updated


# ---------------------------------------------------------------------------
# Process a single lesson
# ---------------------------------------------------------------------------
def process_lesson(lesson: dict) -> bool:
    """
    Process a single lesson: download HTML, call API, download images, write markdown.
    Returns True on success. Aborts and returns False if the lesson exceeds
    LESSON_TIMEOUT_SECONDS wall-clock time.

    Safe to run concurrently in a ThreadPoolExecutor: all output goes through
    the global print lock, and the budget is enforced via wall-clock checks
    between stages plus an aligned client-side timeout on the LLM call.
    """
    title = lesson["title"]
    url = lesson["url"]
    slug = lesson["folder"]
    lesson_folder = BASE_DIR / slug
    lesson_md_path = lesson_folder / "lesson.md"

    _log(slug, f"START: {title}")

    # Check if already done (cheap, outside the time budget).
    if SKIP_EXISTING and lesson_md_path.exists():
        content = lesson_md_path.read_text(encoding="utf-8")
        if "Source paragraph omitted" not in content and len(content) > 500:
            _log(slug, "SKIP: already has complete content")
            return True

    started = time.monotonic()
    try:
        # Step 1: Download HTML
        remaining_budget(started, LESSON_TIMEOUT_SECONDS)
        _log(slug, "[1/4] Downloading HTML...")
        try:
            html_content = fetch(url)
        except Exception as e:
            _log(slug, f"ERROR: failed to download: {e}")
            return False
        time.sleep(REQUEST_DELAY)

        # Step 2: Clean HTML
        remaining_budget(started, LESSON_TIMEOUT_SECONDS)
        _log(slug, "[2/4] Cleaning HTML...")
        cleaned_html = clean_article_html(html_content, url)

        if len(cleaned_html) > MAX_HTML_CHARS:
            _log(slug, f"INFO: truncating HTML from {len(cleaned_html)} to {MAX_HTML_CHARS}")
            cleaned_html = cleaned_html[:MAX_HTML_CHARS]
            cleaned_html = cleaned_html.rsplit("<", 1)[0] if "<" in cleaned_html else cleaned_html

        # Step 3: Call DeepSeek API with whatever budget remains.
        api_budget = remaining_budget(started, LESSON_TIMEOUT_SECONDS)
        _log(slug, f"[3/4] Calling DeepSeek API (budget {api_budget:.0f}s)...")
        try:
            markdown = call_deepseek_for_markdown(cleaned_html, title, url, timeout=api_budget)
        except Exception as e:
            _log(slug, f"ERROR: API call failed: {e}")
            return False
        time.sleep(API_DELAY)

        # Step 4: Download images and update references
        remaining_budget(started, LESSON_TIMEOUT_SECONDS)
        _log(slug, "[4/4] Downloading images...")
        markdown_with_local = download_and_relink_images(markdown, lesson_folder, url)

        header = f"""# {title}

> Source: [{url}]({url})
> Downloaded and converted to Markdown.

"""
        full_content = header + markdown_with_local
        lesson_md_path.write_text(full_content, encoding="utf-8")

        image_count = len(extract_image_urls_from_markdown(markdown))
        elapsed = time.monotonic() - started
        _log(slug, f"DONE: {image_count} images, {elapsed:.1f}s")
        return True
    except LessonTimeout as e:
        elapsed = time.monotonic() - started
        _log(slug, f"TIMEOUT: aborted after {elapsed:.1f}s ({e}); moving on")
        return False
    except Exception as e:
        elapsed = time.monotonic() - started
        _log(slug, f"ERROR after {elapsed:.1f}s: {type(e).__name__}: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Photoshop Essentials - Lesson Downloader")
    print("=" * 70)

    # Verify API key
    if not DEEPSEEK_API_KEY:
        print("ERROR: DEEPSEEK_API_KEY environment variable not set.")
        print("Set it with: export DEEPSEEK_API_KEY='your-key-here'")
        return

    # Parse lessons
    lessons = parse_lessons_json()
    print(f"\nFound {len(lessons)} lessons in {LESSONS_JSON_PATH}")

    if LESSON_SLUGS:
        wanted = set(LESSON_SLUGS)
        lessons = [l for l in lessons if l["folder"] in wanted]
        print(f"Filtered to {len(lessons)} lessons by LESSON_SLUGS")

    if MAX_LESSONS:
        lessons = lessons[:MAX_LESSONS]
        print(f"Processing first {MAX_LESSONS} lessons (MAX_LESSONS set)")

    # Process lessons concurrently. Each lesson is independent (separate
    # output folder, no shared mutable state) so threads are safe.
    workers = max(1, min(PARALLEL_WORKERS, len(lessons)))
    print(
        f"\nProcessing {len(lessons)} lessons with {workers} worker(s); "
        f"per-lesson timeout {LESSON_TIMEOUT_SECONDS}s.\n"
    )

    success_count = 0
    fail_count = 0
    done = 0
    total = len(lessons)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(process_lesson, l): l for l in lessons}
        for fut in as_completed(futures):
            done += 1
            try:
                ok = fut.result()
            except Exception as e:
                slug = futures[fut]["folder"]
                _log(slug, f"ERROR: worker crashed: {type(e).__name__}: {e}")
                ok = False
            if ok:
                success_count += 1
            else:
                fail_count += 1
            with _PRINT_LOCK:
                print(
                    f"--- progress: {done}/{total} "
                    f"(ok={success_count} fail={fail_count}) ---",
                    flush=True,
                )

    # Summary
    print(f"\n{'='*70}")
    print(f"Summary: {success_count} succeeded, {fail_count} failed out of {total} lessons")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
