// ====== SITE CONFIG — edit these if a site's URL structure differs ======
const SITES = [
  {
    host: /(^|\.)pixiv\.net$/,
    // matches /artworks/123 and /en/artworks/123 -> canonical link
    match: (u) => {
      const m = u.pathname.match(/^\/(?:[a-z]{2}\/)?artworks\/(\d+)/);
      return m ? `https://www.pixiv.net/artworks/${m[1]}` : null;
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
    // /GAME/view/ID  (e.g. /koikatsu/view/1234)
    match: (u) => {
      const m = u.pathname.match(/^\/[^/]+\/view\/[^/?#]+/);
      return m ? u.origin + m[0] : null;
    },
  },
  {
    host: /(^|\.)koikatsucards\.com$/,
    // GUESS for the page-level button; adjust if needed
    match: (u) => {
      const m = u.pathname.match(/^\/(?:card|cards|post|posts|view|c)\/[^/?#]+/);
      return m ? u.origin + m[0] : null;
    },
    // also put a button on ANY image-link to a same-site page (thumbnails)
    anyThumb: true,
  },
];
// ========================================================================

const t = (k) => chrome.i18n.getMessage(k);
const site = SITES.find((s) => s.host.test(location.hostname));
let collected = new Set();

const getLinks = () =>
  new Promise((r) => chrome.storage.local.get({ links: [] }, (d) => r(d.links)));
const setLinks = (links) => chrome.storage.local.set({ links });

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
  b.className = "lc-btn" + (floating ? " lc-float" : "");
  b.dataset.url = url;
  b.title = t("collectBtnTitle");
  b.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    toggle(url, b);
  }, true);
  paint(b);
  return b;
}

// Thumbnail buttons live in their own overlay on <body>, positioned over the
// images. We never modify the site's own elements (that breaks React pages).
const tracked = new Map(); // anchor -> button
const urlCache = new Map();
let overlay;

function getOverlay() {
  if (!overlay || !overlay.isConnected) {
    overlay = document.createElement("div");
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

function update() {
  const vw = innerWidth, vh = innerHeight;
  const seen = new Set();
  document.querySelectorAll("a[href]").forEach((a) => {
    const img = a.querySelector("img");
    if (!img) return;
    const r = img.getBoundingClientRect();
    if (r.width < 50 || r.height < 50 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return;
    const url = urlFor(a);
    if (!url) return;
    let b = tracked.get(a);
    if (!b || b.dataset.url !== url) {
      if (b) b.remove();
      b = makeBtn(url, false);
      getOverlay().appendChild(b);
      tracked.set(a, b);
    }
    b.style.left = r.left + 6 + "px";
    b.style.top = r.top + 6 + "px";
    seen.add(a);
  });
  for (const [a, b] of tracked) {
    if (!seen.has(a)) { b.remove(); tracked.delete(a); }
  }

  // floating button on the post page itself
  const cur = canonical(location.href);
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
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  addEventListener("scroll", schedule, true);
  addEventListener("resize", schedule);
  setInterval(schedule, 1000); // catches lazy-loaded images / layout shifts
  chrome.storage.onChanged.addListener((c) => {
    if (c.links) { collected = new Set(c.links.newValue.map((l) => l.url)); refresh(); }
  });
}
init();
