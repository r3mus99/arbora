import { FileImage, FileText, Monitor } from "lucide-react";
import type { ReactNode } from "react";
import { POSTER_MAX_GENERATIONS, POSTER_MIN_GENERATIONS } from "../core/poster";
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

/** A group of settings; the chips say where they apply, so a setting is never mistaken for another output's. */
function Group({ title, scope, children }: { title: string; scope: ReactNode; children: ReactNode }) {
  return (
    <div className="set-group">
      <h3>{title}<span className="scope">{scope}</span></h3>
      {children}
    </div>
  );
}

/** The settings of the chart (screen and PDF), of the PDF page and of the tree poster, in the tool panel; the chart on the screen changes as they do. */
export function SettingsPanel({ form, lang, onChange, t }: Props) {
  const desc = form.chart === "descendants";
  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => onChange(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "colorPdf" | "showResidence" | "posterOnce" | "posterCorners") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => onChange(key, e.target.checked),
  });
  const screen = <span className="chip"><Monitor className="icon" aria-hidden="true" />{t("scopeScreen")}</span>;
  const pdf = <span className="chip"><FileText className="icon" aria-hidden="true" />PDF</span>;
  const svg = <span className="chip"><FileImage className="icon" aria-hidden="true" />SVG</span>;

  return (
  <section className="panel-col set-panel" aria-label={t("settings")}>
    <PanelHead title={t("settings")} />
    <div className="panel-body">
    <Group title={t("setChart")} scope={<>{screen}{pdf}</>}>
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
      </div>
      <div className="checks">
        <label title={t("showResidenceTip")}><input {...check("showResidence")} disabled={form.places === "none"} /> <span>{t("showResidence")}</span></label>
        {desc && <label><input {...check("showSpouses")} /> <span>{t("showSpouses")}</span></label>}
      </div>
    </Group>
    <Group title={t("setPrint")} scope={pdf}>
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
      </div>
      <div className="checks">
        <label title={t("colorPdfTip")}><input {...check("colorPdf")} /> <span>{t("colorPdf")}</span></label>
      </div>
    </Group>
    <Group title={t("setPoster")} scope={svg}>
      <div className="field">
        <span id="poster-gens-label">{t("posterGens")}</span>
        <div className="chart-switch set-gens" role="group" aria-labelledby="poster-gens-label">
          {POSTER_GENERATIONS.map((n) => (
            <button key={n} type="button" aria-pressed={form.posterGenerations === n} className={form.posterGenerations === n ? "on" : undefined}
                    onClick={() => onChange("posterGenerations", n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="checks">
        <label><input {...check("posterOnce")} /> <span>{t("posterOnce")}</span></label>
        <label><input {...check("posterCorners")} /> <span>{t("posterCorners")}</span></label>
      </div>
    </Group>
    </div>
  </section>
  );
}
