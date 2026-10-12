import { Settings, X } from "lucide-react";
import type { RefObject } from "react";
import { TEXTS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { NUMBERING, type Form } from "./options";

interface Props {
  /** the dialog element, so the page can open it with `showModal()` */
  ref: RefObject<HTMLDialogElement | null>;
  form: Form;
  lang: Lang;
  onChange: <K extends keyof Form>(key: K, value: Form[K]) => void;
  t: (key: StringKey) => string;
}

/** The settings of the chart and of the PDF, in a dialog. */
export function SettingsDialog({ ref, form, lang, onChange, t }: Props) {
  const desc = form.chart === "descendants";
  const ab = TEXTS[lang].abbr;
  const sel = <K extends keyof Form>(key: K) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => onChange(key, e.target.value as Form[K]),
  });
  const check = (key: "showSpouses" | "showDate") => ({
    type: "checkbox", checked: form[key],
    onChange: (e: { target: { checked: boolean } }) => onChange(key, e.target.checked),
  });

  return (
  <dialog className="settings-dialog" ref={ref} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
    <div className="dialog-head"><Settings className="icon" aria-hidden="true" /><h2>{t("step3")}</h2>
      <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label={t("cancel")}>
        <X className="icon" aria-hidden="true" /></button></div>
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
    <div className="dialog-foot"><button type="button" className="primary" onClick={() => ref.current?.close()}>
      OK</button></div>
  </dialog>
  );
}
