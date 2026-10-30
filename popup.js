const $ = (id) => document.getElementById(id);
document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
document.title = t("extName");
const get = () => new Promise((r) => chrome.storage.local.get({ links: [] }, (d) => r(d.links)));

async function render() {
  const links = await get();
  $("count").textContent = links.length;
  const ul = $("list"); ul.innerHTML = "";
  links.forEach((l, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = l.url; a.textContent = l.url; a.target = "_blank"; a.title = l.title || l.url;
    const x = document.createElement("button");
    x.textContent = "✕"; x.title = t("removeTitle");
    x.onclick = async () => { links.splice(i, 1); await chrome.storage.local.set({ links }); render(); };
    li.append(a, x); ul.append(li);
  });
}

function flash(t) { $("msg").textContent = t; setTimeout(() => ($("msg").textContent = ""), 1500); }

async function copy(clear) {
  const links = await get();
  if (!links.length) return flash(t("nothingToCopy"));
  await navigator.clipboard.writeText(links.map((l) => l.url).join("\n"));
  flash(t("copiedN", String(links.length)));
  if (clear) { await chrome.storage.local.set({ links: [] }); render(); }
}

$("copy").onclick = () => copy(false);
$("copyClear").onclick = () => copy(true);
$("clear").onclick = async () => {
  if (confirm(t("confirmClear"))) { await chrome.storage.local.set({ links: [] }); render(); }
};
chrome.storage.onChanged.addListener(render);
render();
