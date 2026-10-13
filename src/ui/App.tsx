import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { inboundAssociations } from "../core/associations";
import { chartRows } from "../core/chart";
import { FileDown, FileText, FileUp, LayoutDashboard,
         Loader2, BookMarked, History, Trash2, Clock, MapPin, Redo2, Search, SlidersHorizontal, ShieldAlert, ShieldCheck, Sun, Moon, TreeDeciduous, Undo2, Users } from "lucide-react";
import { collapseAt, reveal, visibleRows } from "../core/collapse";
import { type ChartKind } from "../core/format";
import { version } from "../../package.json";
import { checkGedcom, fixIssue } from "../core/check";
import { lineEnding, suggestions, writeGedcom } from "../core/edit";
import { decode, fold, parseGedcom, readRecords, type GedNode, type GedcomData } from "../core/gedcom";
import type { Fonts } from "../core/pdf";
import { sourceOverview } from "../core/sources";
import { placeOverview } from "../core/placelist";
import { overview } from "../core/stats";
import { type Lang } from "../core/texts";
import { renameVariants, spellings, variantGroups, type VariantKind } from "../core/variants";
import { NO_BROWSING, NO_EDITS, edited, changeCount, isDirty, move as moveIn, startEdits, stepEdits, visit, withRecords, type Browsing, type Doc, type Place } from "./history";
import { STRINGS, detect, isLang, type StringKey } from "./i18n";
import { storedOptions, toForm, toOptions, withOption, type Form } from "./options";
import { CheckPanel } from "./CheckPanel";
import { FileDrop } from "./FileDrop";
import { NO_MARKS, fileKey, marksOf, toggleFav, visited, withMarks, listing, type Marks } from "./marks";
import { RecentPanel } from "./RecentPanel";
import { LanguageMenu } from "./LanguageMenu";
import { applyTheme, chosenTheme, saveTheme, systemTheme, type Theme } from "./theme";
import { Overview } from "./Overview";
import { SourcesPanel } from "./SourcesPanel";
import { PlacesPanel } from "./PlacesPanel";
import { PersonDetail } from "./PersonDetail";
import { PersonEditor } from "./PersonEditor";
import { PersonRail } from "./PersonRail";
import { SettingsPanel } from "./SettingsPanel";
import { forgetFile, recallFile, rememberFile } from "./lastFile";
import { readStore, updateStore } from "./store";
import { TreeView } from "./TreeView";

type Vars = Record<string, string | number>;
const fill = (s: string, vars: Vars) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));

interface Status { key: StringKey; vars: Vars; err: boolean }
/** collapsed branches of one chart (`key`) */
interface Folding { key: string; paths: ReadonlySet<string> }
const NO_PATHS: ReadonlySet<string> = new Set();

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
  const [regular, bold, italic] = await Promise.all([get("fonts/DejaVuSans.ttf"), get("fonts/DejaVuSans-Bold.ttf"),
                                                      get("fonts/DejaVuSans-Oblique.ttf")]);
  return { regular, bold, italic };
}

export function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = readStore().lang;
    return isLang(l) ? l : detect();
  });
  const [form, setForm] = useState<Form>(() => toForm(storedOptions(readStore().options)));
  const [doc, setDoc] = useState<Doc | null>(null);
  const [edits, setEdits] = useState(NO_EDITS);
  const data = useMemo(() => (doc ? readRecords(doc.records) : null), [doc]);
  // person whose facts are being edited in the detail panel
  const [editId, setEditId] = useState<string | null>(null);
  // file name, or null for the sample
  const [loadedName, setLoadedName] = useState<string | null>("");
  // the file kept in this browser (name, null for the sample), and whether it is still being read at start
  const [last, setLast] = useState<{ name: string | null } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  // person shown in the detail panel next to the on-screen chart
  const [focusId, setFocusId] = useState<string | null>(null);
  const [treeScroll, setTreeScroll] = useState(0);
  // row to scroll to and highlight after "see no. X"
  const [jumpRow, setJumpRow] = useState<number | null>(null);
  const [folding, setFolding] = useState<Folding>({ key: "", paths: NO_PATHS });
  const [hist, setHist] = useState<Browsing>(NO_BROWSING);
  const [query, setQuery] = useState("");
  // recently visited and favourite people of this file, kept in the browser only
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  // the file overview opens after each load
  const finderRef = useRef<HTMLInputElement>(null);
  // the list of people starts as a narrow rail with a magnifier; the choice is remembered
  // one tool panel is open at a time: the list of people, the file check, or none
  const [tool, setTool] = useState<"people" | "check" | "overview" | "sources" | "places" | "recent" | "settings" | null>(() => readStore().listOpen === true ? "people" : null);
  const listOpen = tool === "people", showCheck = tool === "check", showOverview = tool === "overview", showSources = tool === "sources", showPlaces = tool === "places", showRecent = tool === "recent", showSettings = tool === "settings";
  const showList = (on: boolean) => { setTool(on ? "people" : null); updateStore({ listOpen: on }); };
  const setShowCheck = (on: boolean) => setTool(on ? "check" : listOpen ? "people" : null);
  const setShowOverview = (on: boolean) => setTool(on ? "overview" : listOpen ? "people" : null);
  const setShowSettings = (on: boolean) => setTool(on ? "settings" : listOpen ? "people" : null);
  const setShowSources = (on: boolean) => setTool(on ? "sources" : listOpen ? "people" : null);
  const setShowPlaces = (on: boolean) => setTool(on ? "places" : listOpen ? "people" : null);
  const setShowRecent = (on: boolean) => setTool(on ? "recent" : listOpen ? "people" : null);
  useEffect(() => { if (listOpen) finderRef.current?.focus(); }, [listOpen]);
  const fonts = useRef<Promise<Fonts> | null>(null);

  const t = useCallback((key: StringKey, vars: Vars = {}) =>
    fill(STRINGS[lang][key] || STRINGS.en[key] || key, vars), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // theme: the system's until the user chooses, then the choice wins
  const [themeChoice, setThemeChoice] = useState(chosenTheme);
  const [system, setSystem] = useState(systemTheme);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const theme: Theme = themeChoice || system;
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeChoice(next);
    applyTheme(next);
    saveTheme(next);
  };

  const changeLang = (code: Lang) => {
    setLang(code);
    updateStore({ lang: code });
  };

  // ------------------------------------------------------------ options
  const setOpt = <K extends keyof Form>(key: K, value: Form[K]) => {
    const next = withOption(form, key, value);
    if (key === "chart") resetResult();
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
  function loadBytes(bytes: ArrayBuffer, name: string | null, keep = true) {
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
    if (keep) void rememberFile(name, bytes).then((ok) => setLast(ok ? { name } : null));
    setDoc(next);
    setEdits(startEdits(next));
    setEditId(null);
    setTool("people");
    setLoadedName(name);
    setQuery("");
    const last = readStore().root;
    // the chart shows at once: last chosen person, else the first one in the file
    const root = last && parsed.people[last] ? last : Object.keys(parsed.people)[0];
    setSelectedId(root);
    setFocusId(root);
    setMarks(visited(marksOf(readStore().marks, fileKey(name)), root));
    setMarkedFor(root);
    setJumpRow(null);
    setHist({ list: [{ root, focus: root }], at: 0 });
    setScrollKey((k) => k + 1);
    setTreeScroll((k) => k + 1);
    resetResult();
    if (!fonts.current) fonts.current = loadFonts();
    import("../core/pdf").catch(() => { /* retried when the PDF is made */ });
  }

  const dirty = isDirty(doc, edits);
  const changes = changeCount(doc, edits);
  const unsavedText = `${t("unsaved")}: ${changes}`;
  const keepEdits = () => !dirty || confirm(t("discard"));

  const openFile = (f: File | undefined) => {
    if (f && keepEdits()) f.arrayBuffer().then((b) => loadBytes(b, f.name));
  };

  // the last opened file opens again when the page starts
  useEffect(() => {
    let live = true;
    void recallFile().then((f) => {
      if (!live) return;
      if (f) { setLast({ name: f.name }); loadBytes(f.bytes, f.name, false); }
      setRestoring(false);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** back to the welcome screen; the remembered file stays */
  const goHome = () => {
    if (!doc || !keepEdits()) return;
    setDoc(null);
    setEdits(NO_EDITS);
    setEditId(null);
    setFocusId(null);
    setSelectedId(null);
    setQuery("");
    setTool(null);
    resetResult();
  };

  const resume = async () => {
    const f = await recallFile();
    if (f) loadBytes(f.bytes, f.name, false); else setLast(null);
  };

  const forget = () => { setLast(null); void forgetFile(); };

  const loadSample = async () => {
    if (!keepEdits()) return;
    try {
      const r = await fetch(import.meta.env.BASE_URL + "sample.ged");
      if (!r.ok) throw new Error(String(r.status));
      loadBytes(await r.arrayBuffer(), null);
    } catch {
      alert(t("errSample"));
    }
  };

  // ------------------------------------------------------------ editing
  const inbound = useMemo(() => inboundAssociations(doc?.records || []), [doc]);
  const recordOf = useMemo(() => new Map((doc?.records || []).filter((r) => r.xref).map((r) => [r.xref!, r])), [doc]);
  // the form closes when another person is shown (set while rendering, so there is no extra render with the old form)
  const [editedFor, setEditedFor] = useState(focusId);
  if (editedFor !== focusId) { setEditedFor(focusId); setEditId(null); }
  const suggest = useMemo(() => suggestions(doc?.records || []), [doc]);
  const issues = useMemo(() => (doc ? checkGedcom(doc.records) : []), [doc]);
  // bulk fix: spellings of one surname or place
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readStore().hiddenVariants || []));
  const [keepAka, setKeepAka] = useState(() => readStore().keepAka !== false);
  const variants = useMemo(() => ({
    surname: doc ? variantGroups(doc.records, "surname") : [], place: doc ? variantGroups(doc.records, "place") : [],
  }), [doc]);
  const spelled = useMemo(() => {
    const sorted = (kind: VariantKind) => (doc ? [...spellings(doc.records, kind).keys()].sort((a, b) => a.localeCompare(b)) : []);
    return { surname: sorted("surname"), place: sorted("place") };
  }, [doc]);
  const found = {
    issues: issues.length,
    surname: variants.surname.filter((g) => !hidden.has(g.key)).length,
    place: variants.place.filter((g) => !hidden.has(g.key)).length,
  };
  const problems = found.issues + found.surname + found.place;
  // the panel opens also when only hidden groups are left, to show them again
  const hide = (key: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.add(key); else next.delete(key);
    setHidden(next);
    updateStore({ hiddenVariants: [...next] });
  };
  const stats = useMemo(() => (doc && data && showOverview ? overview(doc.records, data) : null), [doc, data, showOverview]);
  const placeList = useMemo(() => (doc && showPlaces ? placeOverview(doc.records) : null), [doc, showPlaces]);
  const srcOverview = useMemo(() => (doc && showSources ? sourceOverview(doc.records) : null), [doc, showSources]);
  // the list closes once everything is fixed

  /** a new version of the file with the changed records; one step of undo */
  const commit = (changed: GedNode[]) => {
    setEditId(null);
    if (!doc || !changed.length) return;
    setEdits(edited(edits, doc));
    setDoc(withRecords(doc, changed));
    resetResult();
  };
  /** the whole record list changed at once, as one undo step */
  const replaceRecords = (records: GedNode[]) => {
    if (!doc || records === doc.records) return;
    setEdits(edited(edits, doc));
    setDoc({ ...doc, records });
    resetResult();
  };
  const undoRedo = (step: -1 | 1) => {
    const stepped = doc && stepEdits(edits, doc, step);
    if (!stepped) return;
    setEdits(stepped.edits);
    setDoc(stepped.doc);
    setEditId(null);
    resetResult();
  };

  const gedName = (loadedName || "sample").replace(/\.(ged|gedcom)$/i, "") + ".ged";
  const downloadGedcom = () => {
    if (!doc) return;
    const text = writeGedcom(doc.records, doc.eol, { version, date: new Date() });
    saveFile(new Blob([text], { type: "text/plain;charset=utf-8" }), gedName);
    // the saved file is also what the browser remembers (the Blob above is UTF-8 too)
    void rememberFile(loadedName, new TextEncoder().encode(text).buffer as ArrayBuffer).then((ok) => setLast(ok ? { name: loadedName } : null));
    setEdits({ ...edits, saved: doc });
  };

  useEffect(() => {
    if (!dirty) return;
    // the browser asks before leaving the page with unsaved changes
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const remember = (place: Place) => setHist((h) => visit(h, place));

  // a person shown in the detail counts as visited; the marks are saved per file
  const markKey = fileKey(loadedName);
  const [markedFor, setMarkedFor] = useState(focusId);
  if (markedFor !== focusId) {
    setMarkedFor(focusId);
    if (focusId) setMarks((m) => visited(m, focusId));
  }
  useEffect(() => {
    if (data) updateStore({ marks: withMarks(readStore().marks, markKey, marks) });
  }, [marks, markKey, data]);
  const favourites = useMemo(() => new Set(marks.fav), [marks]);
  const recent = useMemo(() => (data ? listing(marks, (id) => !!data.people[id]) : []), [marks, data]);

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
    const arrived = moveIn(hist, step);
    if (!arrived || !data?.people[arrived.place.root]) return;
    const { place } = arrived;
    setHist(arrived.browsing);
    setSelectedId(place.root);
    setFocusId(place.focus);
    setJumpRow(null);
    updateStore({ root: place.root });
    if (place.root === chosen?.id) showPerson(place.focus);
    setTreeScroll((k) => k + 1);
  };
  // Alt + arrow, as in the browser; Ctrl+Z / Ctrl+Y. An effect event always sees the current state.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // Ctrl+Z / Ctrl+Y undo the edits, except in a text field, where they undo typing
    const field = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !field && (key === "z" || key === "y")) {
      e.preventDefault();
      undoRedo(key === "y" || e.shiftKey ? 1 : -1);
      return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    move(e.key === "ArrowLeft" ? -1 : 1);
  });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
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

  // generations shown in the chart and the PDF; a value set earlier outside the usual choices stays as an extra button
  const gens = Math.max(0, Math.round(Number(form.generations) || 0));
  const gensChoices = [3, 4, 5, 0].includes(gens) ? [3, 4, 5, 0] : [3, 4, 5, gens, 0].sort((a, b) => (a || 1e9) - (b || 1e9));
  // tooltip: which generations the choice shows, e.g. 3 = children and grandchildren
  const gensTip = (n: number) => !n ? t("genTipAll")
    : n >= 3 && n <= 5 ? t(`${desc ? "tipD" : "tipA"}${n}` as StringKey) : `${t("generations")} ${n}`;
  const pick = (id: string) => {
    select(id);
    setQuery("");
  };
  /** a click on the selected person in the chart or in a list of people deselects it, which closes the detail */
  const deselect = () => { setFocusId(null); setJumpRow(null); };
  const pickListed = (id: string) => { if (id === focusId) deselect(); else pick(id); };
  const star = (id: string) => setMarks((m) => toggleFav(m, id));

  return (
    <main className={data ? "loaded" : undefined}>
      {/* one frame: the top bar on top, below it the welcome screen or the viewer, see docs/design-guidelines.md */}
      <section className="panel chart">
        <header className="frame-bar">
          <h1><button type="button" className="home" onClick={goHome}
                                title={data ? t("home") : undefined}><TreeDeciduous className="logo" aria-hidden="true" />Arbora</button></h1>
          {data && <FileDrop className="drop file-chip" title={t("loaded", { count: Object.keys(data.people).length })}
                             onFile={openFile}>
            <FileUp className="icon" aria-hidden="true" />
            <strong>{loadedName === null ? t("sampleName") : loadedName}</strong>
            <span className="count"><Users className="icon" aria-hidden="true" />{Object.keys(data.people).length}</span>
          </FileDrop>}
          {data && statusText && <span className={status?.err ? "status err" : "status"} role="status">{statusText}</span>}
          <div className="head-tools">
            {data && <div className="tools" role="toolbar">
              <button type="button" className="icon-btn" disabled={!edits.past.length} onClick={() => undoRedo(-1)}
                      title={`${t("undo")} (Ctrl+Z)`} aria-label={t("undo")}><Undo2 className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn" disabled={!edits.future.length} onClick={() => undoRedo(1)}
                      title={`${t("redo")} (Ctrl+Y)`} aria-label={t("redo")}><Redo2 className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn save-btn" onClick={downloadGedcom}
                      title={`${t("exportGed")}${dirty ? ` (${unsavedText})` : ""}. ${t("exportTip")}`}
                      aria-label={dirty ? `${t("exportGed")} (${unsavedText})` : t("exportGed")}>
                <FileDown className="icon" aria-hidden="true" />
                GED{dirty && <span className="badge" aria-hidden="true">{changes > 99 ? "99+" : changes}</span>}</button>
              <button type="button" className="icon-btn save-btn" disabled={busy} onClick={() => create()} title={t("go")}
                      aria-label={t("go")}>
                {busy ? <Loader2 className="icon spin" aria-hidden="true" /> : <FileText className="icon" aria-hidden="true" />}
                PDF</button>
            </div>}
            <div className="tools">
              <button type="button" className="icon-btn" onClick={toggleTheme}
                      title={t(theme === "dark" ? "themeLight" : "themeDark")}
                      aria-label={t(theme === "dark" ? "themeLight" : "themeDark")}>
                {theme === "dark" ? <Sun className="icon" aria-hidden="true" /> : <Moon className="icon" aria-hidden="true" />}
              </button>
            </div>
            <LanguageMenu lang={lang} label={t("language")} onChange={changeLang} />
          </div>
        </header>
        {!data && !restoring && <div className="welcome">
          <div className="welcome-in">
            <p className="lead">{t("lead")}</p>
            {last && <div className="resume">
              <button type="button" className="primary" onClick={resume}>
                <History className="icon" aria-hidden="true" />
                {t("resume", { name: last.name === null ? t("sampleName") : last.name })}</button>
              <button type="button" className="icon-btn" onClick={forget} title={t("forget")} aria-label={t("forget")}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>}
            <FileDrop className="drop" onFile={openFile}>
              <FileUp className="icon" aria-hidden="true" />
              <div dangerouslySetInnerHTML={{ __html: t("drop") }} />
            </FileDrop>
            <p className="note">{t("privacy")}</p>
            <button type="button" onClick={loadSample}>{t("sample")}</button>
          </div>
        </div>}
        {data && chosen && <div className={`viewer${focusId || showCheck ? "" : " no-detail"}`}>
            {/* one sidebar: a narrow bar of tools and, next to it, the panel of the active tool (second click closes it) */}
            <div className="side">
              <nav className="toolbar" aria-label={t("showList")}>
                <button type="button" className={listOpen ? "on" : undefined} aria-pressed={listOpen}
                        title={t(listOpen ? "hideList" : "showList")} aria-label={t(listOpen ? "hideList" : "showList")}
                        onClick={() => showList(!listOpen)}><Search className="icon" aria-hidden="true" /></button>
                <button type="button" className={showRecent ? "on" : undefined} aria-pressed={showRecent}
                        title={t("recent")} aria-label={t("recent")} onClick={() => setShowRecent(!showRecent)}>
                  <Clock className="icon" aria-hidden="true" /></button>
                <button type="button" className={showOverview ? "on" : undefined} aria-pressed={showOverview}
                        title={t("overview")} aria-label={t("overview")} onClick={() => setShowOverview(!showOverview)}>
                  <LayoutDashboard className="icon" aria-hidden="true" /></button>
                <button type="button" className={`${showCheck ? "on " : ""}${problems ? "warn" : ""}`.trim() || undefined}
                        aria-pressed={showCheck} title={problems ? t("checkCount", { n: problems }) : t("checkOk")}
                        aria-label={t("check")} onClick={() => setShowCheck(!showCheck)}>
                  {problems ? <ShieldAlert className="icon" aria-hidden="true" /> : <ShieldCheck className="icon" aria-hidden="true" />}
                  {problems > 0 && <span className="badge">{problems}</span>}</button>
                <button type="button" className={showSources ? "on" : undefined} aria-pressed={showSources}
                        title={t("srcNotes")} aria-label={t("srcNotes")} onClick={() => setShowSources(!showSources)}>
                  <BookMarked className="icon" aria-hidden="true" /></button>
                <button type="button" className={showPlaces ? "on" : undefined} aria-pressed={showPlaces}
                        title={t("places")} aria-label={t("places")} onClick={() => setShowPlaces(!showPlaces)}>
                  <MapPin className="icon" aria-hidden="true" /></button>
                <button type="button" className={showSettings ? "on" : undefined} aria-pressed={showSettings}
                        title={t("settings")} aria-label={t("settings")} onClick={() => setShowSettings(!showSettings)}>
                  <SlidersHorizontal className="icon" aria-hidden="true" /></button>
              </nav>
              {showOverview && stats && <aside className="rail-wrap ov-wrap" aria-label={t("overview")}>
                <Overview stats={stats} data={data} problems={found} t={t}
                          onProblems={() => setShowCheck(true)}
                          onPerson={(id) => makeRoot(id)}
                          onSurname={(name) => { setQuery(name); showList(true); finderRef.current?.focus(); }} />
              </aside>}
              {showRecent && <aside className="rail-wrap" aria-label={t("recent")}>
                <RecentPanel entries={recent} data={data} lang={lang} selectedId={focusId}
                             onPerson={pickListed} onStar={star} t={t} />
              </aside>}
              {showSettings && <aside className="rail-wrap" aria-label={t("settings")}>
                <SettingsPanel form={form} lang={lang} onChange={setOpt} t={t} />
              </aside>}
              {showPlaces && placeList && <aside className="rail-wrap sp-wrap" aria-label={t("places")}>
                <PlacesPanel places={placeList} data={data} onPerson={(id) => pick(id)} t={t} />
              </aside>}
              {showSources && srcOverview && <aside className="rail-wrap sp-wrap" aria-label={t("srcNotes")}>
                <SourcesPanel overview={srcOverview} data={data} onPerson={(id) => pick(id)} t={t} />
              </aside>}
              {listOpen && <aside className="rail-wrap" aria-label={t("thName")}>
                <PersonRail ref={finderRef} people={data.people} lang={lang} selectedId={focusId} scrollKey={scrollKey}
                            favourites={favourites} onStar={star} query={query} onQuery={setQuery} onSelect={pickListed} t={t} />
              </aside>}
            </div>
            {showCheck ? <aside className="check-wide" aria-label={t("check")}>
              <CheckPanel issues={issues} data={data} t={t}
                          onFix={(i) => doc && replaceRecords(fixIssue(doc.records, i))}
                                variants={variants} values={spelled} hidden={hidden} onHide={hide}
                                onRename={(kind, from, to) => doc && replaceRecords(renameVariants(doc.records, kind, from, to, keepAka))}
                                keepAka={keepAka} onKeepAka={(on) => { setKeepAka(on); updateStore({ keepAka: on }); }}
                                onFocus={(id) => focus(id, true)} />
            </aside> : <>
            <div className="mid">
              <div className="chart-bar">
                <h2>{t("treeTitle")}</h2>
                <div className="chart-switch" role="radiogroup">
                  <label title={`${t("ancDesc1")}, ${t("ancDesc2")}`}>
                    <input type="radio" name="chart" value="ancestors" checked={form.chart === "ancestors"}
                           onChange={() => setOpt("chart", "ancestors")} /><span>{t("anc")}</span></label>
                  <label title={`${t("descDesc1")}, ${t("descDesc2")}`}>
                    <input type="radio" name="chart" value="descendants" checked={desc}
                           onChange={() => setOpt("chart", "descendants")} /><span>{t("desc")}</span></label>
                </div>
                <div className="gens" role="group" aria-label={t("generations")}>
                  <span>{t("generations")}</span>
                  <div className="chart-switch">
                    {gensChoices.map((n) => (
                      <button key={n} type="button" title={gensTip(n)} aria-label={gensTip(n)} aria-pressed={gens === n} className={gens === n ? "on" : undefined}
                              onClick={() => setOpt("generations", String(n))}>{n || t("allGens")}</button>
                    ))}
                  </div>
                </div>
              </div>
              <TreeView rows={shown} focusId={focusId} starred={favourites} scrollKey={treeScroll} scrollTo={jumpRow}
                        numbered={form.numbering === "ahnentafel" || form.numbering === "daboville"}
                        onFocus={(id) => id === focusId ? deselect() : focus(id, false)} onToggle={toggle}
                        onJump={(r) => jump(r.targetIndex)} t={t} />
            </div>
            {focusId && <PersonDetail data={data} id={focusId} starred={favourites.has(focusId)}
                                      onStar={() => star(focusId)} record={recordOf.get(focusId)} lookup={(x) => recordOf.get(x)} inbound={inbound.get(focusId) || []} rootId={chosen.id} lang={lang}
                                      onFocus={(id) => focus(id, true)} onMakeRoot={makeRoot} onChange={commit} suggest={suggest}
                                      onEdit={() => setEditId(focusId)} onCancelEdit={() => setEditId(null)} t={t}
                                      editor={editId === focusId && recordOf.has(focusId) &&
                                        <PersonEditor key={focusId} data={data} record={recordOf.get(focusId)!}
                                                      families={data.people[focusId].fams
                                                        .map((f) => recordOf.get(f)).filter((r) => !!r)}
                                                      lang={lang} suggest={suggest} onSave={commit} onCancel={() => setEditId(null)}
                                                      t={t} />} />}
            </>}
        </div>}
      </section>


      <footer>Open source · <a href="https://github.com/r3mus99/arbora">GitHub</a> · <span>{t("license")}</span></footer>
    </main>
  );
}
