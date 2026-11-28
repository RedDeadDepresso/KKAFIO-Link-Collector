// KKAFIO: archive passwords on Pawchive.
//
// The data is posts.json (https://github.com/RedDeadDepresso/kk-password-scraper). background.js
// downloads it and keeps it in chrome.storage.local["passwords"]; this file only reads it.
// Shape: { "postId": [ { "f": filename, "p": password } ] }   (postId = Pawchive post card data-id)
const PW = (() => {
  let data = null;
  let onChangeCb = () => {};

  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  function ingest(d) {
    if (!d || typeof d !== "object" || Array.isArray(d)) return false;
    data = d;
    return true;
  }

  function load() {
    chrome.storage.local.get({ passwords: null }, (d) => {
      if (d.passwords && ingest(d.passwords)) onChangeCb();
    });
    // background.js refreshes the file at most every few hours; this only wakes it up
    try { chrome.runtime.sendMessage({ type: "kkafio-passwords-refresh" }, () => void chrome.runtime.lastError); } catch {}
  }
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && c.passwords && c.passwords.newValue && ingest(c.passwords.newValue)) onChangeCb();
  });

  // [{ f, p }] for a post id, or null. The file comes from the network, so only plain strings are kept.
  function get(id) {
    if (!data || !/^\d{1,20}$/.test(String(id || "")) || !own(data, id) || !Array.isArray(data[id])) return null;
    const list = data[id].filter((e) => e && typeof e.p === "string" && e.p);
    return list.length ? list.map((e) => ({ f: typeof e.f === "string" ? e.f : "", p: e.p })) : null;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
    try { // fallback for pages where the async clipboard API is refused
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch { return false; }
  }

  // Button with a key icon. Hover shows the password(s) next to it, click copies it.
  // One password: the pill shows it. Several different ones: one row per file, each copies its own,
  // and the key itself copies the first. `up` opens the list upwards (floating button).
  function makeBtn(id, entries, floating) {
    const b = document.createElement("div");
    b._lc = true; // marks UI we own; lost when a page snapshot is cloned
    b.className = "lc-pw" + (floating ? " lc-pw-float" : "");
    b.dataset.pw = id;
    b.dataset.sig = JSON.stringify(entries);

    const key = document.createElement("button");
    key.type = "button";
    key.className = "lc-pw-key";
    key.textContent = floating ? "\u{1F511} " + t("passwordFloat") : "\u{1F511}";
    key.title = t("passwordBtnTitle");

    const pop = document.createElement("div");
    pop.className = "lc-pw-pop";

    const flash = (el) => {
      el.classList.add("lc-pw-done");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("lc-pw-done"), 1200);
    };
    const doCopy = async (text, el) => {
      if (await copy(text)) flash(el);
    };
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

    const distinct = [...new Set(entries.map((e) => e.p))];
    const rows = distinct.length > 1 ? entries : [entries[0]];
    for (const e of rows) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "lc-pw-row";
      row.title = t("passwordCopyTitle");
      if (distinct.length > 1 && e.f) {
        const f = document.createElement("span");
        f.className = "lc-pw-file";
        f.textContent = e.f;
        row.appendChild(f);
      }
      const v = document.createElement("span");
      v.className = "lc-pw-val";
      v.textContent = e.p; // textContent: a password may contain < > &
      row.appendChild(v);
      row.addEventListener("click", (ev) => { stop(ev); doCopy(e.p, row); }, true);
      pop.appendChild(row);
    }
    key.addEventListener("click", (ev) => { stop(ev); doCopy(entries[0].p, key); }, true);

    // not enough room on the right (cards at the edge of the window): open the list to the left
    if (!floating) {
      b.addEventListener("mouseenter", () => {
        const r = b.getBoundingClientRect();
        b.classList.toggle("lc-pw-flip", r.left + 28 + pop.offsetWidth + 12 > innerWidth);
      });
    }

    b.append(key, pop);
    return b;
  }

  return { onChange: (fn) => { onChangeCb = fn; }, load, get, makeBtn };
})();
