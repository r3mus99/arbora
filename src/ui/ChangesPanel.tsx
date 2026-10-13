import type { RecordChange } from "../core/changes";
import { formatDate } from "../core/format";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  changes: RecordChange[];
  lang: Lang;
  /** open a person (by ID) in the chart and the detail */
  onPerson: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** tags with a text of their own in the page languages; any other tag is shown as it is written in the file */
const TAG_TEXT: Record<string, StringKey> = {
  NAME: "thName", SEX: "sex", BIRT: "thBirth", DEAT: "thDeath", CHR: "christening", BURI: "burial", MARR: "marriage",
  DIV: "evDIV", DATE: "date", PLAC: "place", NOTE: "note", RELI: "religion",
};

/** "BIRT/DATE" → "Birth › Date" */
const label = (path: string, t: Props["t"]) => path.split("/").map((tag) => (TAG_TEXT[tag] ? t(TAG_TEXT[tag]) : tag)).join(" › ");

/** The unsaved changes, one block per record: what was added, removed or changed, old value → new value. */
export function ChangesPanel({ changes, lang, onPerson, t }: Props) {
  /** a date is shown the way the detail shows it ("18 Aug 1887"), any other value as written */
  const shown = (path: string, v: string) => (!v ? t("noValue") : path.endsWith("DATE") ? formatDate(v, true, lang) : v);
  return (
    <section className="panel-col" aria-label={t("changes")}>
      <PanelHead title={t("changes")} />
      {!changes.length ? <p className="sp-none panel-body">{t("changesEmpty")}</p> : <ul className="sp-list panel-body">
        {changes.map((c) => (
          <li key={c.xref || c.tag}>
            <div className="chg-head">
              {c.tag === "INDI" && c.xref && c.kind !== "removed"
                ? <button type="button" className="link" onClick={() => onPerson(c.xref!)}>{c.title || c.xref}</button>
                : <span className="sp-title">{c.title || [c.tag, c.xref].filter(Boolean).join(" ")}</span>}
              {c.kind !== "changed" && <span className="sp-count">{t(c.kind === "added" ? "recAdded" : "recRemoved")}</span>}
            </div>
            <ul className="chg-fields">
              {c.fields.map((f) => (
                <li key={f.path + (f.before ?? "") + (f.after ?? "")}>
                  <span className="chg-path">{label(f.path, t)}</span>
                  <span className="chg-val">
                    {f.before !== null && <del>{shown(f.path, f.before)}</del>}
                    {f.before !== null && f.after !== null && <span aria-hidden="true"> → </span>}
                    {f.after !== null && <ins>{shown(f.path, f.after)}</ins>}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>}
    </section>
  );
}
