import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { inboundAssociations } from "../core/associations";
import { chartRows } from "../core/chart";
import { FileDown, FileText, FileImage, FileUp, Home, User,
         Loader2, BookMarked, History, Trash2, Clock, ListChecks, Redo2, Search, SlidersHorizontal, ShieldAlert, ShieldCheck, Sun, X, Moon, TreeDeciduous, Undo2, Users } from "lucide-react";
import { type ChartKind } from "../core/format";
import { version } from "../../package.json";
import { checkGedcom, fixIssue } from "../core/check";
import { lineEnding, suggestions, writeGedcom } from "../core/edit";
import { addFamily, addPerson, appended, deleteFamily, deletePerson, freeXref } from "../core/structure";
import { mergePeople, type MergePick } from "../core/merge";
import { outputFileName } from "../core/fileName";
import { childOf, decode, parseGedcom, readRecords, type GedNode, type GedcomData } from "../core/gedcom";
import type { Fonts } from "../core/pdf";
import { sourceOverview } from "../core/sources";
import { addCitationAddresses, citationLinkLines, citationPageLines, setCitationLinks, setCitationPages } from "../core/citationLinks";
import { deleteSource, saveSource, sourceCites } from "../core/sourceLinks";
import { SourceWindow } from "./SourceWindow";
import { type Lang } from "../core/texts";
import { NO_EDITS, canRedo, canUndo, changeCount, discardUnsaved, edited, isDirty, replay, startEdits, stepEdits, unsavedChanges, withRecords, type Doc, type Edits, type Op } from "./history";
import { STRINGS, detect, isLang, type StringKey } from "./i18n";
import { gensSummary, storedOptions, toForm, toOptions, withOption, type Form } from "./options";
import { ChangesPanel } from "./ChangesPanel";
import { CheckPanel } from "./CheckPanel";
import { FileDrop } from "./FileDrop";
import { NO_MARKS, fileKey, marksOf, setHome as changeHome, toggleFav, visited, withMarks, listing, type Marks } from "./marks";
import { RecentPanel } from "./RecentPanel";
import { LanguageMenu } from "./LanguageMenu";
import { applyTheme, chosenTheme, saveTheme, systemTheme, type Theme } from "./theme";
import { SourcesPanel } from "./SourcesPanel";
import { applySourceRenames } from "../core/sourceTitles";
import { SourceEditContext } from "./Sources";
import { buildPoster, posterSvg } from "../core/poster";
import { buildDescendantsPoster } from "../core/posterDescendants";
import { PersonDetail } from "./PersonDetail";
import { EditWindow } from "./PersonEditWindow";
import { PersonRail } from "./PersonRail";
import { SettingsPanel } from "./SettingsPanel";
import { clearLog, fingerprint, forgetFile, recallFile, recallLog, rememberFile, saveLog, type EditLog } from "./lastFile";
import { readStore, updateStore } from "./store";
import { TreeView } from "./TreeView";

type Vars = Record<string, string | number>;
const fill = (s: string, vars: Vars) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));

interface Status { key: StringKey; vars: Vars; err: boolean }

/** The edit log as it is kept in the browser. */
const logOf = (e: Edits, of: string): EditLog => ({ of, ops: e.ops, at: e.at, saved: e.saved });

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

/** The font of the tree poster text: Latin and Latin Extended of Alkatra, then DejaVu Sans for what it lacks. */
async function loadAlkatra() {
  const get = async (p: string) => {
    const r = await fetch(import.meta.env.BASE_URL + p);
    if (!r.ok) throw new Error(p);
    return r.arrayBuffer();
  };
  const [lr, er, lb, eb] = await Promise.all(["Latin-Regular", "LatinExt-Regular", "Latin-Bold", "LatinExt-Bold"]
    .map((n) => get(`fonts/Alkatra-${n}.woff`)));
  return { regular: [lr, er], bold: [lb, eb] };
}

/** the width up to which the app shows the list and the detail one at a time, see docs/design-guidelines.md */
const NARROW = "(max-width: 900px)";

export function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const l = readStore().lang;
    return isLang(l) ? l : detect();
  });
  const [form, setForm] = useState<Form>(() => toForm(storedOptions(readStore().options)));
  const [doc, setDoc] = useState<Doc | null>(null);
  const [edits, setEdits] = useState(NO_EDITS);
  // fingerprint of the file as opened (the edit log kept in the browser belongs to it) and the edits restored after a reload, not yet dismissed
  const [origin, setOrigin] = useState<string | null>(null);
  const [restored, setRestored] = useState(0);
  const data = useMemo(() => (doc ? readRecords(doc.records) : null), [doc]);
  // person whose facts are being edited in the detail panel
  // the edit window: the person it edits (it stays on that person while others are shown)
  const [windowId, setWindowId] = useState<string | null>(null);
  /** the source window: a source record (xref) or a new source (null); never open together with the window of a person */
  const [sourceWin, setSourceWin] = useState<{ xref: string | null } | null>(null);
  // file name, or null for the sample
  const [loadedName, setLoadedName] = useState<string | null>("");
  // the file kept in this browser (name, null for the sample), and whether it is still being read at start
  const [last, setLast] = useState<{ name: string | null } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  // person shown in the detail panel next to the on-screen chart
  const [treeScroll, setTreeScroll] = useState(0);
  // row to scroll to and highlight after "see no. X"
  const [jumpRow, setJumpRow] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  // recently visited, favourite and home people of this file, kept in the browser only
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const finderRef = useRef<HTMLInputElement>(null);
  // the list of people starts as a narrow rail with a magnifier; the choice is remembered
  // one tool panel is open at a time: the list of people, the file check, or none
  // phone and small tablet: only the list of people and the detail of one person, one at a time, no chart and no tool panels
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [chosenTool, setTool] = useState<"people" | "check" | "sources" | "recent" | "settings" | "changes" | null>(() => readStore().listOpen === true ? "people" : null);
  const tool = narrow ? "people" : chosenTool;
  const listOpen = tool === "people", showCheck = tool === "check", showSources = tool === "sources", showRecent = tool === "recent", showSettings = tool === "settings", showChanges = tool === "changes";
  const showList = (on: boolean) => { setTool(on ? "people" : null); updateStore({ listOpen: on }); };
  const setShowCheck = (on: boolean) => setTool(on ? "check" : listOpen ? "people" : null);
  const setShowSettings = (on: boolean) => setTool(on ? "settings" : listOpen ? "people" : null);
  const setShowSources = (on: boolean) => setTool(on ? "sources" : listOpen ? "people" : null);
  const setShowChanges = (on: boolean) => setTool(on ? "changes" : listOpen ? "people" : null);
  const setShowRecent = (on: boolean) => setTool(on ? "recent" : listOpen ? "people" : null);
  useEffect(() => { if (listOpen && !narrow) finderRef.current?.focus(); }, [listOpen, narrow]);
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

  const fileName = (name: string, chart: ChartKind, generations: number, extension: string) =>
    outputFileName(name, generations, t(chart === "descendants" ? "fileDesc" : "fileAnc"), extension);

  async function create(id = selectedId) {
    if (!data || !id || busy) return;
    setBusy(true);
    setStatus({ key: "working", vars: {}, err: false });
    try {
      const f = await (fonts.current || (fonts.current = loadFonts()));
      // pdf-lib is large, so it loads only when the first PDF is made
      const { generate } = await import("../core/pdf");
      const opts = toOptions(form, lang);
      const res = await generate(data, id, opts, f, version);
      saveFile(new Blob([res.bytes as BlobPart], { type: "application/pdf" }),
               fileName(data.people[id].name, opts.chart, res.generations, "pdf"));
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

  /** The tree poster of the chart's root person as an SVG file with the text as outlines. */
  async function createPoster(id = selectedId) {
    if (!data || !id || busy) return;
    setBusy(true);
    setStatus({ key: "posterWorking", vars: {}, err: false });
    try {
      const [dejavu, alkatra, { posterFonts }] = await Promise.all([
        fonts.current || (fonts.current = loadFonts()), loadAlkatra(), import("../core/posterFont")]);
      const pf = posterFonts([...alkatra.regular, dejavu.regular], [...alkatra.bold, dejavu.bold || dejavu.regular]);
      // every download draws new branches
      const opts = toOptions(form, lang);
      const build = opts.chart === "descendants" ? buildDescendantsPoster : buildPoster;
      const poster = build(data, id, { ...opts, posterSeed: Math.floor(Math.random() * 2 ** 31) }, pf, { version, date: new Date() });
      saveFile(new Blob([posterSvg(poster, pf)], { type: "image/svg+xml" }),
               fileName(data.people[id].name, opts.chart, poster.generations, "svg"));
      setStatus(null);
    } catch (e) {
      console.error(e);
      fonts.current = null;
      setStatus({ key: "posterErr", vars: { msg: (e as Error).message }, err: true });
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------ loading
  function loadBytes(bytes: ArrayBuffer, name: string | null, keep = true, log: EditLog | null = null) {
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
    let shown = next, history = startEdits(next);
    if (log) {
      try {
        const kept: Edits = { base: next, ops: log.ops as Op[], at: log.at, saved: log.saved };
        shown = replay(kept);
        history = kept;
      } catch { void clearLog(); /* a log that does not fit the file is dropped */ }
    }
    setDoc(shown);
    setEdits(history);
    setOrigin(fingerprint(bytes));
    setRestored(isDirty(history) ? changeCount(history) : 0);
    setTool("people");
    setLoadedName(name);
    setQuery("");
    const stored = readStore().root;
    // the chart shows at once: last chosen person, else the first one in the file
    const root = stored && parsed.people[stored] ? stored : Object.keys(parsed.people)[0];
    setSelectedId(root);
    setMarks(visited(marksOf(readStore().marks, fileKey(name)), root));
    setMarkedFor(root);
    setJumpRow(null);
    setScrollKey((k) => k + 1);
    setTreeScroll((k) => k + 1);
    resetResult();
    if (!fonts.current) fonts.current = loadFonts();
    import("../core/pdf").catch(() => { /* retried when the PDF is made */ });
  }

  // unsaved changes: this version against the one last downloaded (or the file as opened when that is gone);
  // counted by comparing records, so a change reverted by hand is no change
  const unsaved = useMemo(() => (doc ? unsavedChanges(edits, doc.records) : []), [doc, edits]);
  const changes = unsaved.length;
  const dirty = changes > 0;
  const unsavedText = `${t("unsaved")}: ${changes}`;
  const keepEdits = () => !dirty || confirm(t("discard"));

  const openFile = (f: File | undefined) => {
    if (f && keepEdits()) f.arrayBuffer().then((b) => loadBytes(b, f.name));
  };

  // the last opened file opens again when the page starts
  useEffect(() => {
    let live = true;
    void recallFile().then(async (f) => {
      const log = f ? await recallLog(f) : null;
      if (!live) return;
      if (f) { setLast({ name: f.name }); loadBytes(f.bytes, f.name, false, log); }
      setRestoring(false);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** back to the welcome screen; the remembered file stays */
  const goHome = () => {
    if (!doc || !keepEdits()) return;
    // unsaved edits are dropped, the version last downloaded stays
    if (origin && edits.base) void saveLog(logOf(discardUnsaved(edits).edits, origin));
    setDoc(null);
    setEdits(NO_EDITS);
    setRestored(0);
    setSelectedId(null);
    setSelectedId(null);
    setQuery("");
    setTool(null);
    resetResult();
  };

  const resume = async () => {
    const f = await recallFile();
    if (f) loadBytes(f.bytes, f.name, false, await recallLog(f)); else setLast(null);
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
  const suggest = useMemo(() => suggestions(doc?.records || []), [doc]);
  const issues = useMemo(() => (doc ? checkGedcom(doc.records) : []), [doc]);
  const problems = issues.length;
  const srcEdit = useMemo(() => ({ rename: (xref: string, title: string) => {
    const rec = doc?.records.find((r) => r.xref === xref);
    if (doc && rec) replaceRecords(applySourceRenames(doc.records, [{ xref, from: childOf(rec, "TITL")?.value.trim() ?? "", to: title }]));
  } }), [doc]);
  const sourceEntry = useMemo(() => (doc && sourceWin?.xref ? sourceOverview(doc.records).sources.find((s) => s.key === sourceWin.xref) : undefined), [doc, sourceWin]);
  const srcOverview = useMemo(() => (doc && showSources ? sourceOverview(doc.records) : null), [doc, showSources]);
  // the list closes once everything is fixed

  /** a new version of the file with the changed records; one step of undo */
  const commit = (changed: GedNode[], added: GedNode[] = []) => {
    if (!doc || !(changed.length || added.length)) return;
    const next = withRecords(doc, changed);
    for (const rec of added) next.records = appended(next.records, rec);
    setEdits(edited(edits, doc, next));
    setDoc(next);
    resetResult();
  };
  /** the whole record list changed at once, as one undo step */
  const replaceRecords = (records: GedNode[]) => {
    if (!doc || records === doc.records) return;
    const next = { ...doc, records };
    setEdits(edited(edits, doc, next));
    setDoc(next);
    resetResult();
  };
  /** a new nameless person, selected, with the edit window open for them; one undo step */
  const newPerson = () => {
    if (!doc) return;
    const { records, id } = addPerson(doc.records);
    replaceRecords(records);
    pick(id);
    setWindowId(id);
  };
  const removePerson = (id: string) => {
    if (!doc) return;
    setWindowId(null);
    replaceRecords(deletePerson(doc.records, id));
    if (selectedId === id) setSelectedId(null);
  };
  const mergeInto = (keep: string, drop: string, pick: MergePick) => {
    if (!doc) return;
    setWindowId(null);
    replaceRecords(mergePeople(doc.records, keep, drop, pick));
    if (selectedId === drop) select(keep);
  };
  const newFamily = (person: string) => doc && replaceRecords(addFamily(doc.records, person).records);
  const removeFamily = (id: string) => doc && replaceRecords(deleteFamily(doc.records, id));
  const undoRedo = (step: -1 | 1) => {
    const stepped = doc && stepEdits(edits, doc, step);
    if (!stepped) return;
    setEdits(stepped.edits);
    setDoc(stepped.doc);
    resetResult();
  };

  const gedName = (loadedName || "sample").replace(/\.(ged|gedcom)$/i, "") + ".ged";
  const downloadGedcom = () => {
    if (!doc) return;
    const text = writeGedcom(doc.records, doc.eol, { version, date: new Date() });
    saveFile(new Blob([text], { type: "text/plain;charset=utf-8" }), gedName);
    // the saved file becomes what the browser remembers (the Blob above is UTF-8 too); the old edit log is dropped with the old original,
    // so undo starts again from the saved version
    const bytes = new TextEncoder().encode(text).buffer as ArrayBuffer;
    void rememberFile(loadedName, bytes).then((ok) => setLast(ok ? { name: loadedName } : null));
    setOrigin(fingerprint(bytes));
    setEdits(startEdits(doc));
    setRestored(0);
  };

  /** the edits restored after a reload are dropped: back to the version last downloaded */
  const discardRestored = () => {
    if (!confirm(t("discard"))) return;
    const back = discardUnsaved(edits);
    setDoc(back.doc);
    setEdits(back.edits);
    setRestored(0);
    resetResult();
  };

  // the edit log is kept in the browser shortly after each change, so a reload does not lose the edits and their undo steps
  const kept = useRef<{ log: EditLog | null }>({ log: null });
  useEffect(() => {
    if (!origin || !edits.base || restoring) return;
    const log = logOf(edits, origin);
    kept.current.log = log;
    const timer = setTimeout(() => { kept.current.log = null; void saveLog(log); }, 1000);
    return () => clearTimeout(timer);
  }, [edits, origin, restoring]);
  useEffect(() => {
    // leaving the page does not wait for the timer
    const flush = () => { const l = kept.current.log; if (l) { kept.current.log = null; void saveLog(l); } };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    // the browser asks before leaving the page with unsaved changes
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  // a person shown in the detail counts as visited; the marks are saved per file
  const markKey = fileKey(loadedName);
  const [markedFor, setMarkedFor] = useState(selectedId);
  if (markedFor !== selectedId) {
    setMarkedFor(selectedId);
    if (selectedId) setMarks((m) => visited(m, selectedId));
  }
  useEffect(() => {
    if (data) updateStore({ marks: withMarks(readStore().marks, markKey, marks) });
  }, [marks, markKey, data]);
  const favourites = useMemo(() => new Set(marks.fav), [marks]);
  const homeId = marks.home && data?.people[marks.home] ? marks.home : null;
  const recent = useMemo(() => (data ? listing(marks, (id) => !!data.people[id]) : []), [marks, data]);

  const select = (id: string) => {
    setSelectedId(id);
    setJumpRow(null);
    setTreeScroll((k) => k + 1);
    updateStore({ root: id });
  };
  const chosen = selectedId && data ? data.people[selectedId] : null;

  // ------------------------------------------------------------ on-screen chart
  const rows = useMemo(() => (data && chosen ? chartRows(data, chosen.id, toOptions(form, lang)) : []),
                       [data, chosen, form, lang]);
  const jump = (index: number) => {
    const target = rows[index];
    if (!target || !chosen) return;
    if (target.personId) pick(target.personId);
    setJumpRow(index);
  };
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

  const pick = (id: string) => {
    select(id);
    setQuery("");
  };
  /** a click on the selected person in the chart or in a list of people deselects it, which closes the detail */
  // one selection: a click on the selected person changes nothing; any other person is selected
  const pickListed = (id: string) => { if (id !== selectedId) pick(id); };
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
          {data && <button type="button" className={`home-chip${homeId ? "" : " empty"}`} disabled={!selectedId}
                           onClick={() => { if (selectedId) setMarks((m) => changeHome(m, selectedId)); }}
                           title={t("homeSet")} aria-label={t("homeSet")}>
            <User className="icon" aria-hidden="true" />
            <strong>{homeId ? data.people[homeId].name || "?" : t("homeSet")}</strong>
          </button>}
          {data && homeId && <button type="button" className="icon-btn" onClick={() => makeRoot(homeId)}
                  title={t("returnHome", { name: data.people[homeId].name || "?" })} aria-label={t("returnHome", { name: data.people[homeId].name || "?" })}>
            <Home className="icon" aria-hidden="true" /></button>}
          {data && statusText && <span className={status?.err ? "status err" : "status"} role="status">{statusText}</span>}
          <div className="head-tools">
            {data && <div className="tools" role="toolbar">
              <button type="button" className="icon-btn" disabled={!canUndo(edits)} onClick={() => undoRedo(-1)}
                      title={t("undo")} aria-label={t("undo")}><Undo2 className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn" disabled={!canRedo(edits)} onClick={() => undoRedo(1)}
                      title={t("redo")} aria-label={t("redo")}><Redo2 className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn save-btn" onClick={downloadGedcom}
                      title={`${t("exportGed")}${dirty ? ` (${unsavedText})` : ""}. ${t("exportTip")}`}
                      aria-label={dirty ? `${t("exportGed")} (${unsavedText})` : t("exportGed")}>
                <FileDown className="icon" aria-hidden="true" />
                GED{dirty && <span className="badge" aria-hidden="true">{changes > 99 ? "99+" : changes}</span>}</button>
              <button type="button" className="icon-btn save-btn" disabled={busy} onClick={() => create()} title={t("go")}
                      aria-label={t("go")}>
                {busy ? <Loader2 className="icon spin" aria-hidden="true" /> : <FileText className="icon" aria-hidden="true" />}
                PDF</button>
              <button type="button" className="icon-btn save-btn poster" disabled={busy} onClick={() => createPoster()} title={`${t("poster")}. ${t(form.chart === "descendants" ? "posterHintDesc" : "posterHint")}`}
                      aria-label={t("poster")}>
                <FileImage className="icon" aria-hidden="true" />
                SVG</button>
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
        {data && dirty && restored > 0 && <div className="notice" role="status">
          <span>{t("restored", { n: restored })}</span>
          <button type="button" onClick={discardRestored}>{t("restoredDiscard")}</button>
          <button type="button" className="icon-btn" onClick={() => setRestored(0)} title={t("dismiss")} aria-label={t("dismiss")}>
            <X className="icon" aria-hidden="true" /></button>
        </div>}
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
        {data && chosen && <div className={`viewer${selectedId || showCheck ? " has-detail" : " no-detail"}`}>
            {/* one sidebar: a narrow bar of tools and, next to it, the panel of the active tool (second click closes it) */}
            <div className="side">
              <nav className="toolbar" aria-label={t("showList")}>
                <button type="button" className={listOpen ? "on" : undefined} aria-pressed={listOpen}
                        title={listOpen ? t("hideList") : t("showList")} aria-label={t(listOpen ? "hideList" : "showList")}
                        onClick={() => showList(!listOpen)}><Search className="icon" aria-hidden="true" /></button>
                <button type="button" className={showRecent ? "on" : undefined} aria-pressed={showRecent}
                        title={t("recent")} aria-label={t("recent")} onClick={() => setShowRecent(!showRecent)}>
                  <Clock className="icon" aria-hidden="true" /></button>
                <button type="button" className={`${showCheck ? "on " : ""}${problems ? "warn" : ""}`.trim() || undefined}
                        aria-pressed={showCheck} title={problems ? t("checkCount", { n: problems }) : t("checkOk")}
                        aria-label={t("check")} onClick={() => setShowCheck(!showCheck)}>
                  {problems ? <ShieldAlert className="icon" aria-hidden="true" /> : <ShieldCheck className="icon" aria-hidden="true" />}
                  {problems > 0 && <span className="badge">{problems}</span>}</button>
                <button type="button" className={showSources ? "on" : undefined} aria-pressed={showSources}
                        title={t("srcNotes")} aria-label={t("srcNotes")} onClick={() => setShowSources(!showSources)}>
                  <BookMarked className="icon" aria-hidden="true" /></button>
                {(dirty || showChanges) && <button type="button" className={showChanges ? "on" : undefined} aria-pressed={showChanges}
                        title={`${t("changes")}: ${changes}`} aria-label={t("changes")} onClick={() => setShowChanges(!showChanges)}>
                  <ListChecks className="icon" aria-hidden="true" />{changes > 0 && <span className="badge">{changes > 99 ? "99+" : changes}</span>}</button>}
                <button type="button" className={showSettings ? "on" : undefined} aria-pressed={showSettings}
                        title={t("settings")} aria-label={t("settings")} onClick={() => setShowSettings(!showSettings)}>
                  <SlidersHorizontal className="icon" aria-hidden="true" /></button>
              </nav>
              {showRecent && <aside className="rail-wrap" aria-label={t("recent")}>
                <RecentPanel entries={recent} data={data} lang={lang} selectedId={selectedId}
                             onPerson={pickListed} onStar={star} t={t} />
              </aside>}
              {showChanges && <aside className="rail-wrap sp-wrap" aria-label={t("changes")}>
                <ChangesPanel changes={unsaved} data={data} lang={lang} onPerson={(id) => pick(id)} t={t} />
              </aside>}
              {showSettings && <aside className="rail-wrap" aria-label={t("settings")}>
                <SettingsPanel form={form} lang={lang} onChange={setOpt} t={t} />
              </aside>}
              {showSources && srcOverview && <aside className="rail-wrap sp-wrap" aria-label={t("srcNotes")}>
                <SourcesPanel key={selectedId ?? ""} overview={srcOverview} data={data} onPerson={(id) => pick(id)} personId={selectedId} t={t}
                              citationsOf={(xref) => ({ cites: sourceCites(doc!.records, xref), links: citationLinkLines(doc!.records, xref) })}
                              onEdit={(xref) => setSourceWin({ xref })} editDisabled={!!windowId} />
              </aside>}
              {listOpen && <aside className="rail-wrap" aria-label={t("thName")}>
                <PersonRail ref={finderRef} people={data.people} lang={lang} selectedId={selectedId} scrollKey={scrollKey}
                            favourites={favourites} onStar={star} query={query} onQuery={setQuery} onSelect={pickListed} onAdd={newPerson} t={t} />
              </aside>}
            </div>
            {sourceWin && doc && (!sourceWin.xref || sourceEntry) && <SourceWindow key={sourceWin.xref ?? "new"} data={data} xref={sourceWin.xref}
                                 fields={sourceEntry?.fields ?? { title: "", author: "", publication: "", notes: [], links: [] }}
                                 cites={sourceWin.xref ? sourceCites(doc.records, sourceWin.xref) : []} cited={sourceEntry?.citations ?? 0}
                                 citeLinks={sourceWin.xref ? citationLinkLines(doc.records, sourceWin.xref) : []}
                                 citePages={sourceWin.xref ? citationPageLines(doc.records, sourceWin.xref) : []}
                                 onSave={(fields, after, linkChanges, addresses, pageChanges) => {
                                   const saved = saveSource(setCitationPages(setCitationLinks(doc.records, linkChanges), pageChanges), sourceWin.xref, fields, sourceWin.xref ? sourceCites(doc.records, sourceWin.xref) : [], after);
                                   replaceRecords(addCitationAddresses(saved.records, saved.xref, addresses));
                                   setSourceWin(null);
                                 }}
                                 onDelete={() => { if (sourceWin.xref) replaceRecords(deleteSource(doc.records, sourceWin.xref)); setSourceWin(null); }}
                                 onClose={() => setSourceWin(null)} hidden={showCheck || !!windowId} t={t} />}
            {windowId && recordOf.has(windowId) && data.people[windowId] && <EditWindow key={windowId} data={data} name={data.people[windowId].name || "?"}
                                 record={recordOf.get(windowId)!} families={data.people[windowId].fams.map((f) => recordOf.get(f)).filter((r) => !!r)}
                                 lang={lang} suggest={suggest} recordOf={(id) => recordOf.get(id)} onSave={(changed, added) => { setWindowId(null); commit(changed, added); }}
                                 allocate={(tag, pending) => (tag === "FAM" ? freeXref(doc!.records, "FAM", "F", pending) : freeXref(doc!.records, "INDI", "I", pending))}
                                 onClose={() => setWindowId(null)} onDeletePerson={() => removePerson(windowId)}
                                 records={doc!.records} onMerge={(drop, pick) => mergeInto(windowId, drop, pick)}
                                 onAddFamily={() => newFamily(windowId)} onDeleteFamily={removeFamily} hidden={showCheck} t={t} />}
            {showCheck ? <aside className="check-wide" aria-label={t("check")}>
              <CheckPanel issues={issues} data={data} t={t} onFix={(i) => doc && replaceRecords(fixIssue(doc.records, i))}
                          onFocus={pick} />
            </aside> : <>
            {!narrow && <div className="mid">
              <div className="chart-bar">
                <h2>{t("treeTitle")}</h2>
                <button type="button" className="chart-summary" title={t("settings")} onClick={() => setShowSettings(true)}>
                  {desc ? t("desc") : t("anc")} · {gensSummary(Number(form.generations) || 0, lang, t("genTipAll"))}
                  <SlidersHorizontal className="icon" aria-hidden="true" />
                </button>
              </div>
              <TreeView rows={rows} focusId={selectedId} starred={favourites} scrollKey={treeScroll} scrollTo={jumpRow}
                        numbered={form.numbering === "ahnentafel" || form.numbering === "daboville"}
                        onFocus={pickListed}
                        onJump={jump} t={t} />
            </div>}
            {selectedId && <SourceEditContext.Provider value={srcEdit}><PersonDetail key={selectedId} data={data} id={selectedId} homeId={homeId}
                                      record={recordOf.get(selectedId)} lookup={(x) => recordOf.get(x)} inbound={inbound.get(selectedId) || []} lang={lang}
                                      onFocus={pick} onChange={commit} suggest={suggest}
                                      onEdit={() => setWindowId(selectedId)} t={t} /></SourceEditContext.Provider>}
            </>}
        </div>}
      </section>


      <footer>Open source · <a href="https://github.com/r3mus99/arbora">GitHub</a> · <span>{t("license")}</span></footer>
    </main>
  );
}
