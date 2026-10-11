/* Page logic for index.html: language, file loading, person list, options, PDF preview. */
(function () {
  "use strict";
  const R = window.Rodostrom;
  const { STRINGS, ORDER, flag, detect } = window.I18N;
  const $ = (id) => document.getElementById(id);
  const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  const STORE_KEY = "rodostrom-options";

  let data = null;          // {people, families}
  let loadedName = "";      // file name, or null key for the sample
  let selectedId = null;
  let pdfUrl = null;
  let fontsPromise = null;
  let status = null;        // {key, vars, err} so it can be re-translated

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------- language
  let lang = readStore().lang;
  if (!STRINGS[lang]) lang = detect();
  const t = (key, vars) => fmt(STRINGS[lang][key] || STRINGS.en[key] || key, vars || {});

  function renderLanguageMenu() {
    const menu = $("langMenu");
    menu.textContent = "";
    for (const code of ORDER) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(code === lang));
      b.dataset.lang = code;
      b.innerHTML = flag(code);
      b.append(STRINGS[code].name);
      li.append(b);
      menu.append(li);
    }
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    document.title = "Rodostrom – GEDCOM → PDF";
    $("langFlag").innerHTML = flag(lang);
    $("langName").textContent = STRINGS[lang].name;
    $("langBtn").title = t("language");
    $("langBtn").setAttribute("aria-label", `${t("language")}: ${STRINGS[lang].name}`);
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    // label choices show the actual abbreviations of this language
    const ab = R.TEXTS[lang].abbr;
    const labels = document.querySelector('[data-opt="labels"]');
    labels.options[0].textContent = `${t("symbols")}  * ∞ †`;
    labels.options[1].textContent = `${t("abbr")}  ${ab.birt}${ab.marr}${ab.deat}`.trim();
    $("preview").title = t("preview");
    renderDrop();
    syncChart();
    renderLanguageMenu();
    if (data) { renderList(); updateChosen(); }
    renderStatus();
  }

  function setLanguage(code) {
    lang = code;
    writeStore(Object.assign(readStore(), { lang }));
    applyLanguage();
  }

  const langBtn = $("langBtn"), langMenu = $("langMenu");
  function toggleMenu(open) {
    langMenu.hidden = !open;
    langBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      const cur = langMenu.querySelector('[aria-selected="true"]');
      if (cur) cur.focus();
    }
  }
  langBtn.addEventListener("click", () => toggleMenu(langMenu.hidden));
  langMenu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lang]");
    if (!b) return;
    toggleMenu(false);
    setLanguage(b.dataset.lang);
    langBtn.focus();
  });
  langMenu.addEventListener("keydown", (e) => {
    const items = Array.from(langMenu.querySelectorAll("button"));
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  document.addEventListener("click", (e) => {
    if (!langMenu.hidden && !e.target.closest(".lang")) toggleMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !langMenu.hidden) { toggleMenu(false); langBtn.focus(); }
  });

  // ---------------------------------------------------------------- options
  const inputs = Array.from(document.querySelectorAll("[data-opt]"));

  function applyOptions(opts) {
    for (const el of inputs) {
      const v = opts[el.dataset.opt];
      if (el.type === "radio") el.checked = el.value === v;
      else if (el.type === "checkbox") el.checked = !!v;
      else el.value = v === undefined || v === null ? "" : v;
    }
  }

  function currentOptions() {
    const o = {};
    for (const el of inputs) {
      const k = el.dataset.opt;
      if (el.type === "radio") { if (el.checked) o[k] = el.value; }
      else if (el.type === "checkbox") o[k] = el.checked;
      else if (el.type === "number") {
        const n = parseFloat(el.value);
        o[k] = Number.isFinite(n) ? n : R.DEFAULTS[k];
      } else o[k] = el.value;
    }
    o.generations = Math.max(0, Math.round(o.generations));
    o.fontSize = Math.min(20, Math.max(5, o.fontSize));
    o.lang = lang;
    return o;
  }

  // numbering choices and some options depend on the chart type
  const numbering = document.querySelector('[data-opt="numbering"]');
  const NUMBERING = {
    ancestors: [["generation", "numGen"], ["ahnentafel", "numAhn"], ["none", "numNone"]],
    descendants: [["generation", "numGen"], ["daboville", "numDab"], ["none", "numNone"]],
  };
  function syncChart() {
    const chart = currentOptions().chart || "ancestors";
    const desc = chart === "descendants";
    document.querySelectorAll(".only-anc").forEach((el) => { el.hidden = desc; });
    document.querySelectorAll(".only-desc").forEach((el) => { el.hidden = !desc; });
    let cur = numbering.value;
    if (desc && cur === "ahnentafel") cur = "daboville";
    if (!desc && cur === "daboville") cur = "ahnentafel";
    numbering.textContent = "";
    for (const [v, key] of NUMBERING[chart]) numbering.add(new Option(t(key), v, false, v === cur));
  }

  const saved = readStore();
  applyOptions(Object.assign({}, R.DEFAULTS, saved.options || {}));
  inputs.forEach((el) => el.addEventListener("change", () => {
    if (el.dataset.opt === "chart") { syncChart(); resetResult(); }
    writeStore(Object.assign(readStore(), { options: currentOptions() }));
  }));

  // ---------------------------------------------------------------- loading
  function setStatus(key, vars, err) {
    status = key ? { key, vars: vars || {}, err: !!err } : null;
    renderStatus();
  }
  function renderStatus() {
    const s = $("status");
    if (!status) { s.textContent = ""; s.classList.remove("err"); return; }
    let text = t(status.key, status.vars);
    if (status.key === "done" && status.vars.shrunkSize) {
      text += " " + t("shrunk", { size: status.vars.shrunkSize });
    }
    s.textContent = text;
    s.classList.toggle("err", status.err);
  }

  function renderDrop() {
    const box = $("dropText");
    box.textContent = "";
    if (!data) { box.innerHTML = t("drop"); return; }
    const strong = document.createElement("strong");
    strong.textContent = loadedName === null ? t("sampleName") : loadedName;
    box.append(strong, " – " + t("loaded", { count: Object.keys(data.people).length }));
  }

  function loadBytes(bytes, name) {
    let parsed;
    try {
      parsed = R.load(bytes);
    } catch (e) {
      alert(t("errLoad", { msg: e.message }));
      return;
    }
    if (!Object.keys(parsed.people).length) {
      alert(t("errEmpty"));
      return;
    }
    data = parsed;
    loadedName = name;
    selectedId = null;
    renderDrop();
    ["personPanel", "optPanel", "goPanel"].forEach((id) => { $(id).hidden = false; });
    $("search").value = "";
    renderList();
    const last = readStore().root;
    if (last && data.people[last]) select(last, true);
    else updateChosen();
    resetResult();
    if (!fontsPromise) fontsPromise = loadFonts();
  }

  $("file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) f.arrayBuffer().then((b) => loadBytes(b, f.name));
    e.target.value = "";
  });

  const drop = $("drop");
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add("over");
  }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.remove("over");
  }));
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) f.arrayBuffer().then((b) => loadBytes(b, f.name));
  });

  $("sample").addEventListener("click", async () => {
    try {
      const r = await fetch("ukazka.ged");
      if (!r.ok) throw new Error(r.status);
      loadBytes(await r.arrayBuffer(), null);
    } catch (e) {
      alert(t("errSample"));
    }
  });

  async function loadFonts() {
    const get = async (p) => {
      const r = await fetch(p);
      if (!r.ok) throw new Error(p);
      return r.arrayBuffer();
    };
    const [regular, bold] = await Promise.all([get("fonts/DejaVuSans.ttf"),
                                               get("fonts/DejaVuSans-Bold.ttf")]);
    return { regular, bold };
  }

  // ------------------------------------------------------------ person list
  const yearOf = (ev) => (ev && ev.date ? R.formatDate(ev.date, false, lang) : "");

  function messageRow(tbody, text) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "name";
    td.textContent = text;
    tr.append(td);
    tbody.append(tr);
  }

  function renderList() {
    const q = $("search").value.trim();
    const found = q ? R.findPeople(q, data.people) : Object.values(data.people);
    found.sort((a, b) => R.fold(a.name).localeCompare(R.fold(b.name)));
    const tbody = $("list");
    tbody.textContent = "";
    const LIMIT = 500;
    for (const p of found.slice(0, LIMIT)) {
      const tr = document.createElement("tr");
      tr.dataset.id = p.id;
      if (p.id === selectedId) tr.className = "sel";
      const cells = [[p.id.replace(/@/g, ""), "num hide-sm"], [p.name || "?", "name"],
                     [yearOf(p.birth), "num"], [yearOf(p.death), "num hide-sm"]];
      for (const [text, cls] of cells) {
        const td = document.createElement("td");
        td.textContent = text;
        td.className = cls;
        tr.append(td);
      }
      tbody.append(tr);
    }
    if (found.length > LIMIT) messageRow(tbody, t("more", { n: found.length - LIMIT }));
    if (!found.length) messageRow(tbody, t("noneFound"));
  }

  function select(id, scroll) {
    selectedId = id;
    for (const tr of $("list").querySelectorAll("tr")) {
      tr.classList.toggle("sel", tr.dataset.id === id);
      if (scroll && tr.dataset.id === id) tr.scrollIntoView({ block: "nearest" });
    }
    writeStore(Object.assign(readStore(), { root: id }));
    updateChosen();
  }

  function updateChosen() {
    const p = selectedId && data && data.people[selectedId];
    $("chosen").textContent = p
      ? t("chosen", { name: p.name, id: p.id.replace(/@/g, "") })
      : t("choose");
    $("go").disabled = !p;
  }

  $("search").addEventListener("input", renderList);
  $("list").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) select(tr.dataset.id);
  });
  $("list").addEventListener("dblclick", (e) => {
    if (e.target.closest("tr[data-id]")) generate();
  });

  // ---------------------------------------------------------------- generate
  function resetResult() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = null;
    $("download").hidden = true;
    $("preview").style.display = "none";
    setStatus(null);
  }

  function fileName(person, chart) {
    const word = t(chart === "descendants" ? "fileDesc" : "fileAnc");
    return `${R.fold(person.name).replace(/[^\w.-]+/g, "_")}_${word}.pdf`;
  }

  async function generate() {
    if (!data || !selectedId) return;
    const btn = $("go");
    btn.disabled = true;
    setStatus("working");
    try {
      const fonts = await (fontsPromise || (fontsPromise = loadFonts()));
      const opts = currentOptions();
      const res = await R.generate(data, selectedId, opts, fonts);
      resetResult();
      pdfUrl = URL.createObjectURL(new Blob([res.bytes], { type: "application/pdf" }));
      const a = $("download");
      a.href = pdfUrl;
      a.download = fileName(data.people[selectedId], opts.chart);
      a.hidden = false;
      const pv = $("preview");
      pv.src = pdfUrl;
      pv.style.display = "block";
      setStatus("done", { pages: res.pages, gens: res.generations,
                          shrunkSize: res.shrunk ? res.fontSize.toFixed(1) : "" });
    } catch (e) {
      console.error(e);
      fontsPromise = null;
      setStatus("errPdf", { msg: e.message }, true);
    } finally {
      btn.disabled = !selectedId;
    }
  }

  $("go").addEventListener("click", generate);

  applyLanguage();
})();
