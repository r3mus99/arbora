import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { chartRows } from "../core/chart";
import { ArrowDownFromLine, ArrowLeft, ArrowRight, ArrowUpFromLine, ChevronDown, FileDown, FileText, FileUp, Loader2,
         Redo2, Search, Settings, TreeDeciduous, Undo2 } from "lucide-react";
import { collapseAt, reveal, visibleRows } from "../core/collapse";
import { DEFAULTS, fmt, type ChartKind, type ChartOptions } from "../core/format";
import { lineEnding, writeGedcom } from "../core/edit";
import { decode, fold, parseGedcom, readRecords, type GedNode, type GedcomData } from "../core/gedcom";
import type { Fonts } from "../core/pdf";
import { TEXTS, type Lang } from "../core/texts";
import { STRINGS, detect, isLang, type StringKey } from "./i18n";
import { LanguageMenu } from "./LanguageMenu";
import { PersonDetail } from "./PersonDetail";
import { PersonEditor } from "./PersonEditor";
import { PersonList } from "./PersonList";
import { readStore, updateStore } from "./store";
import { TreeView } from "./TreeView";

type Vars = Record<string, string | number>;
const fill = (s: string, vars: Vars) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));

/** Options as edited in the form; number fields keep the typed text. */
type Form = Omit<ChartOptions, "generations" | "fontSize"> & { generations: string; fontSize: string };

const toForm = (o: ChartOptions): Form =>
  ({ ...o, generations: String(o.generations), fontSize: String(o.fontSize) });

function toOptions(f: Form, lang: Lang): ChartOptions {
  const num = (v: string, d: number) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  return {
    ...f, lang,
    generations: Math.max(0, Math.round(num(f.generations, DEFAULTS.generations))),
    fontSize: Math.min(20, Math.max(5, num(f.fontSize, DEFAULTS.fontSize))),
  };
}

const NUMBERING: Record<ChartKind, [ChartOptions["numbering"], StringKey][]> = {
  ancestors: [["generation", "numGen"], ["ahnentafel", "numAhn"], ["none", "numNone"]],
  descendants: [["generation", "numGen"], ["daboville", "numDab"], ["none", "numNone"]],
};

interface Status { key: StringKey; vars: Vars; err: boolean }
/** one step of the browsing history: whose chart and who is in the detail */
interface Place { root: string; focus: string }
/** collapsed branches of one chart (`key`) */
interface Folding { key: string; paths: ReadonlySet<string> }
const NO_PATHS: ReadonlySet<string> = new Set();
/** the loaded file: its records (replaced, never changed in place, by edits) and line ending */
interface Doc { records: GedNode[]; eol: string }
/** edit history; `saved` is the version last loaded or downloaded */
interface Edits { past: Doc[]; future: Doc[]; saved: Doc | null }
const NO_EDITS: Edits = { past: [], future: [], saved: null };

/** Hand a file to the browser as a download. */
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadFonts(): Promise<Fonts> {
  const get = async (p: string) => {
    const r = await fetch(import.meta.env.BASE_URL + p);
    if (!r.ok) throw new Error(p);
    return r.arrayBuffer();
  };
  const [regular, bold] = await Promise.all([get("fonts/DejaVuSans.ttf"), get("fonts/DejaVuSans-Bold.ttf")]);
  return { regular, bold };
}

export function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = readStore().lang;
    return isLang(l) ? l : detect();
  });
  const [form, setForm] = useState<Form>(() => toForm({ ...DEFAULTS, ...readStore().options }));
  const [doc, setDoc] = useState<Doc | null>(null);
  const [edits, setEdits] = useState<Edits>(NO_EDITS);
  const data = useMemo(() => (doc ? readRecords(doc.records) : null), [doc]);
  // person whose facts are being edited in the detail panel
  const [editId, setEditId] = useState<string | null>(null);
  // file name, or null for the sample
  const [loadedName, setLoadedName] = useState<string | null>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  // person shown in the detail panel next to the on-screen chart
  const [focusId, setFocusId] = useState<string | null>(null);
  const [treeScroll, setTreeScroll] = useState(0);
  // row to scroll to and highlight after "see no. X"
  const [jumpRow, setJumpRow] = useState<number | null>(null);
  const [folding, setFolding] = useState<Folding>({ key: "", paths: NO_PATHS });
  const [hist, setHist] = useState<{ list: Place[]; at: number }>({ list: [], at: -1 });
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const fonts = useRef<Promise<Fonts> | null>(null);

  const t = useCallback((key: StringKey, vars: Vars = {}) =>
    fill(STRINGS[lang][key] || STRINGS.en[key] || key, vars), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = "Arbora – GEDCOM";
  }, [lang]);

  const changeLang = (code: Lang) => {
    setLang(code);
    updateStore({ lang: code });
  };

  // ------------------------------------------------------------ options
  const setOpt = <K extends keyof Form>(key: K, value: Form[K]) => {
    const next = { ...form, [key]: value };
    if (key === "chart") {
      // numbering choices differ between the chart kinds
      if (value === "descendants" && next.numbering === "ahnentafel") next.numbering = "daboville";
      if (value === "ancestors" && next.numbering === "daboville") next.numbering = "ahnentafel";
      resetResult();
    }
    setForm(next);
    updateStore({ options: toOptions(next, lang) });
  };
  const desc = form.chart === "descendants";

  // ------------------------------------------------------------ result
  const resetResult = () => setStatus(null);

  const fileName = (name: string, chart: ChartKind) =>
    `${fold(name).replace(/[^\w.-]+/g, "_")}_${t(chart === "descendants" ? "fileDesc" : "fileAnc")}.pdf`;

  async function create(id = selectedId) {
    if (!data || !id || busy) return;
    setBusy(true);
    setStatus({ key: "working", vars: {}, err: false });
    try {
      const f = await (fonts.current || (fonts.current = loadFonts()));
      // pdf-lib is large, so it loads only when the first PDF is made
      const { generate } = await import("../core/pdf");
      const opts = toOptions(form, lang);
      const res = await generate(data, id, opts, f);
      saveFile(new Blob([res.bytes as BlobPart], { type: "application/pdf" }),
               fileName(data.people[id].name, opts.chart));
      setStatus({ key: "done", err: false, vars: {
        pages: res.pages, gens: res.generations, shrunkSize: res.shrunk ? res.fontSize.toFixed(1) : "" } });
    } catch (e) {
      console.error(e);
      fonts.current = null;
      setStatus({ key: "errPdf", vars: { msg: (e as Error).message }, err: true });
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------ loading
  function loadBytes(bytes: ArrayBuffer, name: string | null) {
    let parsed: GedcomData, next: Doc;
    try {
      const text = decode(bytes);
      next = { records: parseGedcom(text), eol: lineEnding(text) };
      parsed = readRecords(next.records);
    } catch (e) {
      alert(t("errLoad", { msg: (e as Error).message }));
      return;
    }
    if (!Object.keys(parsed.people).length) {
      alert(t("errEmpty"));
      return;
    }
    setDoc(next);
    setEdits({ past: [], future: [], saved: next });
    setEditId(null);
    setLoadedName(name);
    setQuery("");
    const last = readStore().root;
    // the chart shows at once: last chosen person, else the first one in the file
    const root = last && parsed.people[last] ? last : Object.keys(parsed.people)[0];
    setSelectedId(root);
    setFocusId(root);
    setJumpRow(null);
    setHist({ list: [{ root, focus: root }], at: 0 });
    setScrollKey((k) => k + 1);
    setTreeScroll((k) => k + 1);
    resetResult();
    if (!fonts.current) fonts.current = loadFonts();
    import("../core/pdf").catch(() => { /* retried when the PDF is made */ });
  }

  const dirty = !!doc && doc !== edits.saved;
  const keepEdits = () => !dirty || confirm(t("discard"));

  const openFile = (f: File | undefined) => {
    if (f && keepEdits()) f.arrayBuffer().then((b) => loadBytes(b, f.name));
  };

  const loadSample = async () => {
    if (!keepEdits()) return;
    try {
      const r = await fetch(import.meta.env.BASE_URL + "ukazka.ged");
      if (!r.ok) throw new Error(String(r.status));
      loadBytes(await r.arrayBuffer(), null);
    } catch {
      alert(t("errSample"));
    }
  };

  const onDrag = (e: DragEvent, on: boolean) => { e.preventDefault(); setOver(on); };

  // ------------------------------------------------------------ editing
  const recordOf = useMemo(() => new Map((doc?.records || []).filter((r) => r.xref).map((r) => [r.xref!, r])), [doc]);
  useEffect(() => setEditId(null), [focusId]);

  /** a new version of the file with the changed records; one step of undo */
  const commit = (changed: GedNode[]) => {
    setEditId(null);
    if (!doc || !changed.length) return;
    const by = new Map(changed.map((r) => [r.xref, r]));
    setEdits({ ...edits, past: [...edits.past, doc].slice(-200), future: [] });
    setDoc({ ...doc, records: doc.records.map((r) => (r.xref && by.get(r.xref)) || r) });
    resetResult();
  };
  const undoRedo = (step: -1 | 1) => {
    const next = step < 0 ? edits.past[edits.past.length - 1] : edits.future[0];
    if (!doc || !next) return;
    setEdits(step < 0 ? { ...edits, past: edits.past.slice(0, -1), future: [doc, ...edits.future] }
                      : { ...edits, past: [...edits.past, doc], future: edits.future.slice(1) });
    setDoc(next);
    setEditId(null);
    resetResult();
  };
  const undoRef = useRef(undoRedo);
  undoRef.current = undoRedo;

  const gedName = (loadedName || "ukazka").replace(/\.(ged|gedcom)$/i, "") + ".ged";
  const downloadGedcom = () => {
    if (!doc) return;
    saveFile(new Blob([writeGedcom(doc.records, doc.eol)], { type: "text/plain;charset=utf-8" }), gedName);
    setEdits({ ...edits, saved: doc });
  };

  useEffect(() => {
    if (!dirty) return;
    // the browser asks before leaving the page with unsaved changes
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const remember = (place: Place) => setHist((h) => {
    const cur = h.list[h.at];
    if (cur && cur.root === place.root && cur.focus === place.focus) return h;
    const list = [...h.list.slice(0, h.at + 1), place].slice(-200);
    return { list, at: list.length - 1 };
  });

  const select = (id: string) => {
    setSelectedId(id);
    setFocusId(id);
    setJumpRow(null);
    setTreeScroll((k) => k + 1);
    updateStore({ root: id });
    remember({ root: id, focus: id });
  };
  const chosen = selectedId && data ? data.people[selectedId] : null;

  // ------------------------------------------------------------ on-screen chart
  const rows = useMemo(() => (data && chosen ? chartRows(data, chosen.id, toOptions(form, lang)) : []),
                       [data, chosen, form, lang]);
  // collapsed branches belong to one chart; another person or chart kind starts fully expanded
  const treeKey = chosen ? `${form.chart}|${chosen.id}` : "";
  const paths = folding.key === treeKey ? folding.paths : NO_PATHS;
  const setPaths = (next: ReadonlySet<string>) => setFolding({ key: treeKey, paths: next });
  const shown = useMemo(() => visibleRows(rows, paths), [rows, paths]);

  /** open the collapsed branches that hide a person's (first) row */
  const showPerson = (id: string) => {
    const row = rows.find((r) => !r.dup && (r.personId ?? r.spouseId) === id);
    if (row && paths.size) setPaths(reveal(paths, row.path));
  };
  const focus = (id: string, scroll: boolean) => {
    setFocusId(id);
    setJumpRow(null);
    if (scroll) {
      showPerson(id);
      setTreeScroll((k) => k + 1);
    }
    if (chosen) remember({ root: chosen.id, focus: id });
  };
  const jump = (index: number) => {
    const target = rows[index];
    if (!target || !chosen) return;
    setPaths(reveal(paths, target.path));
    setFocusId(target.personId);
    setJumpRow(index);
    setTreeScroll((k) => k + 1);
    if (target.personId) remember({ root: chosen.id, focus: target.personId });
  };
  const toggle = (row: { path: string; gen: number; hidden: number }, whole: boolean) => {
    const next = new Set(paths);
    const same = whole ? [...collapseAt(rows, row.gen)] : [row.path];
    for (const p of same) if (row.hidden) next.delete(p); else next.add(p);
    setPaths(next);
  };

  const move = (step: number) => {
    const place = hist.list[hist.at + step];
    if (!place || !data?.people[place.root]) return;
    setHist({ ...hist, at: hist.at + step });
    setSelectedId(place.root);
    setFocusId(place.focus);
    setJumpRow(null);
    updateStore({ root: place.root });
    if (place.root === chosen?.id) showPerson(place.focus);
    setTreeScroll((k) => k + 1);
  };
  const canBack = hist.at > 0, canForward = hist.at < hist.list.length - 1;
  const moveRef = useRef(move);
  moveRef.current = move;
  useEffect(() => {
    // Alt + arrow, as in the browser; Ctrl+Z / Ctrl+Y
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+Z / Ctrl+Y undo the edits, except in a text field, where they undo typing
      const field = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !field && (key === "z" || key === "y")) {
        e.preventDefault();
        undoRef.current(key === "y" || e.shiftKey ? 1 : -1);
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      e.preventDefault();
      moveRef.current(e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const makeRoot = (id: string) => {
    select(id);
    setScrollKey((k) => k + 1);
  };

  // ------------------------------------------------------------ status text
  let statusText = "";
  if (status) {
    statusText = t(status.key, status.vars);
    if (status.key === "done" && status.vars.shrunkSize) {
      statusText += " " + t("shrunk", { size: status.vars.shrunkSize });
    }
  }

  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => setOpt(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "showDate") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => setOpt(key, e.target.checked),
  });

  const pick = (id: string) => {
    select(id);
    setQuery("");
  };
  const chartTitle = chosen
    ? fmt(TEXTS[lang][desc ? "titleDesc" : "title"], { name: chosen.name || "?" }) : "";

  return (
    <main className={data ? "loaded" : undefined}>
      <header className="top">
        <div>
          <h1><TreeDeciduous className="logo" aria-hidden="true" />Arbora</h1>
          {!data && <p className="lead">{t("lead")} {t("leadEdit")}</p>}
        </div>
        <LanguageMenu lang={lang} label={t("language")} onChange={changeLang} />
      </header>

      <section className={data ? "file compact" : "panel file"}>
        <label className={over ? "drop over" : "drop"}
               onDragEnter={(e) => onDrag(e, true)} onDragOver={(e) => onDrag(e, true)}
               onDragLeave={(e) => onDrag(e, false)}
               onDrop={(e) => { onDrag(e, false); openFile(e.dataTransfer.files[0]); }}>
          <input type="file" accept=".ged,.GED,.gedcom,text/plain" hidden
                 onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} />
          <FileUp className="icon" aria-hidden="true" />
          {data
            ? <div><strong>{loadedName === null ? t("sampleName") : loadedName}</strong>
                {" – " + t("loaded", { count: Object.keys(data.people).length })}</div>
            : <div dangerouslySetInnerHTML={{ __html: t("drop") }} />}
        </label>
        {data && <div className="edits">
          <button type="button" className="icon-btn" disabled={!edits.past.length} onClick={() => undoRedo(-1)}
                  title={`${t("undo")} (Ctrl+Z)`} aria-label={t("undo")}><Undo2 className="icon" aria-hidden="true" /></button>
          <button type="button" className="icon-btn" disabled={!edits.future.length} onClick={() => undoRedo(1)}
                  title={`${t("redo")} (Ctrl+Y)`} aria-label={t("redo")}><Redo2 className="icon" aria-hidden="true" /></button>
          <button type="button" onClick={downloadGedcom}
                  title={t("exportTip")}>
            <FileDown className="icon" aria-hidden="true" />{t("exportGed")}</button>
          <button type="button" className="primary" disabled={busy} onClick={() => create()}>
            {busy ? <Loader2 className="icon spin" aria-hidden="true" /> : <FileText className="icon" aria-hidden="true" />}
            {t("go")}</button>
          {dirty && <span className="unsaved">{t("unsaved")}</span>}
        </div>}
        {data && statusText && <p className={status?.err ? "status err" : "status"}>{statusText}</p>}
        {!data && <p className="note"><span>{t("privacy")}</span>{" "}
          <button className="link" type="button" onClick={loadSample}>{t("sample")}</button></p>}
      </section>

      {data && chosen && <>
        <div className="seg" role="radiogroup">
          <label><input type="radio" name="chart" value="ancestors" checked={form.chart === "ancestors"}
                        onChange={() => setOpt("chart", "ancestors")} />
            <span><ArrowUpFromLine className="icon" aria-hidden="true" />
              <span><b>{t("anc")}</b><small>{t("ancDesc1")}<br />{t("ancDesc2")}</small></span></span></label>
          <label><input type="radio" name="chart" value="descendants" checked={desc}
                        onChange={() => setOpt("chart", "descendants")} />
            <span><ArrowDownFromLine className="icon" aria-hidden="true" />
              <span><b>{t("desc")}</b><small>{t("descDesc1")}<br />{t("descDesc2")}</small></span></span></label>
        </div>

        <section className="panel chart">
          <div className="chart-head">
            <div className="nav">
              <button type="button" className="icon-btn" disabled={!canBack} onClick={() => move(-1)}
                      title={`${t("back")} (Alt+←)`} aria-label={t("back")}>
                <ArrowLeft className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn" disabled={!canForward} onClick={() => move(1)}
                      title={`${t("forward")} (Alt+→)`} aria-label={t("forward")}>
                <ArrowRight className="icon" aria-hidden="true" /></button>
              <h2>{chartTitle}</h2>
            </div>
            <div className="finder">
              <Search className="icon" aria-hidden="true" />
              <input type="search" placeholder={t("search")} autoComplete="off" value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} />
              {query.trim() && <div className="found">
                <PersonList people={data.people} query={query} lang={lang} selectedId={selectedId}
                            scrollKey={scrollKey} onSelect={pick} t={t} />
              </div>}
            </div>
          </div>
          <p className="note tree-hint">{t("treeHint")}</p>
          <div className="viewer">
            <TreeView rows={shown} focusId={focusId} scrollKey={treeScroll} scrollTo={jumpRow}
                      numbered={form.numbering === "ahnentafel" || form.numbering === "daboville"}
                      onFocus={(id) => focus(id, false)} onToggle={toggle}
                      onJump={(r) => jump(r.targetIndex)} t={t} />
            {focusId && <PersonDetail data={data} id={focusId} rootId={chosen.id} lang={lang}
                                      onFocus={(id) => focus(id, true)} onMakeRoot={makeRoot}
                                      onEdit={() => setEditId(focusId)} t={t}
                                      editor={editId === focusId && recordOf.has(focusId) &&
                                        <PersonEditor key={focusId} data={data} record={recordOf.get(focusId)!}
                                                      families={data.people[focusId].fams
                                                        .map((f) => recordOf.get(f)).filter((r) => !!r)}
                                                      lang={lang} onSave={commit} onCancel={() => setEditId(null)}
                                                      t={t} />} />}
          </div>
        </section>

        <details className="panel settings">
          <summary><Settings className="icon" aria-hidden="true" /><span>{t("step3")}</span>
            <ChevronDown className="icon chev" aria-hidden="true" /></summary>
          <div className="set-group">
            <h3>{t("setCommon")}</h3>
            <div className="grid">
              <label><span>{t("labels")}</span>
                <select {...sel("labels")}>
                  <option value="symbols">{`${t("symbols")}  * ∞ †`}</option>
                  <option value="abbr">{`${t("abbr")}  ${ab.birt}${ab.marr}${ab.deat}`.trim()}</option>
                </select></label>
              <label><span>{t("dates")}</span>
                <select {...sel("dates")}>
                  <option value="year">{t("year")}</option><option value="full">{t("fullDate")}</option>
                </select></label>
              <label><span>{t("places")}</span>
                <select {...sel("places")}>
                  <option value="none">{t("noPlaces")}</option><option value="short">{t("shortPlace")}</option>
                  <option value="full">{t("fullPlace")}</option>
                </select></label>
              <label><span>{t("numbering")}</span>
                <select {...sel("numbering")}>
                  {NUMBERING[form.chart].map(([v, key]) => <option key={v} value={v}>{t(key)}</option>)}
                </select></label>
              {!desc && <label><span>{t("marriageOn")}</span>
                <select {...sel("marriageOn")}>
                  <option value="father">{t("marrFather")}</option><option value="both">{t("marrBoth")}</option>
                  <option value="none">{t("marrNone")}</option>
                </select></label>}
              <label><span>{t("generations")}</span>
                <input type="number" min="0" max="99" step="1" {...sel("generations")} /></label>
            </div>
            {desc && <div className="checks">
              <label><input {...check("showSpouses")} /> <span>{t("showSpouses")}</span></label>
            </div>}
          </div>
          <div className="set-group">
            <h3>{t("setPrint")}</h3>
            <div className="grid">
              <label><span>{t("pageSize")}</span>
                <select {...sel("pageSize")}>
                  <option value="a4">A4</option><option value="a3">A3</option><option value="a5">A5</option>
                  <option value="letter">Letter</option><option value="legal">Legal</option>
                </select></label>
              <label><span>{t("orientation")}</span>
                <select {...sel("orientation")}>
                  <option value="portrait">{t("portrait")}</option><option value="landscape">{t("landscape")}</option>
                </select></label>
              <label><span>{t("fontSize")}</span>
                <input type="number" min="5" max="20" step="0.5" {...sel("fontSize")} /></label>
              <label className="wide"><span>{t("title")}</span>
                <input type="text" placeholder={t("titlePh")} {...sel("title")} /></label>
            </div>
            <div className="checks">
              <label><input {...check("showDate")} /> <span>{t("showDate")}</span></label>
            </div>
          </div>
        </details>

      </>}

      <footer>Open source · <a href="https://github.com/r3mus99/arbora">GitHub</a> · <span>{t("license")}</span></footer>
    </main>
  );
}
