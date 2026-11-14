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
  "catbox.moe",
  "pixeldrain.com",
  "pixeldrain.net",
  "pixeldrain.dev",
];

function isAllowed(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}

// Pixiv wraps external links as https://www.pixiv.net/jump.php?<encoded target>
// (or jump.php?url=<encoded target>). Return the real target instead.
function unwrapJump(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)pixiv\.net$/i.test(u.hostname) || !/^\/jump\.php$/i.test(u.pathname)) return url;
    let target = u.searchParams.get("url");
    if (!target) {
      const raw = u.search.slice(1);
      try { target = decodeURIComponent(raw); } catch { target = raw; }
    }
    return /^https?:\/\//i.test(target) ? target : url;
  } catch {
    return url;
  }
}

// Finds Base64-encoded URLs in plain text (also nested, e.g. base64 of base64)
// and returns the decoded http(s) links. Tokens that don't decode to a URL are ignored.
function decodeBase64Urls(text) {
  const out = [];
  const tokens = String(text || "").match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) || [];
  for (const tok of tokens) {
    let cur = tok;
    for (let layer = 0; layer < 5; layer++) {
      let dec;
      try {
        let b = cur.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
        b += "=".repeat((4 - (b.length % 4)) % 4);
        dec = atob(b);
        // reject anything that isn't printable text
        if (/[^\x20-\x7e\r\n\t]/.test(dec)) break;
      } catch { break; }
      const hit = dec.match(/https?:\/\/[^\s<>"'`]+/i);
      if (hit) { out.push(hit[0].replace(/[.,;:!?)\]}>]+$/, "")); break; }
      cur = dec.trim();
    }
  }
  return out;
}

const MENU_ID_ANY = "kkafio-extract-links-any";
function createMenu() {
  api.contextMenus.removeAll(() => {
    const title = api.i18n.getMessage("menuExtract") || "Extract links with KKAFIO Link Collector";
    // highlighted text / links: every website
    api.contextMenus.create({ id: MENU_ID, title, contexts: ["selection", "link"] });
    // right-click anywhere (buttons etc.): only where target.js runs
    api.contextMenus.create({
      id: MENU_ID_ANY,
      title,
      contexts: ["page", "frame", "image", "video", "audio", "editable"],
      documentUrlPatterns: ["*://kknow.cc/*", "*://*.kknow.cc/*"],
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

  // URLs hidden in element attributes: onclick="window.open('https://...')",
  // data-href / data-url, formaction, etc. (buttons, spans, divs...)
  const scanAttrs = (el) => {
    for (const attr of el.attributes) {
      if (/^(style|class|src|srcset|d|viewbox|points|transform)$/i.test(attr.name)) continue;
      const v = attr.value.replace(/\\\//g, "/"); // JS-escaped slashes: https:\/\/
      for (const m of v.matchAll(/https?:\/\/[^\s<>"'`\\]+/gi)) {
        out.add(m[0].replace(/[.,;:!?)\]}>]+$/, ""));
      }
    }
  };
  for (let i = 0; i < sel.rangeCount; i++) {
    const node = sel.getRangeAt(i).commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) continue;
    // the element the selection sits inside (e.g. text inside a <button>) and its parents
    for (let p = el, n = 0; p && p !== document.body && n < 4; p = p.parentElement, n++) scanAttrs(p);
    // every element touched by the selection
    scanAttrs(el);
    el.querySelectorAll("*").forEach((c) => { if (sel.containsNode(c, true)) scanAttrs(c); });
  }

  // plain-text URLs
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  for (const m of sel.toString().matchAll(re)) {
    out.add(m[0].replace(/[.,;:!?)\]}>]+$/, ""));
  }

  return [...out].filter((u) => /^https?:\/\//i.test(u));
}

// ---- badge: permanent total of collected links, briefly replaced by a flash ----
let flashing = false;

// Chrome picks black or white text automatically; force white
const setWhiteText = () => api.action.setBadgeTextColor && api.action.setBadgeTextColor({ color: "#ffffff" });

async function updateBadge() {
  if (flashing) return;
  const { links = [] } = await api.storage.local.get({ links: [] });
  const n = links.length;
  api.action.setBadgeBackgroundColor({ color: "#3b82f6" });
  setWhiteText();
  api.action.setBadgeText({ text: n ? (n > 999 ? "999+" : String(n)) : "" });
}

function flashBadge(text, color) {
  flashing = true;
  api.action.setBadgeBackgroundColor({ color });
  setWhiteText();
  api.action.setBadgeText({ text });
  setTimeout(() => { flashing = false; updateBadge(); }, 2500);
}

// keep the total in sync with every change (buttons, popup, extraction, clearing)
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.links) updateBadge();
});
api.runtime.onInstalled.addListener(updateBadge);
api.runtime.onStartup.addListener(updateBadge);
updateBadge(); // also when the service worker wakes up

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if ((info.menuItemId !== MENU_ID && info.menuItemId !== MENU_ID_ANY) || !tab) return;

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

  // Base64-encoded links in the highlighted text (single or nested encoding)
  if (info.selectionText) found.push(...decodeBase64Urls(info.selectionText));

  // right-clicked element (button, div with onclick/data-href, ...) when nothing is highlighted
  if (!info.selectionText) {
    try {
      const urls = await api.tabs.sendMessage(tab.id, { type: "kkafio-get-target-urls" }, { frameId: info.frameId || 0 });
      if (Array.isArray(urls)) found.push(...urls);
    } catch (e) {
      console.error("KKAFIO: could not read clicked element", e);
    }
  }

  // fall back to plain text of the selection if scripting failed
  if (!found.length && info.selectionText) {
    found = (info.selectionText.match(/https?:\/\/[^\s<>"'`]+/gi) || [])
      .map((u) => u.replace(/[.,;:!?)\]}>]+$/, ""));
  }

  found = [...new Set(found.map(unwrapJump))].filter(isAllowed);

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
  else flashBadge(found.length ? (api.i18n.getMessage("badgeDup") || "dup") : "0", "#888888"); // "0" = no links from allowed sites
});
