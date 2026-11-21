// KKAFIO: knows which Pixiv posts and artists exist on koikatsucards.com, Bepis and Pawchive.
//
// The data is lookup.json (https://github.com/RedDeadDepresso/kk-author-scraper). background.js
// downloads it and keeps it in chrome.storage.local["lookup"]; this file only reads it.
// Shape (version 1):
//   urls:    URL templates ({id} {slug} {name} {service}); only known hosts are accepted
//   posts:   [pixiv post ids present on koikatsucards]
//   authors: { koikatsucards author slug: display name }
//   users:   { pixiv user id: { authors: [slug], bepis: [name], pawchive: {service, id} } }
const KK = (() => {
  const DEFAULT_URLS = {
    post: "https://koikatsucards.com/contents/pixiv-{id}",
    author: "https://koikatsucards.com/search?author={slug}",
    bepis: "https://db.bepis.moe/koikatsu?cardAuthor={name}",
    pawchive: "https://pawchive.pw/{service}/user/{id}",
  };
  // The file comes from the network, so it may never point links anywhere else.
  const ALLOWED_URL = /^https:\/\/(?:koikatsucards\.com|db\.bepis\.moe|pawchive\.pw)\//;
  const TELEGRAM_URL = "https://web.telegram.org/k/";
  const LANG = "(?:[a-z]{2}(?:_[a-z]{2})?\\/)?";
  const ARTWORK_PATH = new RegExp("^\\/" + LANG + "artworks\\/(\\d+)");
  const USER_PATH = new RegExp("^\\/" + LANG + "users\\/(\\d+)");

  const st = { ready: false, posts: new Set(), users: {}, authors: {}, urls: { ...DEFAULT_URLS } };
  const artistCache = new Map(); // artwork id -> pixiv user id (string) or null
  const userNameCache = new Map(); // pixiv user id -> display name or null
  const pending = new Set();
  let onChangeCb = () => {};
  let panel = null;

  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const fill = (tpl, vars) =>
    tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] === undefined ? "" : vars[k]));

  function ingest(lookup) {
    if (!lookup || lookup.version !== 1 || !Array.isArray(lookup.posts) || !lookup.users || typeof lookup.users !== "object") {
      return false;
    }
    st.posts = new Set(lookup.posts);
    st.users = lookup.users;
    st.authors = lookup.authors && typeof lookup.authors === "object" ? lookup.authors : {};
    const urls = { ...DEFAULT_URLS };
    for (const k of Object.keys(DEFAULT_URLS)) {
      const v = lookup.urls && lookup.urls[k];
      if (typeof v === "string" && ALLOWED_URL.test(v)) urls[k] = v;
    }
    st.urls = urls;
    st.ready = true;
    return true;
  }

  function load() {
    chrome.storage.local.get({ lookup: null }, (d) => {
      if (d.lookup && ingest(d.lookup)) onChangeCb();
    });
    // background.js refreshes the file at most every few hours; this only wakes it up
    try { chrome.runtime.sendMessage({ type: "kkafio-lookup-refresh" }, () => void chrome.runtime.lastError); } catch {}
  }
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && c.lookup && c.lookup.newValue && ingest(c.lookup.newValue)) onChangeCb();
  });

  // Post id from a pixiv artwork link
  function postId(url) {
    const m = String(url || "").match(/\/artworks\/(\d+)/);
    return m ? Number(m[1]) : null;
  }
  function postHref(id) {
    return id && st.posts.has(id) ? fill(st.urls.post, { id }) : null;
  }

  function makeBadge(href) {
    const a = document.createElement("a");
    a._lc = true;
    a.className = "kk-badge";
    a.href = href;
    a.dataset.kk = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = "koikatsucards.com";
    a.textContent = "KK";
    return a;
  }

  // Telegram Web can't be searched through a URL, so the query is handed to telegram.js
  // (content script on web.telegram.org) through storage, then Telegram Web is opened.
  function rememberTelegramQuery(query) {
    try { chrome.storage.local.set({ tgSearch: { query, ts: Date.now() } }); } catch {}
  }

  function chip(tag, text, href, title, tgQuery) {
    const a = document.createElement("a");
    a.className = "kk-chip";
    a.href = href;
    if (tgQuery) {
      // just store the query; the link itself (target=_blank) opens Telegram Web as usual
      const store = () => rememberTelegramQuery(tgQuery);
      a.addEventListener("click", store);
      a.addEventListener("auxclick", store); // middle click
    }
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = title;
    const tg = document.createElement("span");
    tg.className = "kk-tag";
    tg.textContent = tag;
    const nm = document.createElement("span");
    nm.className = "kk-name";
    nm.textContent = text;
    a.append(tg, nm);
    return a;
  }

  // An artwork page does not say who the artist is in a stable place, so ask Pixiv's own
  // (same-origin) API once per artwork, the same request the page makes itself.
  function requestArtist(id) {
    if (pending.has(id) || artistCache.has(id)) return;
    pending.add(id);
    fetch("/ajax/illust/" + id, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => artistCache.set(id, j && j.body && j.body.userId ? String(j.body.userId) : null))
      .catch(() => artistCache.set(id, null))
      .finally(() => { pending.delete(id); onChangeCb(); });
  }

  // Chips for the current page: the post (artwork pages) and the artist (artwork and user pages)
  function pageItems() {
    const items = [];
    const art = location.pathname.match(ARTWORK_PATH);
    const usr = location.pathname.match(USER_PATH);
    let userId = null;
    if (art) {
      const href = postHref(Number(art[1]));
      if (href) items.push({ tag: "KK", text: t("kkPost"), href, title: "koikatsucards.com" });
      if (Object.keys(st.users).length) {
        userId = artistCache.get(art[1]);
        if (userId === undefined) requestArtist(art[1]);
      }
    } else if (usr) {
      userId = usr[1];
    }
    if (userId && own(st.users, userId)) {
      const u = st.users[userId];
      for (const slug of u.authors || []) {
        items.push({
          tag: "KK",
          text: own(st.authors, slug) ? st.authors[slug] : slug,
          href: fill(st.urls.author, { slug }),
          title: "koikatsucards.com",
        });
      }
      for (const name of u.bepis || []) {
        items.push({ tag: "Bepis", text: name, href: fill(st.urls.bepis, { name }), title: "db.bepis.moe" });
      }
      if (u.pawchive && u.pawchive.service && u.pawchive.id) {
        items.push({
          tag: "Pawchive",
          text: u.pawchive.service,
          href: fill(st.urls.pawchive, u.pawchive),
          title: "pawchive.pw",
        });
      }
    }
    // Telegram + KKnow: search for this Pixiv page's link (works without lookup.json)
    if (art || usr) {
      // artwork page: search by the post link; user page: search by the artist's name
      // (the link is used until the name has been fetched, or if it can't be)
      let query = art
        ? "https://www.pixiv.net/artworks/" + art[1]
        : "https://www.pixiv.net/users/" + usr[1];
      if (!art && usr) {
        const name = userNameCache.get(usr[1]);
        if (name) query = name;
        else if (name === undefined) requestUserName(usr[1]);
      }
      items.push({ tag: "Telegram", text: t("kkTelegram"), href: TELEGRAM_URL, title: "web.telegram.org", query });
      items.push({
        tag: "KKnow",
        text: t("kkTelegram"), // "Search"
        href: "https://kknow.cc/search/search/?keywords=" + encodeURIComponent(query) + "&order=date",
        title: "kknow.cc",
      });
    }
    return items;
  }

  // Pixiv's own (same-origin) API gives the artist's display name for user pages.
  function requestUserName(id) {
    const key = "u" + id;
    if (pending.has(key) || userNameCache.has(id)) return;
    pending.add(key);
    fetch("/ajax/user/" + id + "?full=0", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => userNameCache.set(id, j && j.body && typeof j.body.name === "string" && j.body.name.trim() ? j.body.name.trim() : null))
      .catch(() => userNameCache.set(id, null))
      .finally(() => { pending.delete(key); onChangeCb(); });
  }

  function removePanel() {
    if (panel) panel.remove();
    panel = null;
  }

  function syncPanel() {
    const items = pageItems();
    if (!items.length) return removePanel();
    const sig = items.map((i) => i.tag + i.href + (i.query || "")).join("|");
    if (panel && panel.isConnected && panel.dataset.sig === sig) return;
    removePanel();
    panel = document.createElement("div");
    panel._lc = true;
    panel.className = "kk-panel";
    panel.dataset.sig = sig;
    for (const i of items) panel.appendChild(chip(i.tag, i.text, i.href, i.title, i.query));
    document.body.appendChild(panel);
  }

  return {
    ready: () => st.ready,
    onChange: (fn) => { onChangeCb = fn; },
    load, ingest, postId, postHref, makeBadge, syncPanel, removePanel,
  };
})();
