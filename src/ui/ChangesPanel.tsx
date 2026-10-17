import { readableFields, type FieldChange, type RecordChange } from "../core/changes";
import type { GedcomData } from "../core/gedcom";
import { formatDate } from "../core/format";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  changes: RecordChange[];
  /** the current file, to show people and families by name instead of by ID */
  data: GedcomData | null;
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

/** "BIRT/DATE" → "Birth" (the date is the event's main value), "BIRT/PLAC" → "Birth › Place", "CHIL" → "Children" */
const REF_TEXT: Record<string, StringKey> = { FAMC: "parents", FAMS: "spouses", HUSB: "spouse", WIFE: "spouse", CHIL: "children" };
const label = (path: string, t: Props["t"]) => {
  const tags = path.split("/");
  if (tags.length > 1 && tags[tags.length - 1] === "DATE") tags.pop();
  return tags.map((tag) => (TAG_TEXT[tag] ? t(TAG_TEXT[tag]) : REF_TEXT[tag] ? t(REF_TEXT[tag]) : tag)).join(" › ");
};

/** The unsaved changes, one block per record: what was added, removed or changed, as plain lines, with the raw tags on demand. */
export function ChangesPanel({ changes, data, lang, onPerson, t }: Props) {
  const person = (id: string) => data?.people[id]?.name || id;
  const family = (id: string) => {
    const f = data?.families[id];
    const names = f ? [f.husb, f.wife].filter((x): x is string => !!x).map(person) : [];
    return names.join(" & ");
  };
  /** a date is shown the way the detail shows it ("18 Aug 1887"), a link to a person or family by names, any other value as written */
  const shown = (f: FieldChange, v: string) => {
    if (!v) return t("noValue");
    const tag = f.path.split("/").pop()!;
    if (tag === "CHIL" || tag === "HUSB" || tag === "WIFE") return person(v);
    if (tag === "FAMC" || tag === "FAMS") return family(v) || v;
    if (f.path === "SEX") return v === "M" ? t("male") : v === "F" ? t("female") : v;
    return tag === "DATE" ? formatDate(v, true, lang) : v;
  };
  const titleOf = (c: RecordChange) => c.title || (c.tag === "FAM" && c.xref && family(c.xref)) || [c.tag, c.xref].filter(Boolean).join(" ");
  return (
    <section className="panel-col" aria-label={t("changes")}>
      <PanelHead title={t("changes")} />
      {!changes.length ? <p className="sp-none panel-body">{t("changesEmpty")}</p> : <ul className="sp-list panel-body">
        {changes.map((c) => (
          <li key={c.xref || c.tag}>
            <div className="chg-head">
              {c.tag === "INDI" && c.xref && c.kind !== "removed"
                ? <button type="button" className="link" onClick={() => onPerson(c.xref!)}>{c.title || c.xref}</button>
                : <span className="sp-title">{titleOf(c)}</span>}
              {c.kind !== "changed" && <span className="sp-count">{t(c.kind === "added" ? "recAdded" : "recRemoved")}</span>}
            </div>
            <ul className="chg-fields">
              {readableFields(c).map((f) => (
                <li key={f.path + (f.before ?? "") + (f.after ?? "")}>
                  <span className="chg-path">{label(f.path, t)}</span>
                  <span className="chg-val">
                    {f.before !== null && <del>{shown(f, f.before)}</del>}
                    {f.before !== null && f.after !== null && <span aria-hidden="true"> → </span>}
                    {f.after !== null && <ins>{shown(f, f.after)}</ins>}
                  </span>
                </li>
              ))}
            </ul>
            <details className="chg-raw">
              <summary>GEDCOM</summary>
              <pre>{c.fields.map((f) => `${f.before !== null ? `− ${f.path} ${f.before}\n` : ""}${f.after !== null ? `+ ${f.path} ${f.after}\n` : ""}`).join("")}</pre>
            </details>
          </li>
        ))}
      </ul>}
    </section>
  );
}
