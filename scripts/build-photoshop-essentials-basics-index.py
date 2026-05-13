#!/usr/bin/env python3
"""
Build a local research index for Photoshop Essentials Basics lessons.

This intentionally records lesson structure, source URLs, headings, image
placements, alt text, captions, and short source descriptions without copying
the full copyrighted lesson text or downloading/repackaging lesson images.
"""

from __future__ import annotations

import html
import json
import re
import ssl
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


BASE = "https://www.photoshopessentials.com/basics/"
EXTRA_SECTION_URLS = {
    "https://www.photoshopessentials.com/photoshop-layers-learning-guide/",
}
OUT = Path("doc/photoshop-essentials-basics")
UA = "Mozilla/5.0 (compatible; photoweb-research-index/1.0)"
SSL_CONTEXT = ssl._create_unverified_context()


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": UA})
    with urlopen(req, timeout=30, context=SSL_CONTEXT) as res:
        return res.read().decode("utf-8", errors="replace")


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r"\s+", " ", value)).strip()
    return value


def slug_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    return path.split("/")[-1] or "index"


def discover_lesson_urls() -> list[str]:
    seen: set[str] = set()
    lessons: list[str] = []
    page = BASE
    while page:
        doc = fetch(page)
        for href in re.findall(r'href=["\']([^"\']+)["\']', doc):
            url = urljoin(page, html.unescape(href)).split("#")[0]
            parsed = urlparse(url)
            if parsed.netloc != "www.photoshopessentials.com":
                continue
            if not parsed.path.startswith("/basics/"):
                continue
            if re.search(r"/(page/\d+|feed)/?$", parsed.path):
                continue
            if parsed.path.rstrip("/") == "/basics":
                continue
            canonical = f"https://www.photoshopessentials.com{parsed.path}"
            if not canonical.endswith("/"):
                canonical += "/"
            if canonical not in seen:
                seen.add(canonical)
                lessons.append(canonical)

        next_match = re.search(r'<link rel="next" href="([^"]+)"', doc)
        if next_match:
            page = html.unescape(next_match.group(1))
            time.sleep(0.25)
        else:
            page = ""
    for url in sorted(EXTRA_SECTION_URLS):
        if url not in seen:
            seen.add(url)
            lessons.append(url)
    return lessons


class ArticleParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_article = False
        self.article_depth = 0
        self.skip_depth = 0
        self.capture_tag = ""
        self.capture_class = ""
        self.capture: list[str] = []
        self.blocks: list[dict] = []
        self.title = ""
        self.pending_image: dict | None = None

    def handle_starttag(self, tag: str, attrs_list) -> None:
        attrs = dict(attrs_list)
        classes = set(attrs.get("class", "").split())
        if tag == "article" and ("category-basics" in classes or attrs.get("id", "").startswith("post-")):
            self.in_article = True
            self.article_depth = 1
            return
        if not self.in_article:
            return
        self.article_depth += 1

        if tag in {"script", "style", "noscript", "aside", "ins"}:
            self.skip_depth += 1
            return
        noisy_classes = {
            "mashsb-container",
            "mashsb-buttons",
            "adsbygoogle",
            "ads-middle",
            "ads-bottom",
            "members-ad",
            "members-ad-top",
            "pdf-download-link",
        }
        if classes & noisy_classes or attrs.get("id") in {"breadcrumbs"}:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return

        if tag in {"h1", "h2", "h3", "h4", "p", "li"} or (
            tag == "div" and classes & {"caption", "image-desc"}
        ):
            self.capture_tag = tag
            self.capture_class = " ".join(sorted(classes))
            self.capture = []
        elif tag == "img":
            src = attrs.get("data-lazy-src") or attrs.get("src") or ""
            if src.startswith("data:image/svg+xml"):
                src = ""
            if src:
                image = {
                    "type": "image",
                    "src": html.unescape(src),
                    "alt": clean_text(attrs.get("alt", "")),
                    "width": attrs.get("width", ""),
                    "height": attrs.get("height", ""),
                }
                self.blocks.append(image)
                self.pending_image = image

    def handle_endtag(self, tag: str) -> None:
        if not self.in_article:
            return
        if self.skip_depth:
            self.skip_depth -= 1
            self.article_depth -= 1
            return
        if tag == self.capture_tag:
            text = clean_text("".join(self.capture))
            if text:
                kind = "heading" if tag in {"h1", "h2", "h3", "h4"} else "text"
                if tag == "h1" and not self.title:
                    self.title = text
                elif self.pending_image and tag == "div" and (
                    "caption" in self.capture_class or "image-desc" in self.capture_class
                ):
                    self.pending_image["caption"] = text
                    self.pending_image = None
                elif not self._is_promo(text):
                    self.blocks.append({"type": kind, "level": tag, "text": text})
            self.capture_tag = ""
            self.capture_class = ""
            self.capture = []
        self.article_depth -= 1
        if tag == "article" and self.article_depth <= 0:
            self.in_article = False

    def handle_data(self, data: str) -> None:
        if self.in_article and not self.skip_depth and self.capture_tag:
            self.capture.append(data)

    @staticmethod
    def _is_promo(text: str) -> bool:
        lower = text.lower()
        return (
            "download all of our photoshop tutorials as pdfs" in lower
            or lower.startswith("download the pdf:")
            or lower.startswith("related:")
        )


def extract_article(url: str) -> dict:
    parser = ArticleParser()
    parser.feed(fetch(url))
    headings = [b for b in parser.blocks if b["type"] == "heading"]
    images = [b for b in parser.blocks if b["type"] == "image"]
    text_blocks = [b for b in parser.blocks if b["type"] == "text"]
    return {
        "url": url,
        "slug": slug_from_url(url),
        "title": parser.title or slug_from_url(url).replace("-", " ").title(),
        "headings": headings,
        "images": images,
        "text_block_count": len(text_blocks),
        "blocks": parser.blocks,
    }


def write_lesson(lesson: dict) -> None:
    folder = OUT / lesson["slug"]
    folder.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {lesson['title']}",
        "",
        f"Source: {lesson['url']}",
        "",
        "> Research index only: full lesson prose and local image copies are omitted to avoid republishing copyrighted Photoshop Essentials material. Image placements point to source image URLs in their original order.",
        "",
        "## Outline",
        "",
    ]
    for block in lesson["headings"]:
        if block["level"] == "h1":
            continue
        lines.append(f"- {block['text']}")
    lines.extend(["", "## Ordered Lesson Structure", ""])
    image_no = 0
    for block in lesson["blocks"]:
        if block["type"] == "heading":
            level = {"h1": 1, "h2": 2, "h3": 3, "h4": 4}.get(block["level"], 3)
            lines.append(f"{'#' * level} {block['text']}")
            lines.append("")
        elif block["type"] == "image":
            image_no += 1
            alt = block.get("alt") or f"Lesson image {image_no}"
            lines.append(f"![{alt}]({block['src']})")
            if block.get("caption"):
                lines.append(f"*{block['caption']}*")
            size = " x ".join(v for v in [block.get("width"), block.get("height")] if v)
            meta = f"Image {image_no}"
            if size:
                meta += f"; source size {size}"
            lines.append(f"<!-- {meta}; source image only, not downloaded locally. -->")
            lines.append("")
        elif block["type"] == "text":
            lines.append("<!-- Source paragraph omitted. Use the source URL above for exact wording. -->")
            lines.append("")
    lines.extend(
        [
            "## Image Manifest",
            "",
        ]
    )
    manifest = []
    for idx, img in enumerate(lesson["images"], 1):
        manifest.append(
            {
                "index": idx,
                "src": img["src"],
                "alt": img.get("alt", ""),
                "caption": img.get("caption", ""),
                "width": img.get("width", ""),
                "height": img.get("height", ""),
            }
        )
        lines.append(f"{idx}. {img['src']}")
        if img.get("alt"):
            lines.append(f"   Alt: {img['alt']}")
        if img.get("caption"):
            lines.append(f"   Caption: {img['caption']}")
    (folder / "lesson.md").write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    (folder / "images").mkdir(exist_ok=True)
    manifest_lines = [
        "# Images are referenced, not downloaded.",
        "# Fields: index | url | alt | caption | width | height",
    ]
    for item in manifest:
        manifest_lines.append(
            f"{item['index']} | {item['src']} | {item['alt']} | {item['caption']} | {item['width']} | {item['height']}"
        )
    (folder / "images" / "_manifest.txt").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    urls = discover_lesson_urls()
    lessons = []
    for idx, url in enumerate(urls, 1):
        print(f"[{idx}/{len(urls)}] {url}", flush=True)
        lesson = extract_article(url)
        lessons.append(
            {
                "url": lesson["url"],
                "slug": lesson["slug"],
                "title": lesson["title"],
                "heading_count": len(lesson["headings"]),
                "image_count": len(lesson["images"]),
                "text_block_count": lesson["text_block_count"],
            }
        )
        write_lesson(lesson)
        time.sleep(0.25)

    (OUT / "lessons.json").write_text(json.dumps(lessons, indent=2) + "\n", encoding="utf-8")
    index = ["# Photoshop Essentials Basics Research Index", "", f"Source section: {BASE}", ""]
    for item in lessons:
        index.append(
            f"- [{item['title']}]({item['slug']}/lesson.md) - {item['image_count']} images, {item['heading_count']} headings - {item['url']}"
        )
    (OUT / "README.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    print(f"Wrote {len(lessons)} lessons to {OUT}")


if __name__ == "__main__":
    main()
