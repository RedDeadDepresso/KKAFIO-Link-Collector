// Runs on every page. Remembers the element you last right-clicked so the
// extension can read URLs from it (onclick="window.open('...')", data-href, <a href>, ...).
(() => {
  const api = globalThis.browser ?? chrome;
  let target = null;
  addEventListener("contextmenu", (e) => { target = e.target; }, true);

  const SKIP = /^(style|class|src|srcset|d|viewbox|points|transform)$/i;
  function scan(el, out) {
    if (!el || el.nodeType !== 1) return;
    for (const attr of el.attributes) {
      if (SKIP.test(attr.name)) continue;
      const v = attr.value.replace(/\\\//g, "/"); // JS-escaped slashes
      for (const m of v.matchAll(/https?:\/\/[^\s<>"'`\\]+/gi)) {
        out.add(m[0].replace(/[.,;:!?)\]}>]+$/, ""));
      }
    }
  }

  function urlsFromTarget() {
    const out = new Set();
    if (!target || !target.isConnected) return [];
    // the clicked element and its parents (e.g. the <svg> or text inside a <button>)
    for (let p = target, n = 0; p && p !== document.body && p !== document.documentElement && n < 5; p = p.parentElement, n++) {
      scan(p, out);
      if (p.href && /^https?:/i.test(p.href)) out.add(p.href);
    }
    // clicked a wrapper around the button? look inside it (bounded)
    if (!out.size) {
      let seen = 0;
      for (const c of target.querySelectorAll("*")) {
        if (++seen > 200) break;
        scan(c, out);
        if (c.href && /^https?:/i.test(c.href)) out.add(c.href);
      }
    }
    return [...out];
  }

  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === "kkafio-get-target-urls") sendResponse(urlsFromTarget());
  });
})();
