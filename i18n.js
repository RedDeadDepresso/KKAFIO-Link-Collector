// Looks up a translated string. If the browser can't resolve it (returns ""),
// falls back to the built-in English text so the UI never goes blank.
const KKAFIO_FALLBACK = {
  "extName": "KKAFIO Link Collector",
  "extDescription": "Collect buttons for Pixiv, Pawchive, Bepis & koikatsucards.com; extract Gofile/Mega/Drive/Catbox links from selected text; copy all.",
  "menuExtract": "Extract links with KKAFIO Link Collector",
  "collected": "Collected:",
  "copyAll": "Copy all",
  "copyClear": "Copy & clear",
  "clearAll": "Clear",
  "copiedN": "Copied $COUNT$",
  "nothingToCopy": "Nothing to copy",
  "confirmClear": "Remove all collected links?",
  "removeTitle": "Remove",
  "collectBtnTitle": "Collect link",
  "collectFloat": "+ Collect link",
  "collectedFloat": "✓ Collected",
  "badgeDup": "dup"
};

function t(key, ...subs) {
  let msg = "";
  try {
    msg = subs.length ? chrome.i18n.getMessage(key, subs.map(String)) : chrome.i18n.getMessage(key);
  } catch (e) {}
  if (!msg) {
    msg = KKAFIO_FALLBACK[key] || key;
    msg = msg.replace("$COUNT$", subs[0] !== undefined ? subs[0] : "");
  }
  return msg;
}
