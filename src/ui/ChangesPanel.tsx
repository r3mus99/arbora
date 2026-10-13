import type { RecordChange } from "../core/changes";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  changes: RecordChange[];
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
export function ChangesPanel({ changes, onPerson, t }: Props) {
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
                  {f.before !== null && <del>{f.before || t("noValue")}</del>}
                  {f.before !== null && f.after !== null && <span aria-hidden="true">→</span>}
                  {f.after !== null && <ins>{f.after || t("noValue")}</ins>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>}
    </section>
  );
}
