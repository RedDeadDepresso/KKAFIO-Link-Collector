const api = globalThis.browser ?? chrome;
const MENU_ID = "kkafio-extract-links";

// Only links on these domains (and their subdomains) are kept. Edit freely.
const ALLOWED_DOMAINS = [
  "pixiv.net",
  "pawchive.pw",
  "koikatsucards.com",
  "bepis.moe",
  "gofile.io",
  "mega.nz",
  "mega.io",
  "mega.co.nz",
  "drive.google.com",
  "drive.usercontent.google.com",
  "files.catbox.moe",
];

function isAllowed(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}

function createMenu() {
  api.contextMenus.removeAll(() => {
    api.contextMenus.create({
      id: MENU_ID,
      title: api.i18n.getMessage("menuExtract"),
      contexts: ["selection", "link"],
    });
  });
}
api.runtime.onInstalled.addListener(createMenu);
api.runtime.onStartup.addListener(createMenu); // keeps the title in sync with the browser language

// Runs inside the page: returns every link found in the current selection,
// both real <a href> links and plain-text URLs.
function extractFromSelection() {
  const sel = getSelection();
  const out = new Set();
  if (!sel || !sel.rangeCount) return [];

  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);

    // selection sitting inside a single link
    const node = range.commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    const parentLink = el && el.closest && el.closest("a[href]");
    if (parentLink) out.add(parentLink.href);

    // every <a> that is fully or partly inside the selection
    if (el) {
      el.querySelectorAll("a[href]").forEach((a) => {
        if (sel.containsNode(a, true)) out.add(a.href);
      });
    }
  }

  // plain-text URLs
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  for (const m of sel.toString().matchAll(re)) {
    out.add(m[0].replace(/[.,;:!?)\]}>]+$/, ""));
  }

  return [...out].filter((u) => /^https?:\/\//i.test(u));
}

function flashBadge(text, color) {
  api.action.setBadgeBackgroundColor({ color });
  api.action.setBadgeText({ text });
  setTimeout(() => api.action.setBadgeText({ text: "" }), 2500);
}

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab) return;

  let found = [];

  // right-clicked hyperlink
  if (info.linkUrl) found.push(info.linkUrl);

  // highlighted text (links + plain-text URLs inside it)
  if (info.selectionText) {
    try {
      const results = await api.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [info.frameId || 0] },
        func: extractFromSelection,
      });
      found.push(...((results && results[0] && results[0].result) || []));
    } catch (e) {
      console.error("KKAFIO: could not read selection", e);
    }
  }

  // fall back to plain text of the selection if scripting failed
  if (!found.length && info.selectionText) {
    found = (info.selectionText.match(/https?:\/\/[^\s<>"'`]+/gi) || [])
      .map((u) => u.replace(/[.,;:!?)\]}>]+$/, ""));
  }

  found = [...new Set(found)].filter(isAllowed);

  const { links = [] } = await api.storage.local.get({ links: [] });
  const have = new Set(links.map((l) => l.url));
  let added = 0;
  for (const url of found) {
    if (have.has(url)) continue;
    have.add(url);
    links.push({ url, title: tab.title || url, added: Date.now() });
    added++;
  }
  await api.storage.local.set({ links });

  if (added) flashBadge("+" + added, "#22c55e");
  else flashBadge(found.length ? api.i18n.getMessage("badgeDup") : "0", "#888888"); // "0" = no links from allowed sites
});
