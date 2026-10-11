import { Check, Copy, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  PERSON_EVENTS, applyFamily, applyPerson, dateInput, familyFields, parseDate, personFields, type EventFields,
  type FamilyFields, type Occupation, type PersonFields,
} from "../core/edit";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";

interface Props {
  data: GedcomData;
  /** the person's record and the records of the families where they are a spouse */
  record: GedNode;
  families: GedNode[];
  lang: Lang;
  /** surnames and places in the file, offered while typing */
  suggest: { surnames: string[]; places: string[] };
  /** changed records only; nothing when nothing changed */
  onSave: (changed: GedNode[]) => void;
  onCancel: () => void;
  t: (key: StringKey) => string;
}

const EVENT_LABEL: Record<(typeof PERSON_EVENTS)[number], StringKey> = {
  birth: "thBirth", christening: "christening", death: "thDeath", burial: "burial",
};

/** dates as shown in the form, the stored GEDCOM date otherwise */
const shownEvent = (e: EventFields, lang: Lang): EventFields => ({ ...e, date: dateInput(e.date, lang) });

function DateField({ value, shown, lang, onChange, t }: {
  value: string; shown: string; lang: Lang; onChange: (v: string) => void; t: (key: StringKey) => string;
}) {
  const parsed = value !== shown && value.trim() ? parseDate(value, lang) : null;
  return <label><span>{t("date")}</span>
    <input type="text" value={value} title={t("dateHint")} onChange={(e) => onChange(e.target.value)} />
    {/* how the typed date is understood, as it will be stored */}
    {parsed && <small className={parsed.ok ? "hint" : "hint warn"}>
      {parsed.ok ? `→ ${parsed.value}` : t("datePhrase")}</small>}
  </label>;
}

// the lists of suggestions, once per page
const SURNAMES = "arbora-surnames", PLACES = "arbora-places";

/** christening and burial can take the date and place of birth and death */
const COPY_FROM: Partial<Record<(typeof PERSON_EVENTS)[number], ["birth" | "death", StringKey]>> = {
  christening: ["birth", "copyBirth"], burial: ["death", "copyDeath"],
};

/** Form for the facts of one person and of their marriages. */
export function PersonEditor({ data, record, families, lang, suggest, onSave, onCancel, t }: Props) {
  const [initial] = useState(() => {
    const f = personFields(record);
    const shown = { ...f };
    for (const key of PERSON_EVENTS) shown[key] = shownEvent(f[key], lang);
    shown.occupations = f.occupations.map((o) => ({ ...o, ...shownEvent(o, lang) }));
    const fams = families.map((r) => {
      const ff = familyFields(r);
      return { stored: ff, shown: { ...ff, marriage: shownEvent(ff.marriage, lang) } };
    });
    return { stored: f, shown, fams };
  });
  const [form, setForm] = useState<PersonFields>(initial.shown);
  const [fams, setFams] = useState<FamilyFields[]>(initial.fams.map((f) => f.shown));
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => firstInput.current?.focus(), []);

  /** the typed date as GEDCOM, or the stored one when the field was not touched */
  const date = (typed: string, shown: string, stored: string) => (typed === shown ? stored : parseDate(typed, lang).value);

  const save = () => {
    const after: PersonFields = { ...form };
    for (const key of PERSON_EVENTS) {
      after[key] = { ...form[key], date: date(form[key].date, initial.shown[key].date, initial.stored[key].date) };
    }
    after.occupations = form.occupations.map((o) => (o.origin < 0 ? { ...o, date: parseDate(o.date, lang).value } : {
      ...o, date: date(o.date, initial.shown.occupations[o.origin].date, initial.stored.occupations[o.origin].date),
    }));
    const changed: GedNode[] = [];
    const rec = applyPerson(record, initial.stored, after);
    if (rec !== record) changed.push(rec);
    families.forEach((r, i) => {
      const { stored, shown } = initial.fams[i];
      const f = fams[i];
      const next = applyFamily(r, stored, {
        ...f, marriage: { ...f.marriage, date: date(f.marriage.date, shown.marriage.date, stored.marriage.date) },
      });
      if (next !== r) changed.push(next);
    });
    onSave(changed);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  };

  const set = <K extends keyof PersonFields>(key: K, value: PersonFields[K]) => setForm({ ...form, [key]: value });
  const setOcc = (i: number, patch: Partial<Occupation>) =>
    set("occupations", form.occupations.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setFam = (i: number, patch: Partial<FamilyFields>, marriage: Partial<EventFields> = {}) =>
    setFams(fams.map((f, j) => (j === i ? { ...f, ...patch, marriage: { ...f.marriage, ...marriage } } : f)));
  const event = (key: (typeof PERSON_EVENTS)[number]) => {
    const from = COPY_FROM[key];
    const source = from && form[from[0]];
    return <fieldset key={key}>
      <legend>{t(EVENT_LABEL[key])}</legend>
      {from && <button type="button" className="copy" disabled={!source?.date && !source?.place}
                       onClick={() => set(key, { ...source! })}>
        <Copy className="icon" aria-hidden="true" />{t(from[1])}</button>}
      <DateField value={form[key].date} shown={initial.shown[key].date} lang={lang} t={t}
                 onChange={(v) => set(key, { ...form[key], date: v })} />
      <label><span>{t("place")}</span>
        <input type="text" value={form[key].place} list={PLACES}
               onChange={(e) => set(key, { ...form[key], place: e.target.value })} />
      </label>
    </fieldset>;
  };
  const spouseName = (r: GedNode) => {
    const f = data.families[r.xref || ""];
    const other = f && (f.husb === record.xref ? f.wife : f.husb);
    return (other && data.people[other]?.name) || "?";
  };

  return (
    <form className="editor" onKeyDown={onKey} onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="pair">
        <label><span>{t("givenName")}</span>
          <input ref={firstInput} type="text" value={form.given} onChange={(e) => set("given", e.target.value)} /></label>
        <label><span>{t("surname")}</span>
          <input type="text" value={form.surname} list={SURNAMES}
                 onChange={(e) => set("surname", e.target.value)} /></label>
      </div>
      <div className="sex" role="radiogroup" aria-label={t("sex")}>
        <span>{t("sex")}</span>
        {([["M", "male"], ["F", "female"], [form.sex === "" ? "" : "U", "sexUnknown"]] as [string, StringKey][])
          .map(([value, key]) => <label key={key}>
            <input type="radio" name="sex" value={value} checked={form.sex === value}
                   onChange={() => set("sex", value)} /> {t(key)}</label>)}
        {!["M", "F", "U", ""].includes(form.sex) && <label>
          <input type="radio" name="sex" checked readOnly /> {form.sex}</label>}
      </div>
      {PERSON_EVENTS.map(event)}
      <fieldset className="list">
        <legend>{t("occupation")}</legend>
        {form.occupations.map((o, i) => (
          <div className="item" key={o.origin < 0 ? `new${i}` : o.origin}>
            <div className="item-head">
              <input type="text" value={o.value} aria-label={t("occupation")}
                     onChange={(e) => setOcc(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("occupations", form.occupations.filter((_, j) => j !== i))}>
                <X className="icon" aria-hidden="true" /></button>
            </div>
            <DateField value={o.date} shown={o.origin < 0 ? "" : initial.shown.occupations[o.origin].date} lang={lang}
                       t={t} onChange={(v) => setOcc(i, { date: v })} />
            <label><span>{t("place")}</span>
              <input type="text" value={o.place} list={PLACES}
                     onChange={(e) => setOcc(i, { place: e.target.value })} /></label>
          </div>
        ))}
        <button type="button" className="add" onClick={() => set("occupations",
          [...form.occupations, { origin: -1, value: "", date: "", place: "" }])}>
          <Plus className="icon" aria-hidden="true" />{t("addOccupation")}</button>
      </fieldset>
      {families.map((r, i) => (
        <fieldset key={r.xref}>
          <legend>{t("marriage")} · {spouseName(r)}</legend>
          <DateField value={fams[i].marriage.date} shown={initial.fams[i].shown.marriage.date} lang={lang} t={t}
                     onChange={(v) => setFam(i, {}, { date: v })} />
          <label><span>{t("place")}</span>
            <input type="text" value={fams[i].marriage.place} list={PLACES}
                   onChange={(e) => setFam(i, {}, { place: e.target.value })} />
          </label>
          <label className="check"><input type="checkbox" checked={fams[i].divorced}
                   onChange={(e) => setFam(i, { divorced: e.target.checked })} />
            <span>{t("divorcedLabel")}</span></label>
        </fieldset>
      ))}
      <label><span>{t("note")}</span>
        <textarea rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
      <datalist id={SURNAMES}>{suggest.surnames.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id={PLACES}>{suggest.places.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="actions">
        <button className="primary" type="submit" title="Ctrl+Enter">
          <Check className="icon" aria-hidden="true" />{t("save")}</button>
        <button type="button" onClick={onCancel} title="Esc"><X className="icon" aria-hidden="true" />{t("cancel")}</button>
      </div>
    </form>
  );
}
