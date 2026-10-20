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

const GENERATIONS = [3, 4, 5, 6, 7, 8, 9, 10];

/** The settings of the tree: what it shows (ancestors or descendants, how many generations) and how it is written; they apply to the chart
 * on the screen, the PDF and the SVG poster alike, and the chart on the screen changes as they do. */
export function SettingsPanel({ form, lang, onChange, t }: Props) {
  const ab = TEXTS[lang].abbr;
  const desc = form.chart === "descendants";
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => onChange(key, e.target.value as Form[K]),
  });
  const check = (key: "showPlaces") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => onChange(key, e.target.checked),
  });
  // a number kept from before that is not among the buttons stays as one more
  const gens = Math.max(0, Math.round(Number(form.generations) || 0));
  const choices = gens && !GENERATIONS.includes(gens) ? [...GENERATIONS, gens].sort((x, y) => x - y) : GENERATIONS;
  // which generations the choice shows, e.g. 3 = children and grandchildren
  const tip = (n: number) => n >= 3 && n <= 5 ? t(`${desc ? "tipD" : "tipA"}${n}` as StringKey) : `${t("generations")} ${n}`;

  return (
  <section className="panel-col set-panel" aria-label={t("settings")}>
    <PanelHead title={t("settings")} />
    <div className="panel-body">
    <div className="set-group">
      <div className="chart-switch set-kind" role="radiogroup">
        <label title={`${t("ancDesc1")}, ${t("ancDesc2")}`}>
          <input type="radio" name="chart" value="ancestors" checked={!desc} onChange={() => onChange("chart", "ancestors")} /><span>{t("anc")}</span></label>
        <label title={`${t("descDesc1")}, ${t("descDesc2")}`}>
          <input type="radio" name="chart" value="descendants" checked={desc} onChange={() => onChange("chart", "descendants")} /><span>{t("desc")}</span></label>
      </div>
      <div className="field">
        <span id="set-gens-label">{t("generations")}</span>
        <div className="chart-switch set-gens" role="group" aria-labelledby="set-gens-label">
          {choices.map((n) => (
            <button key={n} type="button" title={tip(n)} aria-label={tip(n)} aria-pressed={gens === n} className={gens === n ? "on" : undefined}
                    onClick={() => onChange("generations", String(n))}>{n}</button>
          ))}
          <button type="button" title={t("genTipAll")} aria-label={t("genTipAll")} aria-pressed={gens === 0} className={gens === 0 ? "on" : undefined}
                  onClick={() => onChange("generations", "0")}>{t("allGens")}</button>
        </div>
        {gens === 0 && <p className="set-hint">{t("gensHint")}</p>}
      </div>
      <div className="rows">
        <label><span>{t("numbering")}</span>
          <select {...sel("numbering")}>
            {NUMBERING[form.chart].map(([v, key]) => <option key={v} value={v}>{t(key)}</option>)}
          </select></label>
        <label><span>{t("labels")}</span>
          <select {...sel("labels")}>
            <option value="symbols">{`${t("symbols")}  * ∞ †`}</option>
            <option value="abbr">{`${t("abbr")}  ${ab.birt}${ab.marr}${ab.deat}`.trim()}</option>
          </select></label>
        <label><span>{t("dates")}</span>
          <select {...sel("dates")}>
            <option value="year">{t("year")}</option><option value="full">{t("fullDate")}</option>
          </select></label>
        <label className="check" title={t("showPlacesTip")}><input role="switch" {...check("showPlaces")} /><span>{t("showPlaces")}</span></label>
      </div>
    </div>
    </div>
  </section>
  );
}
