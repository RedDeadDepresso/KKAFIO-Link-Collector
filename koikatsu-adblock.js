// Runs in the page's own JS world (manifest "world": "MAIN") at document_start,
// so it executes before the site's ad scripts.
// Stops pop-under / pop-up tabs that open when you click or change page.
(() => {
  const realOpen = window.open;
  window.open = function () {
    console.debug("[KKAFIO] blocked window.open", arguments[0]);
    // Return a harmless stub so ad code doesn't throw.
    return { closed: true, close() {}, focus() {}, blur() {}, document: {} };
  };
  try { Object.defineProperty(window.open, "toString", { value: () => realOpen.toString() }); } catch (_) {}

  // Pop-unders also use synthetic <a target=_blank> clicks. Block those that
  // aren't a real user click (isTrusted === false) and that leave the site.
  document.addEventListener("click", (e) => {
    if (e.isTrusted) return;
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (a && a.target === "_blank") { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // Drop ad links the moment they appear.
  // Skip the home carousel / single-ad slots here: React owns those nodes, so
  // they are hidden with CSS instead (removing them can break hydration).
  const sweep = () => document.querySelectorAll('a[href*="/go/ad/"]').forEach((a) => {
    if (a.closest(".home-ad-carousel, .home-single-ad")) return;
    (a.closest(".nav-ad-slot, .self-sticky-ad") || a).remove();
  });
  new MutationObserver(sweep).observe(document, { childList: true, subtree: true });
})();
