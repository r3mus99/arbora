import { Copy, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  PERSON_EVENTS, applyFamily, applyPerson, dateInput, familyFields, parseDate, personFields, type EventFields,
  type Alias, type Suggestions, type FamilyFields, type Occupation, type PersonFields,
} from "../core/edit";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { Lang } from "../core/texts";
import { surnamesFor } from "../core/surnames";
import { SECTIONS } from "./editSections";
import type { StringKey } from "./i18n";
import { Section } from "./Section";

interface Props {
  data: GedcomData;
  /** the person's record and the records of the families where they are a spouse */
  record: GedNode;
  families: GedNode[];
  lang: Lang;
  /** surnames and places in the file, offered while typing */
  suggest: Suggestions;
  /** changed records only; nothing when nothing changed */
  onSave: (changed: GedNode[]) => void;
  onCancel: () => void;
  /** whether the form differs from the record as it was opened */
  onDirty?: (dirty: boolean) => void;
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

/** the form's id, so the icon buttons in the detail header can submit it */
export const EDITOR_FORM = "person-editor";

// the lists of suggestions, once per page
/** the list of given names used for the person's sex in the file, all of them when it is not known */
export const givenList = (sex: string) => (sex === "M" ? GIVENS_M : sex === "F" ? GIVENS_F : GIVENS);
/** the list of surnames that fits the person's sex (the male or female forms), all of them when it is not known */
export const surnameList = (sex: string) => (sex === "M" ? SURNAMES_M : sex === "F" ? SURNAMES_F : SURNAMES);

export const GIVENS = "arbora-givens", GIVENS_M = "arbora-givens-m", GIVENS_F = "arbora-givens-f", SURNAMES = "arbora-surnames", SURNAMES_M = "arbora-surnames-m", SURNAMES_F = "arbora-surnames-f", PLACES = "arbora-places", RELIGIONS = "arbora-religions";

type Suggest = Props["suggest"];

/** the lists of suggestions that the fields of the form and of the detail point to */
export function SuggestLists({ suggest, lang }: { suggest: Suggest; lang: Lang }) {
  const male = useMemo(() => surnamesFor(suggest.surnames, "M", lang), [suggest.surnames, lang]);
  const female = useMemo(() => surnamesFor(suggest.surnames, "F", lang), [suggest.surnames, lang]);
  return <>
    <datalist id={GIVENS}>{suggest.givens.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={GIVENS_M}>{suggest.givensM.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={GIVENS_F}>{suggest.givensF.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={SURNAMES}>{suggest.surnames.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={SURNAMES_M}>{male.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={SURNAMES_F}>{female.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={PLACES}>{suggest.places.map((s) => <option key={s} value={s} />)}</datalist>
    <datalist id={RELIGIONS}>{suggest.religions.map((s) => <option key={s} value={s} />)}</datalist>
  </>;
}

/** christening and burial can take the date and place of birth and death */
const COPY_FROM: Partial<Record<(typeof PERSON_EVENTS)[number], ["birth" | "death", StringKey]>> = {
  christening: ["birth", "copyBirth"], burial: ["death", "copyDeath"],
};

/** Form for the facts of one person and of their marriages. */
export function PersonEditor({ data, record, families, lang, suggest, onSave, onCancel, onDirty, t }: Props) {
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
  const [opened] = useState(() => JSON.stringify([initial.shown, initial.fams.map((f) => f.shown)]));
  const dirty = JSON.stringify([form, fams]) !== opened;
  useEffect(() => onDirty?.(dirty), [dirty, onDirty]);

  /** the typed date as GEDCOM, or the stored one when the field was not touched */
  const date = (typed: string, shown: string, stored: string) => (typed === shown ? stored : parseDate(typed, lang).value);

  const save = () => {
    const after: PersonFields = { ...form };
    for (const key of PERSON_EVENTS) {
      after[key] = { ...form[key], date: date(form[key].date, initial.shown[key].date, initial.stored[key].date) };
    }
    if (!form.deceased) after.death = after.burial = { date: "", place: "" };
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
  const setPart = (patch: Partial<PersonFields["nameParts"]>) => set("nameParts", { ...form.nameParts, ...patch });
  const setOcc = (i: number, patch: Partial<Occupation>) =>
    set("occupations", form.occupations.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setAlias = (i: number, patch: Partial<Alias>) =>
    set("aliases", form.aliases.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setFam = (i: number, patch: Partial<FamilyFields>, marriage: Partial<EventFields> = {}) =>
    setFams(fams.map((f, j) => (j === i ? { ...f, ...patch, marriage: { ...f.marriage, ...marriage } } : f)));
  const event = (key: (typeof PERSON_EVENTS)[number]) => {
    const from = COPY_FROM[key];
    const source = from && form[from[0]];
    return <fieldset key={key}>
      <legend>{t(EVENT_LABEL[key])}</legend>
      <DateField value={form[key].date} shown={initial.shown[key].date} lang={lang} t={t}
                 onChange={(v) => set(key, { ...form[key], date: v })} />
      <label><span>{t("place")}</span>
        <input type="text" value={form[key].place} list={PLACES}
               onChange={(e) => set(key, { ...form[key], place: e.target.value })} />
      </label>
      {from && <button type="button" className="copy" disabled={!source?.date && !source?.place}
                       onClick={() => set(key, { ...source! })}>
        <Copy className="icon" aria-hidden="true" />{t(from[1])}</button>}
    </fieldset>;
  };
  const spouseName = (r: GedNode) => {
    const f = data.families[r.xref || ""];
    const other = f && (f.husb === record.xref ? f.wife : f.husb);
    return (other && data.people[other]?.name) || "?";
  };

  const section = (key: keyof typeof SECTIONS, children: ReactNode) => {
    const { icon, title } = SECTIONS[key];
    return <Section icon={icon} title={t(title)}><div className="sec-fields">{children}</div></Section>;
  };
  return (
    <form id={EDITOR_FORM} className="editor" onKeyDown={onKey} onSubmit={(e) => { e.preventDefault(); save(); }}>
      {section("name", <>
      <div className="pair">
        <label><span>{t("givenName")}</span>
          <input ref={firstInput} type="text" value={form.given} list={givenList(form.sex)} onChange={(e) => set("given", e.target.value)} /></label>
        <label><span>{t("surname")}</span>
          <input type="text" value={form.surname} list={surnameList(form.sex)}
                 onChange={(e) => set("surname", e.target.value)} /></label>
      </div>
      <div className="pair">
        <label><span>{t("namePrefix")}</span>
          <input type="text" value={form.nameParts.prefix} onChange={(e) => setPart({ prefix: e.target.value })} /></label>
        <label><span>{t("nameSuffix")}</span>
          <input type="text" value={form.nameParts.suffix} onChange={(e) => setPart({ suffix: e.target.value })} /></label>
      </div>
      <div className="pair">
        <label><span>{t("nickname")}</span>
          <input type="text" value={form.nameParts.nickname} onChange={(e) => setPart({ nickname: e.target.value })} /></label>
        <label><span>{t("surnamePrefix")}</span>
          <input type="text" value={form.nameParts.surnamePrefix} onChange={(e) => setPart({ surnamePrefix: e.target.value })} /></label>
      </div>
      <fieldset className="list">
        <legend>{t("aka")}</legend>
        {form.aliases.map((a, i) => (
          <div className="item alias" key={a.origin < 0 ? `new${i}` : a.origin}>
            <input type="text" value={a.given} list={givenList(form.sex)} aria-label={t("givenName")} placeholder={t("givenName")}
                   onChange={(e) => setAlias(i, { given: e.target.value })} />
            <input type="text" value={a.surname} list={surnameList(form.sex)} aria-label={t("surname")} placeholder={t("surname")}
                   onChange={(e) => setAlias(i, { surname: e.target.value })} />
            <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                    onClick={() => set("aliases", form.aliases.filter((_, j) => j !== i))}>
              <X className="icon" aria-hidden="true" /></button>
          </div>
        ))}
        <button type="button" className="add" onClick={() => set("aliases",
          [...form.aliases, { origin: -1, given: form.given, surname: form.surname }])}>
          <Plus className="icon" aria-hidden="true" />{t("addAka")}</button>
      </fieldset>
      </>)}
      {section("basic", <>
      <div className="sex-field">
        <span>{t("sex")}</span>
        <div className="sex" role="radiogroup" aria-label={t("sex")}>
        {([["M", "male"], ["F", "female"], [form.sex === "" ? "" : "U", "sexUnknown"]] as [string, StringKey][])
          .map(([value, key]) => <label key={key}>
            <input type="radio" name="sex" value={value} checked={form.sex === value}
                   onChange={() => set("sex", value)} /> {t(key)}</label>)}
        {!["M", "F", "U", ""].includes(form.sex) && <label>
          <input type="radio" name="sex" checked readOnly /> {form.sex}</label>}
        </div>
      </div>
      {/* death and burial only for someone who died; unticking hides them and saving clears them,
          ticking again before saving brings them back */}
      <label className="check">
        <input type="checkbox" checked={form.deceased}
               onChange={(e) => set("deceased", e.target.checked)} />
        <span>{t(form.sex === "M" ? "deceasedM" : form.sex === "F" ? "deceasedF" : "deceased")}</span></label>
      <label><span>{t("religion")}</span>
        <input type="text" value={form.religion} list={RELIGIONS}
               onChange={(e) => set("religion", e.target.value)} /></label>
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
      </>)}
      {section("events", <>
      {event("birth")}
      {event("christening")}
      {form.deceased && <>{event("death")}{event("burial")}</>}
      </>)}
      {section("notes", <>
      <label><span>{t("note")}</span>
        <textarea rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
      </>)}
      {section("families", <>
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
      {families.length === 0 && <span className="muted">{t("noValue")}</span>}
      </>)}
      <SuggestLists suggest={suggest} lang={lang} />
    </form>
  );
}
