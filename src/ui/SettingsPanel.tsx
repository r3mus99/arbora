import { POSTER_BASE_GENERATIONS, POSTER_MAX_GENERATIONS, POSTER_MIN_GENERATIONS } from "../core/poster";
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

/** The settings of the chart and of the PDF, in the tool panel; the chart on the screen changes as they do. */
export function SettingsPanel({ form, lang, onChange, t }: Props) {
  const desc = form.chart === "descendants";
  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => onChange(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "showDate" | "colorPdf" | "showResidence" | "posterOnce") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => onChange(key, e.target.checked),
  });

  return (
  <section className="panel-col set-panel" aria-label={t("settings")}>
    <PanelHead title={t("settings")} />
    <div className="panel-body">
    <div className="set-group">
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
      </div>
      <div className="checks">
        <label><input {...check("showResidence")} disabled={form.places === "none"} /> <span>{t("showResidence")}</span></label>
        {desc && <label><input {...check("showSpouses")} /> <span>{t("showSpouses")}</span></label>}
      </div>
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
        <label><input {...check("colorPdf")} /> <span>{t("colorPdf")}</span></label>
      </div>
    </div>
    <div className="set-group">
      <h3>{t("setPoster")}</h3>
      <div className="grid">
        <label><span>{t("posterGens")}</span>
          <select value={Math.min(POSTER_MAX_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(form.posterGenerations) || POSTER_BASE_GENERATIONS))}
                  onChange={(e) => onChange("posterGenerations", Number(e.target.value))}>
            {Array.from({ length: POSTER_MAX_GENERATIONS - POSTER_MIN_GENERATIONS + 1 }, (_, i) => POSTER_MIN_GENERATIONS + i).map((n) => <option key={n} value={n}>{n}</option>)}
          </select></label>
      </div>
      <div className="checks">
        <label><input {...check("posterOnce")} /> <span>{t("posterOnce")}</span></label>
      </div>
    </div>
    </div>
  </section>
  );
}
