import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { JSDOM } from "jsdom";

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.resolve("doc/photoshop-desktop-study");
const MANIFEST_FILE = path.join(OUTPUT_DIR, "manifest.json");
const PAGES_DIR = path.join(OUTPUT_DIR, "pages");
const PAGES_JSON_FILE = path.join(OUTPUT_DIR, "pages.json");
const TODO_FILE = path.join(OUTPUT_DIR, "web-research-todo.md");

const MAX_BUFFER = 64 * 1024 * 1024;
const CONCURRENCY = 2;
const RESULT_LIMIT = 1;
const LIMIT = Number(process.env.LIMIT || 0);
const OFFSET = Number(process.env.OFFSET || 0);

const BLOCKED_DOMAINS = [
  "reddit.com",
  "quora.com",
  "apps.microsoft.com",
  "play.google.com",
  "apps.apple.com",
  "gizmodo.com/download",
];

const PREFER_EXTERNAL_PATTERNS = [
  "photoshopcafe.com",
  "phlearn.com",
  "photoshoptrainingchannel.com",
  "photoshopessentials.com",
  "fstoppers.com",
  "creativebloq.com",
  "schoolofmotion.com",
  "thehelpfulmarketer.com",
  "vagon.io",
  "8designers.com",
  "linkedin.com/learning",
  "youtube.com",
  "adobe.com/learn",
  "community.adobe.com",
  "superuser.com",
];

function cleanText(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(lines) {
  return [...new Set(lines.filter(Boolean))];
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

async function curl(url) {
  const { stdout } = await execFileAsync(
    "curl",
    ["-A", "Mozilla/5.0", "-L", "--silent", "--show-error", "--fail", url],
    { maxBuffer: MAX_BUFFER },
  );
  return stdout;
}

function buildQuery(item) {
  const context = item.path.join(" ");
  if (item.type === "page") {
    return `Photoshop "${item.title}" ${context} tutorial`;
  }
  return `Photoshop ${item.title} ${context} feature tutorial`;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlocked(url) {
  return BLOCKED_DOMAINS.some((blocked) => url.includes(blocked));
}

function scoreResult(result, item) {
  let score = 0;
  const haystack = `${result.title} ${result.snippet}`.toLowerCase();
  const domain = getDomain(result.link);
  const titleTokens = cleanText(item.title).toLowerCase().split(/\s+/).filter((token) => token.length > 2);

  for (const token of titleTokens) {
    if (haystack.includes(token)) score += 3;
  }

  if (haystack.includes("photoshop")) score += 4;
  if (haystack.includes("tutorial")) score += 1;
  if (haystack.includes("how to")) score += 1;
  if (haystack.includes("shortcut")) score += 1;
  if (haystack.includes("panel") || haystack.includes("menu") || haystack.includes("button")) score += 1;

  if (PREFER_EXTERNAL_PATTERNS.some((pattern) => result.link.includes(pattern))) score += 5;
  if (domain.includes("adobe.com") || domain.includes("helpx.adobe.com")) score -= 2;
  if (isBlocked(result.link)) score -= 100;

  return score;
}

async function searchBrave(query) {
  const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
  const html = await curl(url);
  const document = new JSDOM(html).window.document;

  const results = [...document.querySelectorAll('div.snippet[data-type="web"]')].map((element) => {
    const link = element.querySelector('a[href^="http"]')?.href || "";
    return {
      title: cleanText(element.querySelector(".title")?.textContent || ""),
      link,
      snippet: cleanText(element.querySelector(".generic-snippet .content")?.textContent || ""),
    };
  }).filter((result) => result.title && result.link);

  return unique(
    results.map((result) => JSON.stringify(result)),
  ).map((json) => JSON.parse(json));
}

function findMainContent(document) {
  const selectors = [
    "article",
    "main article",
    "main",
    ".post-body",
    ".entry-content",
    ".post-content",
    ".article-content",
    ".content",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && cleanText(element.textContent || "").length > 200) {
      return element;
    }
  }

  return document.body;
}

function extractLines(element) {
  const lines = [];
  for (const node of element.querySelectorAll("h1, h2, h3, p, li")) {
    const text = cleanText(node.textContent || "");
    if (!text) continue;
    if (node.tagName.toLowerCase() === "li") {
      lines.push(`- ${text}`);
    } else {
      lines.push(text);
    }
  }
  return unique(lines);
}

function extractHotkeys(lines) {
  const shortcutRegex = /\b(?:Ctrl|Command|Cmd|Shift|Alt|Option|Win)\s*\+\s*[A-Za-z0-9/]+(?:\s*\+\s*[A-Za-z0-9/]+)*/g;
  return unique(lines.flatMap((line) => {
    const matches = line.match(shortcutRegex);
    if (!matches) return [];
    return [`${matches.join(" / ")}: ${line.replace(/^- /, "")}`];
  }));
}

function extractUiHints(lines) {
  return unique(lines.filter((line) => /(?:menu|panel|toolbar|dialog|button|workspace|preferences|settings)/i.test(line))).slice(0, 6);
}

function buildResearchBullets(metaDescription, lines) {
  const bullets = [];
  if (metaDescription) bullets.push(metaDescription);

  for (const line of lines) {
    const plain = line.replace(/^- /, "");
    if (plain.length < 30) continue;
    if (!bullets.includes(plain)) bullets.push(plain);
    if (bullets.length >= 4) break;
  }

  return bullets;
}

async function fetchExternalResearch(item) {
  const query = buildQuery(item);
  const searchResults = await searchBrave(query);
  const ranked = searchResults
    .map((result) => ({ ...result, score: scoreResult(result, item) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_LIMIT);

  const sources = [];

  for (const result of ranked) {
    try {
      const html = await curl(result.link);
      const document = new JSDOM(html).window.document;
      const content = findMainContent(document);
      const metaDescription = cleanText(
        document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
      );
      const lines = extractLines(content).slice(0, 20);

      sources.push({
        title: result.title,
        url: result.link,
        domain: getDomain(result.link),
        searchSnippet: result.snippet,
        metaDescription,
        bullets: buildResearchBullets(metaDescription || result.snippet, lines),
        hotkeys: extractHotkeys(lines).slice(0, 4),
        uiHints: extractUiHints(lines),
      });
    } catch {
      sources.push({
        title: result.title,
        url: result.link,
        domain: getDomain(result.link),
        searchSnippet: result.snippet,
        metaDescription: "",
        bullets: result.snippet ? [result.snippet] : [],
        hotkeys: [],
        uiHints: [],
      });
    }
  }

  return {
    query,
    sources,
  };
}

function buildResearchSection(research) {
  const lines = [
    "## External Web Research",
    "",
    `- Search query: ${research.query}`,
    "",
  ];

  if (!research.sources.length) {
    lines.push("- No strong external web sources were found for this note.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  research.sources.forEach((source, index) => {
    lines.push(`### Source ${index + 1}`);
    lines.push(`- Title: ${source.title}`);
    lines.push(`- Domain: ${source.domain}`);
    lines.push(`- Link: ${source.url}`);
    lines.push("");

    lines.push("### Extra Details From Web");
    if (source.bullets.length) {
      source.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
    } else {
      lines.push("- No additional detail could be extracted from this source.");
    }
    lines.push("");

    if (source.hotkeys.length) {
      lines.push("### Hotkeys From Web");
      source.hotkeys.forEach((hotkey) => lines.push(`- ${hotkey}`));
      lines.push("");
    }

    if (source.uiHints.length) {
      lines.push("### UI Hints From Web");
      source.uiHints.forEach((hint) => lines.push(`- ${hint.replace(/^- /, "")}`));
      lines.push("");
    }
  });

  return `${lines.join("\n")}\n`;
}

function injectResearchSection(markdown, section) {
  const start = markdown.indexOf("## External Web Research");
  const related = markdown.indexOf("## Related Navigation");

  if (start !== -1) {
    const end = related !== -1 ? related : markdown.length;
    return `${markdown.slice(0, start)}${section}${markdown.slice(end)}`;
  }

  if (related !== -1) {
    return `${markdown.slice(0, related)}${section}${markdown.slice(related)}`;
  }

  return `${markdown.trimEnd()}\n\n${section}`;
}

function buildTodo(items) {
  const lines = [
    "# Photoshop Web Research TODO",
    "",
    `Total tracked items: ${items.length}`,
    "",
    "This checklist tracks the pass that adds non-local web research to each note.",
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

async function runWithConcurrency(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  const selectedItems = manifest.slice(OFFSET, LIMIT > 0 ? OFFSET + LIMIT : undefined);
  let pagesJson = [];
  try {
    pagesJson = JSON.parse(await readFile(PAGES_JSON_FILE, "utf8"));
  } catch {
    pagesJson = [];
  }

  await writeFile(TODO_FILE, buildTodo(manifest), "utf8");

  await runWithConcurrency(selectedItems, async (item) => {
    const notePath = path.join(OUTPUT_DIR, item.noteFile);
    const markdown = await readFile(notePath, "utf8");
    const research = await fetchExternalResearch(item);
    const section = buildResearchSection(research);
    await writeFile(notePath, injectResearchSection(markdown, section), "utf8");

    const pageEntry = pagesJson.find((entry) => entry.id === item.id);
    if (pageEntry) {
      pageEntry.externalWebResearch = {
        query: research.query,
        sourceCount: research.sources.length,
        sources: research.sources.map((source) => ({
          title: source.title,
          url: source.url,
          domain: source.domain,
        })),
      };
    }

    console.log(`researched ${String(item.id).padStart(4, "0")} ${item.title}`);
  });

  if (pagesJson.length) {
    await writeFile(PAGES_JSON_FILE, `${JSON.stringify(pagesJson, null, 2)}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
