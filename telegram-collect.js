// Runs on web.telegram.org (Web K). Adds a "+" button next to channel / supergroup messages;
// pressing it collects the message link (https://t.me/<username>/<id> when the channel's
// username is known, otherwise https://t.me/c/<channel id>/<id>). Press again to remove it.
(() => {
  const api = globalThis.browser ?? chrome;
  const OFFSET = 4294967296; // Web K stores channel message ids as id + 2^32
  const tr = (k, d) => { try { return (typeof t === "function" && t(k)) || d; } catch { return d; } };

  let collected = new Set();
  const getLinks = async () => (await api.storage.local.get({ links: [] })).links;

  // the open chat's public username, read from the profile sidebar when it's showing this chat
  function usernameFor(peerId) {
    const side = document.querySelector("#column-right");
    if (!side) return null;
    const name = side.querySelector(".profile-name .peer-title");
    if (!name || name.dataset.peerId !== peerId) return null;
    for (const el of side.querySelectorAll(".row-title")) {
      const m = el.textContent.trim().match(/^(?:https?:\/\/)?t\.me\/([A-Za-z][A-Za-z0-9_]{3,})$/);
      if (m) return m[1];
    }
    return null;
  }

  // returns { urls: [preferred, alternative], title } or null when the message has no link
  function info(bubble) {
    const peerId = bubble.dataset.peerId;
    const mid = Number(bubble.dataset.mid);
    if (!peerId || !/^-\d+$/.test(peerId) || !(mid >= OFFSET)) return null; // not a channel/supergroup message
    const id = mid - OFFSET, chan = peerId.slice(1);
    const user = usernameFor(peerId);
    const priv = `https://t.me/c/${chan}/${id}`;
    const urls = user ? [`https://t.me/${user}/${id}`, priv] : [priv, null];

    const chat = bubble.closest(".chat");
    const chatTitle = (chat?.querySelector(".sidebar-header .user-title") || chat?.querySelector(".peer-title"))?.textContent.trim() || "Telegram";
    const doc = bubble.querySelector(".document-name middle-ellipsis-element");
    const snip = (doc?.getAttribute("title") || doc?.textContent || bubble.querySelector(".message")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
    return { urls, title: `${chatTitle} #${id}${snip ? " – " + snip : ""}` };
  }

  function paint(btn) {
    const urls = (btn._urls || []).filter(Boolean);
    const on = urls.some((u) => collected.has(u));
    btn.classList.toggle("kk-tg-on", on);
    btn.textContent = on ? "✓" : "+";
  }

  async function toggle(btn) {
    const bubble = btn.closest(".bubble");
    const i = bubble && info(bubble);
    if (!i) return;
    btn._urls = i.urls;
    const links = await getLinks();
    const mine = i.urls.filter(Boolean);
    if (links.some((l) => mine.includes(l.url))) {
      await api.storage.local.set({ links: links.filter((l) => !mine.includes(l.url)) });
    } else {
      links.push({ url: mine[0], title: i.title, added: Date.now() });
      await api.storage.local.set({ links });
    }
  }

  function decorate(bubble) {
    if (bubble.dataset.kkTg || bubble.classList.contains("service")) return;
    const wrap = bubble.querySelector(".bubble-content-wrapper");
    const i = info(bubble);
    if (!wrap || !i) return;
    bubble.dataset.kkTg = "1";
    const b = document.createElement("button");
    b.className = "kk-tg-btn";
    b.type = "button";
    b.title = tr("collectBtnTitle", "Collect link");
    b._urls = i.urls;
    // keep Telegram from treating the press as a click on the message
    for (const ev of ["pointerdown", "mousedown", "mouseup", "pointerup", "dblclick", "contextmenu"])
      b.addEventListener(ev, (e) => e.stopPropagation(), true);
    b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggle(b); }, true);
    wrap.appendChild(b);
    paint(b);
  }

  let queued = false;
  function scan() {
    queued = false;
    document.querySelectorAll(".bubble[data-mid]:not([data-kk-tg])").forEach(decorate);
    // the username may only become known later (profile opened): refresh the link + state
    document.querySelectorAll(".kk-tg-btn").forEach((b) => {
      const bubble = b.closest(".bubble"), i = bubble && info(bubble);
      if (i) b._urls = i.urls;
      paint(b);
    });
  }
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(scan); } };

  (async () => {
    collected = new Set((await getLinks()).map((l) => l.url));
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    api.storage.onChanged.addListener((c) => {
      if (c.links) { collected = new Set((c.links.newValue || []).map((l) => l.url)); schedule(); }
    });
    schedule();
  })().catch((e) => console.log("[KKAFIO] telegram-collect error", e));
})();
