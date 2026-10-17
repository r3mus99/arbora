import { GitMerge } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { dateInput, personFields, type PersonFields } from "../core/edit";
import type { GedNode, GedcomData } from "../core/gedcom";
import { MERGE_FIELDS, mergeBlocker, mergeConflicts, mergeValue, type MergeField, type MergePick } from "../core/merge";
import { yearOf } from "../core/date";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";

interface Props {
  data: GedcomData;
  /** every record of the file, to see whether two people may be merged */
  records: GedNode[];
  /** the person whose window is open: the one that is kept */
  keepId: string;
  lang: Lang;
  /** the other person is merged into this one with the picked values */
  onMerge: (dropId: string, pick: MergePick) => void;
  onCancel: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const FIELD_LABEL: Record<MergeField, StringKey> = {
  name: "thName", sex: "sex", birth: "thBirth", christening: "christening", death: "thDeath", burial: "burial",
  religion: "religion", note: "note", restriction: "restriction",
};

/** the person's name with the years and the ID, so two people of one name can be told apart */
const label = (p: GedcomData["people"][string]) => {
  const born = yearOf(p.birth?.date), died = yearOf(p.death?.date);
  return `${p.name || "?"}${born || died ? ` · ${born ?? ""}–${died ?? ""}` : ""} · ${p.id.replace(/@/g, "")}`;
};

/**
 * Merging a duplicate into the person of the open window: pick the other person, see both side by side and keep one
 * value where they differ. Everything else (families, parents, associations, rows both have) is joined without asking.
 */
export function MergePanel({ data, records, keepId, lang, onMerge, onCancel, t }: Props) {
  const list = useId();
  const [text, setText] = useState("");
  const [pick, setPick] = useState<MergePick>({});
  const options = useMemo(() => Object.values(data.people).filter((p) => p.id !== keepId).map((p) => ({ id: p.id, label: label(p) }))
    .sort((a, b) => a.label.localeCompare(b.label)), [data, keepId]);
  const other = options.find((o) => o.label === text)?.id;
  const fields = (id: string): PersonFields => personFields(records.find((r) => r.xref === id)!);
  const blocked = other ? mergeBlocker(records, keepId, other) : null;
  const a = other ? fields(keepId) : null, b = other ? fields(other) : null;
  const conflicts = a && b ? mergeConflicts(a, b) : [];
  const show = (f: PersonFields, field: MergeField) => {
    if (field === "birth" || field === "christening" || field === "death" || field === "burial") {
      return [dateInput(f[field].date, lang), f[field].place].filter(Boolean).join(", ");
    }
    return field === "sex" ? (f.sex === "M" ? t("male") : f.sex === "F" ? t("female") : f.sex) : mergeValue(f, field);
  };
  const rows = a && b ? MERGE_FIELDS.filter((field) => mergeValue(a, field) || mergeValue(b, field)) : [];
  return <div className="merge">
    <p className="muted">{t("mergeInfo")}</p>
    <label title={t("tipMergePick")}><span>{t("mergeWith")}</span>
      <input type="text" list={list} value={text} autoFocus autoComplete="off" placeholder={t("pickPerson")} onChange={(e) => { setText(e.target.value); setPick({}); }} />
      <datalist id={list}>{text.length >= 2 && options.slice(0, 5000).map((o) => <option key={o.id} value={o.label} />)}</datalist>
    </label>
    {blocked === "related" && <p className="warn-text" role="alert">{t("mergeRelated")}</p>}
    {a && b && !blocked && <table className="merge-table">
      <thead><tr><th /><th>{t("mergeThis")}</th><th>{t("mergeOther")}</th></tr></thead>
      <tbody>
        {rows.map((field) => {
          const va = show(a, field), vb = show(b, field), conflict = conflicts.includes(field);
          const side = (which: "keep" | "drop", value: string) => <td key={which} className={value ? undefined : "none"}>
            {conflict ? <label className="check"><input type="radio" name={`merge-${field}`} checked={(pick[field] ?? "keep") === which}
                                                       onChange={() => setPick({ ...pick, [field]: which })} /><span>{value}</span></label> : value || "–"}
          </td>;
          return <tr key={field} className={conflict ? "conflict" : undefined}><th scope="row">{t(FIELD_LABEL[field])}</th>{side("keep", va)}{side("drop", vb)}</tr>;
        })}
      </tbody>
    </table>}
    <div className="kid-actions">
      <button type="button" onClick={onCancel}>{t("cancel")}</button>
      <button type="button" className="primary" disabled={!other || !!blocked} onClick={() => other && onMerge(other, pick)}>
        <GitMerge className="icon" aria-hidden="true" />{t("mergeDo")}</button>
    </div>
  </div>;
}
