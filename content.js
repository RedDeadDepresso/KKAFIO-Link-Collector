// ====== SITE CONFIG — edit these if a site's URL structure differs ======
const SITES = [
  {
    host: /(^|\.)pixiv\.net$/,
    // thumbnails + post pages: /artworks/123 and /en/artworks/123 -> canonical link
    match: (u) => {
      const m = u.pathname.match(/^\/(?:[a-z]{2}(?:_[a-z]{2})?\/)?artworks\/(\d+)/);
      return m ? `https://www.pixiv.net/artworks/${m[1]}` : null;
    },
    // extra pages that get the floating "collect" button:
    // /users/ID, /users/ID/illustrations, /users/ID/illustrations/<anything> and /search
    // (the query string is appended automatically by canonicalPage)
    page: (u) => {
      const m = u.pathname.match(/^\/(?:[a-z]{2}(?:_[a-z]{2})?\/)?users\/(\d+)(\/illustrations(?:\/[^/?#]+)*)?\/?$/);
      if (m) return `https://www.pixiv.net/users/${m[1]}${m[2] || ""}`;
      if (/^\/(?:[a-z]{2}(?:_[a-z]{2})?\/)?search\/?$/.test(u.pathname)) return "https://www.pixiv.net/search";
      // keyword search results: /tags/<keyword>/artworks (also /illustrations, /top, etc.)
      const t = u.pathname.match(/^\/(?:[a-z]{2}(?:_[a-z]{2})?\/)?(tags\/[^/?#]+(?:\/[^/?#]+)?)\/?$/);
      if (t) return `https://www.pixiv.net/${t[1]}`;
      return null;
    },
  },
  {
    host: /(^|\.)pawchive\.pw$/,
    // /SERVICE/user/ID  and  /SERVICE/user/ID/post/POSTID
    match: (u) => {
      const m = u.pathname.match(/^\/[^/]+\/user\/[^/]+(?:\/post\/[^/]+)?/);
      return m ? u.origin + m[0] : null;
    },
  },
  {
    host: /^db\.bepis\.moe$/,
    // /GAME/view/ID  (e.g. /koikatsu/view/1234, /kkclothing/view/1234)
    match: (u) => {
      const m = u.pathname.match(/^\/[^/]+\/view\/[^/?#]+/);
      return m ? u.origin + m[0] : null;
    },
    // listing pages also get the floating button (query string kept: filters/pages)
    page: (u) =>
      /^\/(koikatsu|kkscenes|kkclothing)\/?$/.test(u.pathname)
        ? u.origin + u.pathname.replace(/\/$/, "") + u.search
        : null,
  },
  {
    host: /(^|\.)koikatsucards\.com$/,
    // card pages: /contents/ID (plus a few guesses)
    match: (u) => {
      const m = u.pathname.match(/^\/(?:contents|card|cards|post|posts|view|c)\/[^/?#]+/);
      return m ? u.origin + m[0] : null;
    },
    // listing/search pages also get the floating button (query string kept)
    page: (u) =>
      /^\/(contents|search)\/?$/.test(u.pathname)
        ? u.origin + u.pathname.replace(/\/$/, "") + u.search
        : null,
    // also put a button on ANY image-link to a same-site page (thumbnails)
    anyThumb: true,
  },
];
// ========================================================================

const site = SITES.find((s) => s.host.test(location.hostname));
let collected = new Set();

const getLinks = () =>
  new Promise((r) => chrome.storage.local.get({ links: [] }, (d) => r(d.links)));
const setLinks = (links) => chrome.storage.local.set({ links });

// URL to collect for the current page (floating button)
function canonicalPage(href) {
  try {
    const u = new URL(href, location.href);
    const base = (site.page && site.page(u)) || site.match(u);
    if (!base) return null;
    // keep the query string (filters, search terms, page numbers) for the
    // floating button; some site rules strip it, others already include it
    return base.includes("?") ? base : base + u.search;
  } catch { return null; }
}

function canonical(href, thumb) {
  try {
    const u = new URL(href, location.href);
    const m = site.match(u);
    if (m || !(thumb && site.anyThumb)) return m;
    // fallback for sites whose URL pattern is unknown: any same-site page link
    if (u.origin !== location.origin || u.pathname === "/") return null;
    if (/\.(png|jpe?g|gif|webp|zip|7z|rar)$/i.test(u.pathname)) return null;
    return u.origin + u.pathname + u.search;
  } catch { return null; }
}

async function toggle(url, btn) {
  const links = await getLinks();
  const i = links.findIndex((l) => l.url === url);
  if (i >= 0) links.splice(i, 1);
  else links.push({ url, title: document.title, added: Date.now() });
  await setLinks(links);
}

function paint(btn) {
  const on = collected.has(btn.dataset.url);
  btn.classList.toggle("lc-on", on);
  btn.textContent = on ? "✓" : "+";
  if (btn.classList.contains("lc-float")) btn.textContent = on ? t("collectedFloat") : t("collectFloat");
}

function makeBtn(url, floating) {
  const b = document.createElement("button");
  b._lc = true; // expando: marks buttons we own; lost when a page snapshot is cloned
  b.className = "lc-btn" + (floating ? " lc-float" : "");
  b.dataset.url = url;
  b.title = t("collectBtnTitle");
  b.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    toggle(b.dataset.url, b); // read live: the floating button's URL changes on in-page navigation
  }, true);
  paint(b);
  return b;
}

// Thumbnail buttons live in their own overlay on <body>, positioned over the
// images (in page coordinates, so they scroll smoothly with the page). We never modify the site's own elements (that breaks React pages).
const tracked = new Map(); // anchor -> button
const urlCache = new Map();
let overlay;

function getOverlay() {
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement("div");
    overlay._lc = true;
    overlay.id = "lc-overlay";
    document.body.appendChild(overlay);
  }
  return overlay;
}

function urlFor(a) {
  const href = a.getAttribute("href");
  if (!urlCache.has(href)) urlCache.set(href, canonical(href, true));
  return urlCache.get(href);
}

function isShown(el) {
  if (el.checkVisibility) {
    return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
}

// true if something unrelated (another page layer, modal...) is drawn over the thumbnail
function isCovered(a, r) {
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false; // can't tell off-screen
  const el = document.elementFromPoint(cx, cy);
  if (!el) return false;
  const box = (a.parentElement && a.parentElement.parentElement) || a;
  return !(box.contains(el) || el.contains(box));
}

// Remove anything that looks like ours but isn't live (e.g. restored from a
// site's history snapshot, such as htmx's body cache).
function purgeStale() {
  document.querySelectorAll("#lc-overlay").forEach((o) => { if (!o._lc) o.remove(); });
  document.querySelectorAll(".lc-btn").forEach((b) => { if (!b._lc) b.remove(); });
  const floats = [...document.querySelectorAll(".lc-float")];
  floats.slice(1).forEach((b) => b.remove());
}

// Take our UI out of the DOM (used before the site snapshots the page).
function removeUI() {
  tracked.forEach((b) => b.remove());
  tracked.clear();
  document.querySelectorAll(".lc-float").forEach((b) => b.remove());
  if (overlay) overlay.remove();
  overlay = null;
}

function update() {
  purgeStale();
  const vw = innerWidth, vh = innerHeight, M = 400; // render a bit beyond the viewport
  const seen = new Set();
  // The overlay scrolls with the page, so buttons are placed relative to it
  // (page coordinates) and the browser moves them natively while scrolling.
  const ov = getOverlay();
  const o = ov.getBoundingClientRect();
  document.querySelectorAll("a[href]").forEach((a) => {
    const img = a.querySelector("img");
    if (!img) return;
    const r = img.getBoundingClientRect();
    if (r.width < 50 || r.height < 50 || r.bottom < -M || r.top > vh + M || r.right < -M || r.left > vw + M) return;
    if (!isShown(img) || isCovered(a, r)) return; // hidden posts get no button
    const url = urlFor(a);
    if (!url) return;
    let b = tracked.get(a);
    if (!b || !b.isConnected || b.dataset.url !== url) {
      if (b) b.remove();
      b = makeBtn(url, false);
      ov.appendChild(b);
      tracked.set(a, b);
    }
    const x = Math.round(r.left - o.left + 6);
    const y = Math.round(r.top - o.top + 6);
    if (b._x !== x) { b.style.left = x + "px"; b._x = x; }
    if (b._y !== y) { b.style.top = y + "px"; b._y = y; }
    seen.add(a);
  });
  for (const [a, b] of tracked) {
    if (!seen.has(a)) { b.remove(); tracked.delete(a); }
  }

  // floating button on the post page itself
  const cur = canonicalPage(location.href);
  const f = document.querySelector(".lc-float");
  if (cur && !f) document.body.appendChild(makeBtn(cur, true));
  else if (cur && f && f.dataset.url !== cur) { f.dataset.url = cur; paint(f); }
  else if (!cur && f) f.remove();
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}

function refresh() {
  document.querySelectorAll(".lc-btn").forEach(paint);
}

async function init() {
  if (!site) return;
  collected = new Set((await getLinks()).map((l) => l.url));
  update();
  new MutationObserver((records) => {
    // ignore changes made by our own overlay
    if (records.some((r) => !(overlay && overlay.contains(r.target)))) schedule();
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  });
  // htmx (Pawchive) snapshots <body> into its history cache: keep our UI out of it
  document.addEventListener("htmx:beforeHistorySave", () => { removeUI(); setTimeout(schedule, 0); });
  document.addEventListener("htmx:historyRestore", schedule);
  document.addEventListener("htmx:afterSettle", schedule);
  addEventListener("popstate", schedule);
  addEventListener("scroll", schedule, true);
  addEventListener("resize", schedule);
  setInterval(schedule, 500); // catches lazy-loaded images / layout shifts
  chrome.storage.onChanged.addListener((c) => {
    if (c.links) { collected = new Set(c.links.newValue.map((l) => l.url)); refresh(); }
  });
}
init();