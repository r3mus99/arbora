/* Page logic for index.html: file loading, person list, options, PDF preview. */
(function () {
  "use strict";
  const R = window.Rodostrom;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "rodostrom-options";

  let data = null;          // {people, families}
  let selectedId = null;
  let pdfUrl = null;
  let fontsPromise = null;

  // ---------------------------------------------------------------- options
  const inputs = Array.from(document.querySelectorAll("[data-opt]"));

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); } catch (e) { /* ignore */ }
  }

  function applyOptions(opts) {
    for (const el of inputs) {
      const v = opts[el.dataset.opt];
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v === undefined || v === null ? "" : v;
    }
  }

  function currentOptions() {
    const o = {};
    for (const el of inputs) {
      const k = el.dataset.opt;
      if (el.type === "checkbox") o[k] = el.checked;
      else if (el.type === "number") {
        const n = parseFloat(el.value);
        o[k] = Number.isFinite(n) ? n : R.DEFAULTS[k];
      } else o[k] = el.value;
    }
    o.generations = Math.max(0, Math.round(o.generations));
    o.fontSize = Math.min(20, Math.max(5, o.fontSize));
    return o;
  }

  const saved = readStore();
  applyOptions(Object.assign({}, R.DEFAULTS, saved.options || {}));
  inputs.forEach((el) => el.addEventListener("change", () => {
    writeStore(Object.assign(readStore(), { options: currentOptions() }));
  }));

  // ---------------------------------------------------------------- loading
  function setStatus(text, isError) {
    const s = $("status");
    s.textContent = text;
    s.classList.toggle("err", !!isError);
  }

  function loadBytes(bytes, name) {
    let parsed;
    try {
      parsed = R.load(bytes);
    } catch (e) {
      alert("Súbor sa nepodarilo načítať: " + e.message);
      return;
    }
    const count = Object.keys(parsed.people).length;
    if (!count) {
      alert("V súbore sa nenašli žiadne osoby. Je to naozaj GEDCOM?");
      return;
    }
    data = parsed;
    selectedId = null;
    $("dropText").innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = name;
    $("dropText").append(strong, ` – ${count} osôb. Kliknite pre iný súbor.`);
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
      loadBytes(await r.arrayBuffer(), "ukazka.ged (vymyslené osoby)");
    } catch (e) {
      alert("Ukážku sa nepodarilo načítať.");
    }
  });

  async function loadFonts() {
    const get = async (p) => {
      const r = await fetch(p);
      if (!r.ok) throw new Error("Písmo sa nepodarilo načítať: " + p);
      return r.arrayBuffer();
    };
    const [regular, bold] = await Promise.all([get("fonts/DejaVuSans.ttf"),
                                               get("fonts/DejaVuSans-Bold.ttf")]);
    return { regular, bold };
  }

  // ------------------------------------------------------------ person list
  const yearOf = (ev) => (ev && ev.date ? R.formatDate(ev.date, false, "sk") : "");

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
    if (found.length > LIMIT) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "name";
      td.textContent = `… a ďalších ${found.length - LIMIT}. Spresnite hľadanie.`;
      tr.append(td);
      tbody.append(tr);
    }
    if (!found.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "Nikto sa nenašiel.";
      tr.append(td);
      tbody.append(tr);
    }
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
    const p = selectedId && data.people[selectedId];
    $("chosen").textContent = p
      ? `Vybraná osoba: ${p.name} (${p.id.replace(/@/g, "")})`
      : "Kliknite na osobu v zozname.";
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
    setStatus("");
  }

  async function generate() {
    if (!data || !selectedId) return;
    const btn = $("go");
    btn.disabled = true;
    setStatus("Vytváram PDF…");
    try {
      const fonts = await (fontsPromise || (fontsPromise = loadFonts()));
      const opts = currentOptions();
      const res = await R.generate(data, selectedId, opts, fonts);
      resetResult();
      pdfUrl = URL.createObjectURL(new Blob([res.bytes], { type: "application/pdf" }));
      const a = $("download");
      a.href = pdfUrl;
      a.download = R.defaultFileName(data.people[selectedId]);
      a.hidden = false;
      const pv = $("preview");
      pv.src = pdfUrl;
      pv.style.display = "block";
      let msg = `Hotovo: ${res.pages} ${res.pages === 1 ? "strana" : res.pages < 5 ? "strany" : "strán"}, ` +
                `${res.generations} generácií.`;
      if (res.shrunk) {
        msg += ` Písmo bolo zmenšené na ${res.fontSize.toFixed(1)} pt, aby sa riadky zmestili` +
               " – skúste orientáciu na šírku alebo „len obec“.";
      }
      setStatus(msg);
    } catch (e) {
      console.error(e);
      setStatus("PDF sa nepodarilo vytvoriť: " + e.message, true);
    } finally {
      btn.disabled = !selectedId;
    }
  }

  $("go").addEventListener("click", generate);
})();
