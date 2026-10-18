import { Download, Loader2, Shuffle } from "lucide-react";
import { useMemo } from "react";
import { POSTER_MAX_GENERATIONS, POSTER_MIN_GENERATIONS, buildPoster, posterSvg } from "../core/poster";
import type { GedcomData } from "../core/gedcom";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { toOptions, type Form } from "./options";
import type { Lang } from "../core/texts";

export type PosterFormat = "svg" | "pdf" | "png";

interface Props {
  data: GedcomData;
  rootId: string;
  form: Form;
  lang: Lang;
  busy: boolean;
  onChange: <K extends keyof Form>(key: K, value: Form[K]) => void;
  onExport: (format: PosterFormat) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const GENERATIONS = Array.from({ length: POSTER_MAX_GENERATIONS - POSTER_MIN_GENERATIONS + 1 }, (_, i) => POSTER_MIN_GENERATIONS + i);

/** The ancestors of the root person as a decorative wall chart: a small preview, a few choices and the downloads. */
export function PosterPanel({ data, rootId, form, lang, busy, onChange, onExport, t }: Props) {
  const { poster, preview } = useMemo(() => {
    const built = buildPoster(data, rootId, toOptions(form, lang));
    return { poster: built, preview: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg(built))}` };
  }, [data, rootId, form, lang]);

  return (
    <section className="panel-col set-panel" aria-label={t("poster")}>
      <PanelHead title={t("poster")} />
      <div className="panel-body">
        <div className="set-group">
          <img className="poster-preview" src={preview} alt={poster.title} width={poster.width} height={poster.height} />
          <p className="poster-hint">{t("posterHint")}</p>
        </div>
        <div className="set-group">
          <div className="grid">
            <div className="poster-field">
              <span>{t("generations")}</span>
              <div className="chart-switch" role="group" aria-label={t("generations")}>
                {GENERATIONS.map((n) => (
                  <button key={n} type="button" aria-pressed={form.posterGens === n} className={form.posterGens === n ? "on" : undefined}
                          onClick={() => onChange("posterGens", n)}>{n}</button>
                ))}
              </div>
            </div>
            <label><span>{t("posterPaper")}</span>
              <select value={form.posterPaper} onChange={(e) => onChange("posterPaper", e.target.value as Form["posterPaper"])}>
                <option value="a3">A3</option><option value="a2">A2</option><option value="a1">A1</option><option value="a0">A0</option>
              </select></label>
            <div className="poster-field">
              <button type="button" title={t("posterNewTip")} aria-label={t("posterNewTip")}
                      onClick={() => onChange("posterSeed", form.posterSeed + 1)}>
                <Shuffle className="icon" aria-hidden="true" />{t("posterNew")}</button>
            </div>
          </div>
        </div>
        <div className="set-group">
          <h3>{t("posterSave")}</h3>
          <div className="poster-save">
            {(["svg", "pdf", "png"] as const).map((f) => (
              <button key={f} type="button" disabled={busy} onClick={() => onExport(f)} title={t(f === "svg" ? "posterSvgTip" : f === "pdf" ? "posterPdfTip" : "posterPngTip")}>
                {busy ? <Loader2 className="icon spin" aria-hidden="true" /> : <Download className="icon" aria-hidden="true" />}
                {f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
