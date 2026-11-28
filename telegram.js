// Runs on web.telegram.org (Web K). When the user clicked the "Telegram" chip on a Pixiv page,
// kk.js stored the query in storage.local["tgSearch"]; open Telegram's search and type it in.
(() => {
  const api = globalThis.browser ?? chrome;
  const LOG = (...a) => console.log("[KKAFIO]", ...a);
  const MAX_AGE = 5 * 60 * 1000;   // ignore stale requests
  const MAX_WAIT = 5 * 60 * 1000;  // the user may still have to log in

  const INPUT = "input.input-search-input";
  const TRIGGER = ".sidebar-header-search-trigger button";
  const ACTIVE = ".sidebar-slider-item.item-main.is-search-active"; // set by Telegram while search is open

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => !!el && el.getClientRects().length > 0;
  const searchOpen = () => !!document.querySelector(ACTIVE);

  // Telegram listens to real mouse/keyboard events; replay the whole sequence on the element.
  function mouseClick(el) {
    const o = { bubbles: true, cancelable: true, composed: true, view: window, button: 0, buttons: 1 };
    for (const t of ["pointerdown", "mousedown"]) el.dispatchEvent(new MouseEvent(t, o));
    el.focus();
    for (const t of ["pointerup", "mouseup", "click"]) el.dispatchEvent(new MouseEvent(t, { ...o, buttons: 0 }));
  }
  function pressEnter(el) {
    const o = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
    for (const t of ["keydown", "keypress", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, o));
  }
  function setValue(input, text) {
    input.focus();
    input.select();
    try { document.execCommand("insertText", false, text); } catch {}
    if (input.value !== text) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return input.value === text;
  }
  async function waitFor(fn, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(150); }
    return null;
  }

  let busy = false; // one search at a time

  // search for `query` in Telegram's search box
  async function search(query) {
    if (busy) return LOG("search already running");
    busy = true;
    try {
      LOG("pending search:", query);

      // wait for the app (and a login, if needed)
      const input = await waitFor(() => { const i = document.querySelector(INPUT); return visible(i) ? i : null; }, MAX_WAIT);
      if (!input) return LOG("gave up: search input never appeared");
      await sleep(500); // let the app finish wiring its handlers

      // 1) open the search panel (what a real click on the box does)
      for (const step of [() => mouseClick(input), () => document.querySelector(TRIGGER)?.click(), () => input.focus()]) {
        step();
        if (await waitFor(searchOpen, 1200)) break;
      }
      LOG("search panel open:", searchOpen());

      // 2) Enter in the empty box, as done by hand
      const box = document.querySelector(INPUT) || input;
      pressEnter(box);
      await sleep(400);

      // 3) type the link, 4) Enter
      for (let i = 0; i < 6; i++) {
        const el = document.querySelector(INPUT) || box;
        if (setValue(el, query)) {
          LOG("search text set");
          await sleep(400);
          pressEnter(el);
          return LOG("pressed Enter");
        }
        await sleep(300);
      }
      LOG("could not set the search text");
    } finally {
      busy = false;
    }
  }

  // Telegram Web was just opened by the Telegram chip: the query is waiting in storage
  async function run() {
    LOG("telegram.js loaded");
    const { tgSearch } = await api.storage.local.get({ tgSearch: null });
    if (!tgSearch || !tgSearch.query || Date.now() - tgSearch.ts > MAX_AGE) return LOG("nothing to search");
    await api.storage.local.remove("tgSearch"); // one-shot
    await search(tgSearch.query);
  }

  // Telegram Web was already open: background.js asks for the search directly
  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "kkafio-tg-search" && typeof msg.query === "string" && msg.query.trim()) {
      search(msg.query).catch((e) => LOG("error", e));
      sendResponse(true); // answer now; the search itself can take a while (login)
    }
  });

  run().catch((e) => LOG("error", e));
})();
