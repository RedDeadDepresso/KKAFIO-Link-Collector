// Runs on the kk-authors website (https://reddeaddepresso.github.io/kk-authors/).
// The Telegram button on each author card is a normal link to Telegram Web with the author's
// name in data-kkafio-telegram. On click, hand the name to telegram.js (through storage) so it
// is typed into Telegram's search box; the link itself still opens the tab.
(() => {
  const store = (e) => {
    const a = e.target instanceof Element ? e.target.closest("a[data-kkafio-telegram]") : null;
    const query = a && a.getAttribute("data-kkafio-telegram");
    if (!query) return;
    try { chrome.storage.local.set({ tgSearch: { query, ts: Date.now() } }); } catch {}
  };
  document.addEventListener("click", store, true);
  document.addEventListener("auxclick", store, true); // middle click
})();
