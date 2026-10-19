import { FileImage, FileText, Monitor } from "lucide-react";
import { useState, type ReactNode } from "react";
import { POSTER_EXTRAS_MIN_GENERATIONS, POSTER_MAX_GENERATIONS, POSTER_MIN_GENERATIONS } from "../core/poster";
import { TEXTS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { NUMBERING, type Form } from "./options";

interface Props {
  form: Form;
  lang: Lang;
  onChange: <K extends keyof Form>(key: K, value: Form[K]) => void;
  t: (key: StringKey) => string;
}

const POSTER_GENERATIONS = Array.from({ length: POSTER_MAX_GENERATIONS - POSTER_MIN_GENERATIONS + 1 }, (_, i) => POSTER_MIN_GENERATIONS + i);

type Scope = "screen" | "pdf" | "svg";
const CHART: Scope[] = ["screen", "pdf"];
const EVERYWHERE: Scope[] = ["screen", "pdf", "svg"];

/** The settings of the chart (screen and PDF), of the PDF page and of the tree poster, in the tool panel; the chart on the screen changes as they do.
 * The chips in the title row name the outputs; the one under the pointer (or focus) lights the outputs a setting changes. */
export function SettingsPanel({ form, lang, onChange, t }: Props) {
  const [hot, setHot] = useState<Scope[]>([]);
  const scoped = (scopes: Scope[]) => ({
    onMouseEnter: () => setHot(scopes), onMouseLeave: () => setHot([]),
    onFocus: () => setHot(scopes), onBlur: () => setHot([]),
  });
  const desc = form.chart === "descendants";
  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => onChange(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "colorPdf" | "showResidence" | "posterCorners") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => onChange(key, e.target.checked),
  });
  const chip = (scope: Scope, icon: ReactNode, text: string, tip: string) =>
    <span className={`chip${hot.includes(scope) ? " on" : ""}`} title={tip}>{icon}{text}</span>;
  const extras = form.posterGenerations >= POSTER_EXTRAS_MIN_GENERATIONS;

  return (
  <section className="panel-col set-panel" aria-label={t("settings")}>
    <PanelHead title={t("settings")} />
    <div className="panel-body">
    <div className="set-legend" aria-hidden="true">
      {chip("screen", <Monitor className="icon" />, t("scopeScreen"), t("tipScreen"))}
      {chip("pdf", <FileText className="icon" />, "PDF", t("tipPdf"))}
      {chip("svg", <FileImage className="icon" />, "SVG", t("tipSvg"))}
    </div>
    <div className="set-group">
      <h3 {...scoped(CHART)}>{t("setChart")}</h3>
      <div className="grid">
        <label {...scoped(EVERYWHERE)}><span>{t("labels")}</span>
          <select {...sel("labels")}>
            <option value="symbols">{`${t("symbols")}  * ∞ †`}</option>
            <option value="abbr">{`${t("abbr")}  ${ab.birt}${ab.marr}${ab.deat}`.trim()}</option>
          </select></label>
        <label {...scoped(EVERYWHERE)}><span>{t("dates")}</span>
          <select {...sel("dates")}>
            <option value="year">{t("year")}</option><option value="full">{t("fullDate")}</option>
          </select></label>
        <label {...scoped(CHART)}><span>{t("places")}</span>
          <select {...sel("places")}>
            <option value="none">{t("noPlaces")}</option><option value="short">{t("shortPlace")}</option>
            <option value="full">{t("fullPlace")}</option>
          </select></label>
        <label {...scoped(CHART)}><span>{t("numbering")}</span>
          <select {...sel("numbering")}>
            {NUMBERING[form.chart].map(([v, key]) => <option key={v} value={v}>{t(key)}</option>)}
          </select></label>
      </div>
      <div className="checks">
        <label title={t("showResidenceTip")} {...scoped(CHART)}><input {...check("showResidence")} disabled={form.places === "none"} /> <span>{t("showResidence")}</span></label>
        {desc && <label {...scoped(CHART)}><input {...check("showSpouses")} /> <span>{t("showSpouses")}</span></label>}
      </div>
    </div>
    <div className="set-group">
      <h3 {...scoped(["pdf"])}>{t("setPrint")}</h3>
      <div className="grid">
        <label {...scoped(["pdf"])}><span>{t("pageSize")}</span>
          <select {...sel("pageSize")}>
            <option value="a4">A4</option><option value="a3">A3</option><option value="a5">A5</option>
            <option value="letter">Letter</option><option value="legal">Legal</option>
          </select></label>
        <label {...scoped(["pdf"])}><span>{t("orientation")}</span>
          <select {...sel("orientation")}>
            <option value="portrait">{t("portrait")}</option><option value="landscape">{t("landscape")}</option>
          </select></label>
      </div>
      <div className="checks">
        <label title={t("colorPdfTip")} {...scoped(["pdf"])}><input {...check("colorPdf")} /> <span>{t("colorPdf")}</span></label>
      </div>
    </div>
    <div className="set-group">
      <h3 {...scoped(["svg"])}>{t("setPoster")}</h3>
      <div className="field" {...scoped(["svg"])}>
        <span id="poster-gens-label">{t("posterGens")}</span>
        <div className="chart-switch set-gens" role="group" aria-labelledby="poster-gens-label">
          {POSTER_GENERATIONS.map((n) => (
            <button key={n} type="button" aria-pressed={form.posterGenerations === n} className={form.posterGenerations === n ? "on" : undefined}
                    onClick={() => onChange("posterGenerations", n)}>{n}</button>
          ))}
        </div>
      </div>
      {extras && <div className="checks">
        <label {...scoped(["svg"])}><input {...check("posterCorners")} /> <span>{t("posterCorners")}</span></label>
      </div>}
    </div>
    </div>
  </section>
  );
}
