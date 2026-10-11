import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { chartRows } from "../core/chart";
import { ArrowDownFromLine, ArrowUpFromLine, ChevronDown, Download, FileText, FileUp, Loader2, Network, Search,
         Settings } from "lucide-react";
import { DEFAULTS, fmt, type ChartKind, type ChartOptions } from "../core/format";
import { fold, load, type GedcomData } from "../core/gedcom";
import type { Fonts } from "../core/pdf";
import { TEXTS, type Lang } from "../core/texts";
import { STRINGS, detect, isLang, type StringKey } from "./i18n";
import { LanguageMenu } from "./LanguageMenu";
import { PersonDetail } from "./PersonDetail";
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
interface Result { url: string; name: string }

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
  const [data, setData] = useState<GedcomData | null>(null);
  // file name, or null for the sample
  const [loadedName, setLoadedName] = useState<string | null>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  // person shown in the detail panel next to the on-screen chart
  const [focusId, setFocusId] = useState<string | null>(null);
  const [treeScroll, setTreeScroll] = useState(0);
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const fonts = useRef<Promise<Fonts> | null>(null);

  const t = useCallback((key: StringKey, vars: Vars = {}) =>
    fill(STRINGS[lang][key] || STRINGS.en[key] || key, vars), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = "Rodostrom – GEDCOM → PDF";
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
  const resetResult = () => {
    setResult((r) => { if (r) URL.revokeObjectURL(r.url); return null; });
    setStatus(null);
  };

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
      resetResult();
      setResult({
        url: URL.createObjectURL(new Blob([res.bytes as BlobPart], { type: "application/pdf" })),
        name: fileName(data.people[id].name, opts.chart),
      });
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
    let parsed: GedcomData;
    try {
      parsed = load(bytes);
    } catch (e) {
      alert(t("errLoad", { msg: (e as Error).message }));
      return;
    }
    if (!Object.keys(parsed.people).length) {
      alert(t("errEmpty"));
      return;
    }
    setData(parsed);
    setLoadedName(name);
    setQuery("");
    const last = readStore().root;
    // the chart shows at once: last chosen person, else the first one in the file
    const root = last && parsed.people[last] ? last : Object.keys(parsed.people)[0];
    setSelectedId(root);
    setFocusId(root);
    setScrollKey((k) => k + 1);
    setTreeScroll((k) => k + 1);
    resetResult();
    if (!fonts.current) fonts.current = loadFonts();
    import("../core/pdf").catch(() => { /* retried when the PDF is made */ });
  }

  const openFile = (f: File | undefined) => {
    if (f) f.arrayBuffer().then((b) => loadBytes(b, f.name));
  };

  const loadSample = async () => {
    try {
      const r = await fetch(import.meta.env.BASE_URL + "ukazka.ged");
      if (!r.ok) throw new Error(String(r.status));
      loadBytes(await r.arrayBuffer(), null);
    } catch {
      alert(t("errSample"));
    }
  };

  const onDrag = (e: DragEvent, on: boolean) => { e.preventDefault(); setOver(on); };

  const select = (id: string) => {
    setSelectedId(id);
    setFocusId(id);
    setTreeScroll((k) => k + 1);
    updateStore({ root: id });
  };
  const chosen = selectedId && data ? data.people[selectedId] : null;

  // ------------------------------------------------------------ on-screen chart
  const rows = useMemo(() => (data && chosen ? chartRows(data, chosen.id, toOptions(form, lang)) : []),
                       [data, chosen, form, lang]);
  const focus = (id: string, scroll: boolean) => {
    setFocusId(id);
    if (scroll) setTreeScroll((k) => k + 1);
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

  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => setOpt(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "repeat" | "motherFirst" | "showIds" | "showDate") => ({
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
          <h1><Network className="logo" aria-hidden="true" />Rodostrom</h1>
          {!data && <p className="lead">{t("lead")}</p>}
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
            <h2>{chartTitle}</h2>
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
            <TreeView rows={rows} focusId={focusId} scrollKey={treeScroll}
                      onFocus={(id) => focus(id, false)} t={t} />
            {focusId && <PersonDetail data={data} id={focusId} rootId={chosen.id} lang={lang}
                                      onFocus={(id) => focus(id, true)} onMakeRoot={makeRoot} t={t} />}
          </div>
        </section>

        <details className="panel settings">
          <summary><Settings className="icon" aria-hidden="true" /><span>{t("step3")}</span>
            <ChevronDown className="icon chev" aria-hidden="true" /></summary>
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
            <label><span>{t("pageSize")}</span>
              <select {...sel("pageSize")}>
                <option value="a4">A4</option><option value="a3">A3</option><option value="a5">A5</option>
                <option value="letter">Letter</option><option value="legal">Legal</option>
              </select></label>
            <label><span>{t("orientation")}</span>
              <select {...sel("orientation")}>
                <option value="portrait">{t("portrait")}</option><option value="landscape">{t("landscape")}</option>
              </select></label>
            <label><span>{t("generations")}</span>
              <input type="number" min="0" max="99" step="1" {...sel("generations")} /></label>
            <label><span>{t("fontSize")}</span>
              <input type="number" min="5" max="20" step="0.5" {...sel("fontSize")} /></label>
            <label className="wide"><span>{t("title")}</span>
              <input type="text" placeholder={t("titlePh")} {...sel("title")} /></label>
          </div>
          <div className="checks">
            {desc && <label><input {...check("showSpouses")} /> <span>{t("showSpouses")}</span></label>}
            <label><input {...check("repeat")} /> <span>{t("repeat")}</span></label>
            {!desc && <label><input {...check("motherFirst")} /> <span>{t("motherFirst")}</span></label>}
            <label><input {...check("showIds")} /> <span>{t("showIds")}</span></label>
            <label><input {...check("showDate")} /> <span>{t("showDate")}</span></label>
          </div>
        </details>

        <section className="panel make">
          <div className="row">
            <button className="primary big" type="button" disabled={busy} onClick={() => create()}>
              {busy ? <Loader2 className="icon spin" aria-hidden="true" /> : <FileText className="icon" aria-hidden="true" />}
              {t("go")}</button>
            {result && <a className="btn big" href={result.url} download={result.name}>
              <Download className="icon" aria-hidden="true" />{t("download")}</a>}
            <span className={status?.err ? "status err" : "status"}>{statusText}</span>
          </div>
          {result && <iframe className="preview" style={{ display: "block" }} src={result.url}
                             title={t("preview")} />}
        </section>
      </>}

      <footer>Open source · <a href="https://github.com/r3mus99/gedcom-to-pdf">GitHub</a> · <span>{t("license")}</span></footer>
    </main>
  );
}
