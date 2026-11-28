// Runs on the kk-authors website (https://reddeaddepresso.github.io/kk-authors/).
// The Telegram button on each author card is a normal link to Telegram Web with the author's
// name in data-kkafio-telegram. On click, ask background.js to open Telegram Web and search for
// it (reusing an already open Telegram Web tab). Without the extension the link works as usual.
(() => {
  const go = (e) => {
    if (e.type === "click" ? e.button !== 0 : e.button !== 1) return; // left or middle click only
    const a = e.target instanceof Element ? e.target.closest("a[data-kkafio-telegram]") : null;
    const query = a && a.getAttribute("data-kkafio-telegram");
    if (!query) return;
    e.preventDefault();
    e.stopPropagation();
    // extension unreachable (e.g. just reloaded): old behaviour, the query goes through storage
    const fallback = () => {
      try { chrome.storage.local.set({ tgSearch: { query, ts: Date.now() } }); } catch {}
      try { window.open(a.href, "_blank", "noopener,noreferrer"); } catch {}
    };
    try {
      chrome.runtime.sendMessage({ type: "kkafio-open-tg", query }, (ok) => {
        if (chrome.runtime.lastError || !ok) fallback();
      });
    } catch { fallback(); }
  };
  document.addEventListener("click", go, true);
  document.addEventListener("auxclick", go, true); // middle click
})();
