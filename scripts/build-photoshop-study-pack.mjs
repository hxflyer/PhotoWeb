import { execFile } from "node:child_process";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { JSDOM } from "jsdom";

const execFileAsync = promisify(execFile);

const BASE_URL = "https://helpx.adobe.com";
const ROOT_URL = `${BASE_URL}/photoshop/desktop.html`;
const OUTPUT_DIR = path.resolve("doc/photoshop-desktop-study");
const PAGES_DIR = path.join(OUTPUT_DIR, "pages");
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const ENRICHMENT_TODO_FILE = path.join(OUTPUT_DIR, "enrichment-todo.md");

const MAX_BUFFER = 64 * 1024 * 1024;
const CONCURRENCY = 6;

function cleanText(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function toAbsoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/content/help/en/")) {
    return `${BASE_URL}${url.replace("/content/help/en", "")}`;
  }
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return new URL(url, BASE_URL).toString();
}

async function curl(url) {
  const { stdout } = await execFileAsync(
    "curl",
    ["-L", "--silent", "--show-error", "--fail", url],
    { maxBuffer: MAX_BUFFER },
  );
  return stdout;
}

async function downloadToFile(url, outputFile) {
  const { stdout } = await execFileAsync(
    "curl",
    ["-L", "--silent", "--show-error", "--fail", "-D", "-", "-o", outputFile, url],
    { maxBuffer: MAX_BUFFER },
  );
  return stdout;
}

function parseJsonLd(document) {
  const items = [];
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      items.push(JSON.parse(raw));
    } catch {
      // Ignore invalid JSON-LD blobs.
    }
  }
  return items;
}

function flattenJsonLdItems(items) {
  const flat = [];
  for (const item of items) {
    if (!item) continue;
    if (Array.isArray(item)) {
      flat.push(...flattenJsonLdItems(item));
      continue;
    }
    flat.push(item);
    if (Array.isArray(item["@graph"])) {
      flat.push(...flattenJsonLdItems(item["@graph"]));
    }
  }
  return flat;
}

function extractBreadcrumbs(flatJsonLd) {
  const breadcrumb = flatJsonLd.find((item) => item?.["@type"] === "BreadcrumbList");
  const entries = Array.isArray(breadcrumb?.itemListElement) ? breadcrumb.itemListElement : [];
  return entries
    .map((entry) => cleanText(entry?.name))
    .filter(Boolean);
}

function extractIsoDate(flatJsonLd) {
  const article = flatJsonLd.find((item) => {
    const type = item?.["@type"];
    return type === "TechArticle" || type === "WebPage";
  });
  return article?.dateModified || article?.datePublished || "";
}

function getArticleRoot(document) {
  return document.querySelector("#helpxNext-article-right-rail > .aem-Grid > .responsivegrid");
}

function getArticleGrid(articleRoot) {
  return articleRoot?.querySelector(":scope > .aem-Grid") || null;
}

function extractTextBlockSnippets(articleRoot) {
  const grid = getArticleGrid(articleRoot);
  if (!grid) return [];

  const snippets = [];
  for (const block of grid.children) {
    if (!block.classList.contains("text")) continue;
    const clone = block.cloneNode(true);
    for (const junk of clone.querySelectorAll("script, style")) junk.remove();
    const text = cleanText(clone.textContent || "");
    if (!text) continue;

    const firstSentence = cleanText(text.split(/(?<=[.!?])\s+/)[0] || "");
    const snippet = firstSentence || text.slice(0, 180);
    if (snippet && snippet.length >= 20) snippets.push(snippet.slice(0, 220));
  }

  return [...new Set(snippets)];
}

function extractHeadings(articleRoot) {
  const headings = [...(articleRoot?.querySelectorAll("h2, h3, h4") || [])]
    .map((heading) => cleanText(heading.textContent))
    .filter(Boolean);
  return [...new Set(headings)];
}

function getContentImageBlocks(articleRoot) {
  const grid = getArticleGrid(articleRoot);
  if (!grid) return [];
  return [...grid.children].filter((child) => child.classList.contains("image"));
}

function extractLinesFromRichText(container) {
  if (!container) return [];
  const lines = [];

  for (const node of container.querySelectorAll("h2, h3, h4, p, li")) {
    const text = cleanText(node.textContent || "");
    if (!text) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === "li") {
      lines.push(`- ${text}`);
    } else {
      lines.push(text);
    }
  }

  return lines;
}

function dedupeSequential(lines) {
  const result = [];
  for (const line of lines) {
    if (!line) continue;
    if (result[result.length - 1] !== line) {
      result.push(line);
    }
  }
  return result;
}

function dedupeList(lines) {
  return [...new Set(lines.filter(Boolean))];
}

function extractArticleBody(articleRoot) {
  const grid = getArticleGrid(articleRoot);
  if (!grid) return [];

  const sections = [];

  for (const block of grid.children) {
    if (block.classList.contains("image")) continue;

    if (block.classList.contains("stepsandprocedure")) {
      const steps = [...block.querySelectorAll(".step")].map((step) => {
        const line = cleanText(step.textContent || "");
        return line;
      }).filter(Boolean);

      if (steps.length) {
        sections.push({
          type: "steps",
          lines: steps.map((step, index) => `${index + 1}. ${step}`),
        });
      }
      continue;
    }

    const richTextLines = dedupeSequential(
      extractLinesFromRichText(block.querySelector(".cmp-text") || block),
    );

    if (richTextLines.length) {
      sections.push({
        type: "text",
        lines: richTextLines,
      });
    }
  }

  return sections;
}

function getAllBodyLines(bodySections) {
  return bodySections.flatMap((section) => section.lines);
}

function normalizeStepLine(line) {
  return line.replace(/^\d+\.\s*/, "").trim();
}

function extractDetailedDescription(description, bodySections) {
  const lines = [];
  if (description) lines.push(description);

  for (const section of bodySections) {
    if (section.type !== "text") continue;
    for (const line of section.lines) {
      if (line.startsWith("- ")) continue;
      if (!lines.includes(line)) lines.push(line);
      if (lines.length >= 3) return lines;
    }
  }

  return lines.slice(0, 3);
}

function extractHotkeys(bodySections) {
  const shortcutRegex = /\b(?:Ctrl|Command|Cmd|Shift|Alt|Option|Win)\s*\+\s*[A-Za-z0-9/]+(?:\s*\+\s*[A-Za-z0-9/]+)*/g;
  const lines = [];

  for (const line of getAllBodyLines(bodySections)) {
    const matches = line.match(shortcutRegex);
    if (!matches) continue;
    lines.push(`${matches.join(" / ")}: ${normalizeStepLine(line)}`);
  }

  return dedupeList(lines);
}

function extractMouseActions(bodySections) {
  const actionLines = [];
  const actionRegex = /^(?:\d+\.\s*)?(?:Select|Choose|Go to|Open|Click|Drag|Upload|Review|Adjust|Press|Switch to|Start with)\b/i;

  for (const rawLine of getAllBodyLines(bodySections)) {
    const line = normalizeStepLine(rawLine);
    if (actionRegex.test(line)) {
      actionLines.push(line);
    }
  }

  return dedupeList(actionLines);
}

function extractUiControls(articleRoot, bodySections) {
  const controls = [...(articleRoot?.querySelectorAll(".uicontrol") || [])]
    .map((node) => cleanText(node.textContent || ""))
    .filter(Boolean);

  const uiPattern = /\b([A-Z][A-Za-z0-9+/-]*(?:\s+[A-Z]?[A-Za-z0-9+/-]+){0,5}\s+(?:panel|dialog|toolbar|Tool|tool|Task Bar|menu|Menu|window|Window|bar|Bar|settings|Settings|layer|Layer|Properties|History|Layers))\b/g;
  const discovered = [];

  for (const line of getAllBodyLines(bodySections)) {
    let match;
    while ((match = uiPattern.exec(line)) !== null) {
      discovered.push(cleanText(match[1]));
    }
  }

  return dedupeList([...controls, ...discovered]).filter((item) => item.length <= 80);
}

function extractImageLinks(articleRoot) {
  const images = [];
  for (const block of getContentImageBlocks(articleRoot)) {
    const img = block.querySelector("img");
    if (!img) continue;
    const picture = img.closest("picture");
    const sourceCandidates = picture
      ? [...picture.querySelectorAll("source")]
          .flatMap((source) => [
            source.getAttribute("srcset") || "",
            source.getAttribute("data-srcset") || "",
          ])
      : [];

    const directCandidates = [
      img.getAttribute("data-src"),
      img.getAttribute("data-lazy-src"),
      img.getAttribute("data-original"),
      img.getAttribute("data-cmp-src"),
      img.getAttribute("srcset"),
      img.getAttribute("src"),
      ...sourceCandidates,
    ].filter(Boolean);

    const chosen = directCandidates
      .flatMap((candidate) => candidate.split(","))
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .find((candidate) => candidate && !candidate.startsWith("data:image/svg+xml"));

    const url = toAbsoluteUrl(chosen || "");
    if (!url) continue;
    images.push({
      alt: cleanText(img.getAttribute("alt") || ""),
      url,
    });
  }

  const seen = new Set();
  return images.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function parseContentType(headers) {
  const match = headers.match(/^content-type:\s*([^\r\n;]+)/gim);
  if (!match?.length) return "";
  const lastHeader = match[match.length - 1];
  return lastHeader.replace(/^content-type:\s*/i, "").trim().toLowerCase();
}

function extensionFromContentType(contentType) {
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  if (contentType === "image/svg+xml") return ".svg";
  if (contentType === "image/avif") return ".avif";
  return ".img";
}

function sanitizePathSegment(value) {
  return slugify(value).slice(0, 40) || "asset";
}

function extractLastUpdated(document, fallbackIsoDate) {
  const fragments = [
    ...document.querySelectorAll("#helpxNext-article-right-rail .xfreference"),
  ].map((el) => cleanText(el.textContent));

  const labeled = fragments.find((text) => text.startsWith("Last updated on "));
  if (labeled) return labeled.replace(/^Last updated on\s+/, "");

  if (fallbackIsoDate) {
    const date = new Date(fallbackIsoDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return "";
}

function extractDescription(document, flatJsonLd) {
  const metaDescription = cleanText(
    document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
  );
  if (metaDescription) return metaDescription;

  const article = flatJsonLd.find((item) => {
    const type = item?.["@type"];
    return type === "TechArticle" || type === "WebPage";
  });
  return cleanText(article?.description || "");
}

function extractNavigationLinks(document) {
  const links = [...document.querySelectorAll("#helpxNext-article-right-rail .pagenavigationarrows a")]
    .map((anchor) => ({
      label: cleanText(anchor.textContent),
      url: toAbsoluteUrl(anchor.getAttribute("href") || ""),
    }))
    .filter((entry) => entry.label && entry.url);
  return links;
}

function buildNoteMarkdown(item, pageData) {
  const lines = [
    `# ${pageData.title || item.title}`,
    "",
    `- Type: ${item.type}`,
    `- Source: ${pageData.canonicalUrl || item.url}`,
    `- Navigation path: ${item.path.join(" > ") || "Photoshop Desktop Help"}`,
  ];

  if (pageData.lastUpdated) lines.push(`- Last updated: ${pageData.lastUpdated}`);
  if (pageData.description) lines.push(`- Description: ${pageData.description}`);
  if (pageData.breadcrumbs.length) lines.push(`- Breadcrumbs: ${pageData.breadcrumbs.join(" > ")}`);
  lines.push("");

  lines.push("## Detailed Description");
  if (pageData.detailedDescription.length) {
    pageData.detailedDescription.forEach((line) => lines.push(`- ${line}`));
  } else if (pageData.description) {
    lines.push(`- ${pageData.description}`);
  } else {
    lines.push("- No detailed description was extracted.");
  }
  lines.push("");

  lines.push("## How To Use");
  if (pageData.mouseActions.length) {
    lines.push("### Mouse and Menus");
    pageData.mouseActions.forEach((line) => lines.push(`- ${line}`));
    lines.push("");
  }
  if (pageData.hotkeys.length) {
    lines.push("### Hotkeys");
    pageData.hotkeys.forEach((line) => lines.push(`- ${line}`));
    lines.push("");
  }
  if (pageData.uiControls.length) {
    lines.push("### Interface Elements");
    pageData.uiControls.forEach((line) => lines.push(`- ${line}`));
    lines.push("");
  }
  if (!pageData.mouseActions.length && !pageData.hotkeys.length && !pageData.uiControls.length) {
    lines.push("- No structured usage details were extracted.");
    lines.push("");
  }

  lines.push("## Study Notes");
  if (pageData.textSnippets.length) {
    for (const snippet of pageData.textSnippets) {
      lines.push(`- ${snippet}`);
    }
  } else if (pageData.description) {
    lines.push(`- ${pageData.description}`);
  } else {
    lines.push("- No text snippets were extracted from this page.");
  }
  lines.push("");

  lines.push("## Article Body");
  if (pageData.bodySections.length) {
    pageData.bodySections.forEach((section, index) => {
      if (section.type === "steps") {
        lines.push(`### Procedure ${index + 1}`);
      } else if (pageData.bodySections.length > 1) {
        lines.push(`### Section ${index + 1}`);
      }

      section.lines.forEach((line) => lines.push(line));
      lines.push("");
    });
  } else {
    lines.push("- No article-body text blocks were extracted.");
    lines.push("");
  }

  lines.push("## Outline");
  if (pageData.headings.length) {
    for (const heading of pageData.headings) {
      lines.push(`- ${heading}`);
    }
  } else {
    lines.push("- No semantic section headings were detected in the article body.");
  }
  lines.push("");

  lines.push("## Images");
  if (pageData.images.length) {
    pageData.images.forEach((image, index) => {
      const label = image.alt || `Image ${index + 1}`;
      if (image.localPath) {
        lines.push(`- [${label}](${image.localPath}) | Source: ${image.url}`);
      } else {
        lines.push(`- [${label}](${image.url})`);
      }
    });
  } else {
    lines.push("- No article-body image links were detected.");
  }
  lines.push("");

  lines.push("## Related Navigation");
  if (pageData.navLinks.length) {
    for (const navLink of pageData.navLinks) {
      lines.push(`- [${navLink.label}](${navLink.url})`);
    }
  } else {
    lines.push("- No previous/next navigation links were detected.");
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function getDirectChildren(element, selector) {
  return [...element.children].filter((child) => child.matches(selector));
}

function parseTopicTree(document) {
  const tocRoot = document.querySelector(".tocContainer .tocList");
  if (!tocRoot) {
    throw new Error("Unable to locate Photoshop Desktop left navigation.");
  }

  const items = [];
  let sequence = 1;

  function walk(list, parentPath) {
    for (const li of getDirectChildren(list, "li.toclink-label")) {
      const parentNode = li.querySelector(":scope > span.parentNode");
      const leafNode = li.querySelector(":scope > a.leafNode");
      const childList = li.querySelector(":scope > ul.children");

      if (parentNode) {
        const title = cleanText(parentNode.querySelector(".parentNodeLabel")?.textContent || "");
        const url = toAbsoluteUrl(parentNode.getAttribute("data-href") || "");
        const pathParts = [...parentPath, title];
        items.push({
          id: sequence++,
          type: "topic",
          title,
          url,
          depth: parentPath.length + 1,
          path: parentPath,
        });

        if (childList) {
          walk(childList, pathParts);
        }
        continue;
      }

      if (leafNode) {
        const title = cleanText(leafNode.textContent || "");
        items.push({
          id: sequence++,
          type: "page",
          title,
          url: toAbsoluteUrl(leafNode.getAttribute("href") || ""),
          depth: parentPath.length + 1,
          path: parentPath,
        });
      }
    }
  }

  walk(tocRoot, []);
  return items;
}

function buildTodoMarkdown(items) {
  const lines = [
    "# Photoshop Desktop Study TODO",
    "",
    `Total tracked items: ${items.length}`,
    "",
  ];

  for (const item of items) {
    const indent = "  ".repeat(Math.max(0, item.depth - 1));
    const label = `${item.type === "topic" ? "topic" : "page"} ${String(item.id).padStart(4, "0")}`;
    lines.push(
      `${indent}- [x] ${label}: [${item.title}](${item.url})`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildReadme(items) {
  const topicCount = items.filter((item) => item.type === "topic").length;
  const pageCount = items.filter((item) => item.type === "page").length;

  return `# Photoshop Desktop Study Pack

This folder was generated from Adobe's Photoshop Desktop Help left navigation at ${ROOT_URL}.

- Total tracked items: ${items.length}
- Topic landing pages: ${topicCount}
- Leaf pages: ${pageCount}
- Main todo list: [todo.md](./todo.md)
- Enrichment todo list: [enrichment-todo.md](./enrichment-todo.md)
- Machine-readable manifest: [manifest.json](./manifest.json)
- Per-item notes: [pages/](./pages/)

Notes:

- The pack records every visible topic/page from the left navigation tree.
- Each note file keeps the source URL, breadcrumb path, page description, richer article-body text blocks, semantic headings when available, and article-body image links.
- The enriched notes also attempt to extract usage details such as mouse/menu steps, hotkeys, and visible UI elements from the article body.
- This is intended as a study index and note pack rather than a verbatim mirror of Adobe Help pages.
`;
}

function buildEnrichmentTodoMarkdown(items) {
  const lines = [
    "# Photoshop Desktop Enrichment TODO",
    "",
    `Total tracked items: ${items.length}`,
    "",
    "This checklist tracks the pass that adds more detailed function descriptions, usage steps, hotkeys, and UI details to each note.",
    "",
  ];

  for (const item of items) {
    const indent = "  ".repeat(Math.max(0, item.depth - 1));
    const label = `${item.type === "topic" ? "topic" : "page"} ${String(item.id).padStart(4, "0")}`;
    lines.push(`${indent}- [x] ${label}: [${item.title}](${item.url})`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function ensureOutputDirs() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });
}

async function downloadContentImages(item, images) {
  if (!images.length) return images;

  const itemImageDir = path.join(IMAGES_DIR, `${String(item.id).padStart(4, "0")}-${slugify(item.title)}`);
  await mkdir(itemImageDir, { recursive: true });

  const downloaded = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const tempFile = path.join(os.tmpdir(), `ps-study-${process.pid}-${Date.now()}-${index}.tmp`);
    try {
      const headers = await downloadToFile(image.url, tempFile);
      const contentType = parseContentType(headers);
      const ext = extensionFromContentType(contentType);
      const fileName = `${String(index + 1).padStart(2, "0")}-${sanitizePathSegment(image.alt || `image-${index + 1}`)}${ext}`;
      const finalFile = path.join(itemImageDir, fileName);
      await rename(tempFile, finalFile);

      downloaded.push({
        ...image,
        contentType,
        fileName,
        localPath: `../images/${path.basename(itemImageDir)}/${fileName}`,
      });
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  }

  return downloaded;
}

async function collectPageData(item) {
  const html = await curl(item.url);
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const flatJsonLd = flattenJsonLdItems(parseJsonLd(document));
  const articleRoot = getArticleRoot(document);
  const description = extractDescription(document, flatJsonLd);
  const bodySections = extractArticleBody(articleRoot);

  const title = cleanText(document.querySelector("h1")?.textContent || document.title);
  const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || item.url;
  const isoDate = extractIsoDate(flatJsonLd);

  return {
    title,
    canonicalUrl,
    description,
    breadcrumbs: extractBreadcrumbs(flatJsonLd),
    lastUpdated: extractLastUpdated(document, isoDate),
    headings: extractHeadings(articleRoot),
    textSnippets: extractTextBlockSnippets(articleRoot),
    bodySections,
    detailedDescription: extractDetailedDescription(description, bodySections),
    mouseActions: extractMouseActions(bodySections),
    hotkeys: extractHotkeys(bodySections),
    uiControls: extractUiControls(articleRoot, bodySections),
    images: extractImageLinks(articleRoot),
    navLinks: extractNavigationLinks(document),
  };
}

async function runWithConcurrency(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) {
        await worker(item);
      }
    }
  });
  await Promise.all(runners);
}

async function main() {
  await ensureOutputDirs();

  const rootHtml = await curl(ROOT_URL);
  const rootDom = new JSDOM(rootHtml);
  const items = parseTopicTree(rootDom.window.document).map((item) => ({
    ...item,
    noteFile: path.join(
      "pages",
      `${String(item.id).padStart(4, "0")}-${slugify(item.title)}.md`,
    ),
  }));

  await writeFile(path.join(OUTPUT_DIR, "README.md"), buildReadme(items), "utf8");
  await writeFile(path.join(OUTPUT_DIR, "todo.md"), buildTodoMarkdown(items), "utf8");
  await writeFile(ENRICHMENT_TODO_FILE, buildEnrichmentTodoMarkdown(items), "utf8");
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");

  const pageManifest = [];

  await runWithConcurrency(items, async (item) => {
    try {
      const pageData = await collectPageData(item);
      pageData.images = await downloadContentImages(item, pageData.images);
      pageManifest.push({
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        noteFile: item.noteFile,
        description: pageData.description,
        lastUpdated: pageData.lastUpdated,
        headings: pageData.headings,
        bodySectionCount: pageData.bodySections.length,
        detailedDescription: pageData.detailedDescription,
        mouseActionCount: pageData.mouseActions.length,
        hotkeyCount: pageData.hotkeys.length,
        uiControlCount: pageData.uiControls.length,
        imageCount: pageData.images.length,
        images: pageData.images.map((image) => ({
          alt: image.alt,
          url: image.url,
          localPath: image.localPath || "",
          contentType: image.contentType || "",
        })),
      });

      const markdown = buildNoteMarkdown(item, pageData);
      await writeFile(path.join(OUTPUT_DIR, item.noteFile), markdown, "utf8");
      console.log(`done ${String(item.id).padStart(4, "0")} ${item.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pageManifest.push({
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        noteFile: item.noteFile,
        error: message,
      });

      const markdown = [
        `# ${item.title}`,
        "",
        `- Type: ${item.type}`,
        `- Source: ${item.url}`,
        `- Error: ${message}`,
        "",
      ].join("\n");
      await writeFile(path.join(OUTPUT_DIR, item.noteFile), `${markdown}\n`, "utf8");
      console.error(`error ${String(item.id).padStart(4, "0")} ${item.title}: ${message}`);
    }
  });

  pageManifest.sort((a, b) => a.id - b.id);
  await writeFile(
    path.join(OUTPUT_DIR, "pages.json"),
    `${JSON.stringify(pageManifest, null, 2)}\n`,
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
