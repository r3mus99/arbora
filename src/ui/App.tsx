import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { inboundAssociations } from "../core/associations";
import { chartRows } from "../core/chart";
import { FileDown, FileText, FileUp, LayoutDashboard,
         Loader2, BookMarked, History, Trash2, Clock, ListChecks, MapPin, Redo2, Replace, Search, SlidersHorizontal, ShieldAlert, ShieldCheck, Sun, X, Moon, TreeDeciduous, Undo2, Users } from "lucide-react";
import { collapseAt, reveal, visibleRows } from "../core/collapse";
import { type ChartKind } from "../core/format";
import { version } from "../../package.json";
import { checkGedcom, fixIssue } from "../core/check";
import { lineEnding, suggestions, writeGedcom } from "../core/edit";
import { addFamily, addPerson, appended, deleteFamily, deletePerson, freeXref } from "../core/structure";
import { decode, fold, parseGedcom, readRecords, type GedNode, type GedcomData } from "../core/gedcom";
import type { Fonts } from "../core/pdf";
import { sourceChoices, sourceOverview } from "../core/sources";
import { placeOverview } from "../core/placelist";
import { overview } from "../core/stats";
import { type Lang } from "../core/texts";
import { renameVariants, spellings, variantGroups, type VariantKind } from "../core/variants";
import { NO_BROWSING, NO_EDITS, canRedo, canUndo, changeCount, discardUnsaved, edited, isDirty, move as moveIn, replay, startEdits, stepEdits, unsavedChanges, visit, withRecords, type Browsing, type Doc, type Edits, type Op, type Place } from "./history";
import { STRINGS, detect, isLang, type StringKey } from "./i18n";
import { storedOptions, toForm, toOptions, withOption, type Form } from "./options";
import { ChangesPanel } from "./ChangesPanel";
import { BulkFix } from "./BulkFix";
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
import { EditWindow } from "./EditWindow";
import { PersonRail } from "./PersonRail";
import { SettingsPanel } from "./SettingsPanel";
import { clearLog, fingerprint, forgetFile, recallFile, recallLog, rememberFile, saveLog, type EditLog } from "./lastFile";
import { readStore, updateStore } from "./store";
import { TreeView } from "./TreeView";

type Vars = Record<string, string | number>;
const fill = (s: string, vars: Vars) => s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));

interface Status { key: StringKey; vars: Vars; err: boolean }
/** collapsed branches of one chart (`key`) */
interface Folding { key: string; paths: ReadonlySet<string> }
const NO_PATHS: ReadonlySet<string> = new Set();

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
  const [tool, setTool] = useState<"people" | "check" | "fix" | "overview" | "sources" | "places" | "recent" | "settings" | "changes" | null>(() => readStore().listOpen === true ? "people" : null);
  const listOpen = tool === "people", showCheck = tool === "check", showFix = tool === "fix", showOverview = tool === "overview", showSources = tool === "sources", showPlaces = tool === "places", showRecent = tool === "recent", showSettings = tool === "settings", showChanges = tool === "changes";
  const showList = (on: boolean) => { setTool(on ? "people" : null); updateStore({ listOpen: on }); };
  const setShowCheck = (on: boolean) => setTool(on ? "check" : listOpen ? "people" : null);
  const setShowFix = (on: boolean) => setTool(on ? "fix" : listOpen ? "people" : null);
  const setShowOverview = (on: boolean) => setTool(on ? "overview" : listOpen ? "people" : null);
  const setShowSettings = (on: boolean) => setTool(on ? "settings" : listOpen ? "people" : null);
  const setShowSources = (on: boolean) => setTool(on ? "sources" : listOpen ? "people" : null);
  const setShowPlaces = (on: boolean) => setTool(on ? "places" : listOpen ? "people" : null);
  const setShowChanges = (on: boolean) => setTool(on ? "changes" : listOpen ? "people" : null);
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
    setFocusId(null);
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
  // bulk fix: spellings of one surname or place
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readStore().hiddenVariants || []));
  const [keepAka, setKeepAka] = useState(() => readStore().keepAka !== false);
  const variants = useMemo(() => ({
    surname: doc ? variantGroups(doc.records, "surname") : [], given: doc ? variantGroups(doc.records, "given") : [], place: doc ? variantGroups(doc.records, "place") : [],
  }), [doc]);
  const spelled = useMemo(() => {
    const sorted = (kind: VariantKind) => (doc ? [...spellings(doc.records, kind).keys()].sort((a, b) => a.localeCompare(b)) : []);
    return { surname: sorted("surname"), given: sorted("given"), place: sorted("place") };
  }, [doc]);
  const found = {
    issues: issues.length,
    surname: variants.surname.filter((g) => !hidden.has(g.key)).length,
    given: variants.given.filter((g) => !hidden.has(g.key)).length,
    place: variants.place.filter((g) => !hidden.has(g.key)).length,
  };
  // the file check counts problems, the bulk fix counts groups of spellings that wait for a decision
  const problems = found.issues, spellingGroups = found.surname + found.given + found.place;
  // the panel opens also when only hidden groups are left, to show them again
  const hide = (key: string, on: boolean) => {
    const next = new Set(hidden);
    if (on) next.add(key); else next.delete(key);
    setHidden(next);
    updateStore({ hiddenVariants: [...next] });
  };
  const stats = useMemo(() => (doc && data && showOverview ? overview(doc.records, data) : null), [doc, data, showOverview]);
  const placeList = useMemo(() => (doc && showPlaces ? placeOverview(doc.records) : null), [doc, showPlaces]);
  const sourceList = useMemo(() => (windowId && doc ? sourceChoices(doc.records) : []), [windowId, doc]);
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
    if (focusId === id) deselect();
    if (selectedId === id) setSelectedId(null);
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
              <button type="button" className="icon-btn" disabled={!canUndo(edits)} onClick={() => undoRedo(-1)}
                      title={`${t("undo")} (Ctrl+Z)`} aria-label={t("undo")}><Undo2 className="icon" aria-hidden="true" /></button>
              <button type="button" className="icon-btn" disabled={!canRedo(edits)} onClick={() => undoRedo(1)}
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
        {data && chosen && <div className={`viewer${focusId || showCheck || showFix ? "" : " no-detail"}`}>
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
                <button type="button" className={`${showFix ? "on " : ""}${spellingGroups ? "warn" : ""}`.trim() || undefined}
                        aria-pressed={showFix} title={spellingGroups ? t("bulkCount", { n: spellingGroups }) : t("batchRename")}
                        aria-label={t("batchRename")} onClick={() => setShowFix(!showFix)}>
                  <Replace className="icon" aria-hidden="true" />
                  {spellingGroups > 0 && <span className="badge">{spellingGroups}</span>}</button>
                <button type="button" className={showSources ? "on" : undefined} aria-pressed={showSources}
                        title={t("srcNotes")} aria-label={t("srcNotes")} onClick={() => setShowSources(!showSources)}>
                  <BookMarked className="icon" aria-hidden="true" /></button>
                <button type="button" className={showPlaces ? "on" : undefined} aria-pressed={showPlaces}
                        title={t("places")} aria-label={t("places")} onClick={() => setShowPlaces(!showPlaces)}>
                  <MapPin className="icon" aria-hidden="true" /></button>
                {(dirty || showChanges) && <button type="button" className={showChanges ? "on" : undefined} aria-pressed={showChanges}
                        title={`${t("changes")}: ${changes}`} aria-label={t("changes")} onClick={() => setShowChanges(!showChanges)}>
                  <ListChecks className="icon" aria-hidden="true" />{changes > 0 && <span className="badge">{changes > 99 ? "99+" : changes}</span>}</button>}
                <button type="button" className={showSettings ? "on" : undefined} aria-pressed={showSettings}
                        title={t("settings")} aria-label={t("settings")} onClick={() => setShowSettings(!showSettings)}>
                  <SlidersHorizontal className="icon" aria-hidden="true" /></button>
              </nav>
              {showOverview && stats && <aside className="rail-wrap ov-wrap" aria-label={t("overview")}>
                <Overview stats={stats} data={data} problems={found} t={t}
                          onProblems={() => (found.issues ? setShowCheck(true) : setShowFix(true))}
                          onPerson={(id) => makeRoot(id)}
                          onSurname={(name) => { setQuery(name); showList(true); finderRef.current?.focus(); }} />
              </aside>}
              {showRecent && <aside className="rail-wrap" aria-label={t("recent")}>
                <RecentPanel entries={recent} data={data} lang={lang} selectedId={focusId}
                             onPerson={pickListed} onStar={star} t={t} />
              </aside>}
              {showChanges && <aside className="rail-wrap sp-wrap" aria-label={t("changes")}>
                <ChangesPanel changes={unsaved} data={data} lang={lang} onPerson={(id) => pick(id)} t={t} />
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
                            favourites={favourites} onStar={star} query={query} onQuery={setQuery} onSelect={pickListed} onAdd={newPerson} t={t} />
              </aside>}
            </div>
            {windowId && recordOf.has(windowId) && data.people[windowId] && <EditWindow key={windowId} data={data} name={data.people[windowId].name || "?"}
                                 record={recordOf.get(windowId)!} families={data.people[windowId].fams.map((f) => recordOf.get(f)).filter((r) => !!r)}
                                 lang={lang} suggest={suggest} recordOf={(id) => recordOf.get(id)} sources={sourceList} onSave={(changed, added) => { setWindowId(null); commit(changed, added); }}
                                 allocate={(pending) => freeXref(doc!.records, "INDI", "I", pending)}
                                 onClose={() => setWindowId(null)} onDeletePerson={() => removePerson(windowId)}
                                 onAddFamily={() => newFamily(windowId)} onDeleteFamily={removeFamily} hidden={showCheck || showFix} t={t} />}
            {showCheck || showFix ? <aside className="check-wide" aria-label={t(showFix ? "batchRename" : "check")}>
              {showFix ? <BulkFix data={data} t={t} variants={variants} values={spelled} hidden={hidden} onHide={hide}
                                  onRename={(kind, from, to) => doc && replaceRecords(renameVariants(doc.records, kind, from, to, keepAka))}
                                  keepAka={keepAka} onKeepAka={(on) => { setKeepAka(on); updateStore({ keepAka: on }); }}
                                  onFocus={(id) => focus(id, true)} />
                : <CheckPanel issues={issues} data={data} t={t} onFix={(i) => doc && replaceRecords(fixIssue(doc.records, i))}
                              onFocus={(id) => focus(id, true)} />}
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
                                      onEdit={() => setWindowId(focusId)} t={t} />}
            </>}
        </div>}
      </section>


      <footer>Open source · <a href="https://github.com/r3mus99/arbora">GitHub</a> · <span>{t("license")}</span></footer>
    </main>
  );
}
