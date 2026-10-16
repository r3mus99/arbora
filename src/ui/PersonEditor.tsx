import { Copy, Plus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  OTHER_EVENT_TAGS, PERSON_EVENTS, applyFamily, applyPerson, dateInput, familyFields, parseDate, personFields, relinkFamily, type EventFields,
  type Alias, type AttributeRow, type CitationRow, type EventDetailFields, type EventRow, type Suggestions, type FamilyFields, type Occupation, type PersonFields,
} from "../core/edit";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { SourceChoice } from "../core/sources";
import type { Lang } from "../core/texts";
import { surnamesFor } from "../core/surnames";
import { ATTRIBUTE_TAGS } from "../core/facts";
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
  /** the record of a person in the file, to change the links of the family members */
  recordOf: (id: string) => GedNode | undefined;
  /** the source records of the file, offered when citing a source */
  sources: SourceChoice[];
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

type NamePartKey = keyof PersonFields["nameParts"];
/** the optional parts of a name, in the order they are offered */
const NAME_PARTS: [NamePartKey, StringKey][] = [["prefix", "namePrefix"], ["suffix", "nameSuffix"], ["nickname", "nickname"], ["surnamePrefix", "surnamePrefix"]];

/** Picking a person of the file by typing a name; `onPick("")` when the field is emptied. */
function PersonPick({ choices, exclude, value, label, placeholder, clearOnPick, onPick }: {
  choices: { id: string; label: string }[]; exclude: string[]; value: string; label: string; placeholder: string;
  clearOnPick?: boolean; onPick: (id: string) => void;
}) {
  const list = useId();
  const shown = choices.find((c) => c.id === value)?.label || "";
  const [text, setText] = useState(shown);
  const options = useMemo(() => choices.filter((c) => !exclude.includes(c.id)), [choices, exclude]);
  const change = (typed: string) => {
    const hit = options.find((c) => c.label === typed);
    if (hit) { onPick(hit.id); setText(clearOnPick ? "" : typed); }
    else { setText(typed); if (!typed.trim() && value) onPick(""); }
  };
  return <label><span>{label}</span>
    <input type="text" value={text} list={list} placeholder={placeholder} autoComplete="off" onChange={(e) => change(e.target.value)} />
    <datalist id={list}>{text.length >= 2 && options.slice(0, 5000).map((c) => <option key={c.id} value={c.label} />)}</datalist>
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

const QUALITY = ["3", "2", "1", "0"];
const NO_DETAILS: EventDetailFields = { age: "", cause: "", agency: "" };
const DETAILS: [keyof EventDetailFields, StringKey][] = [["age", "detAge"], ["cause", "detCause"], ["agency", "detAgency"]];
/** the names of the other events, as in the timeline */
const OTHER_LABEL = Object.fromEntries(OTHER_EVENT_TAGS.map((tag) => [tag,
  (tag === "RESI" ? "residence" : tag === "EVEN" ? "event" : `ev${tag}`) as StringKey])) as Record<string, StringKey>;

/** christening and burial can take the date and place of birth and death */
const COPY_FROM: Partial<Record<(typeof PERSON_EVENTS)[number], ["birth" | "death", StringKey]>> = {
  christening: ["birth", "copyBirth"], burial: ["death", "copyDeath"],
};

/** Form for the facts of one person and of their marriages. */
export function PersonEditor({ data, record, families, lang, suggest, recordOf, sources, onSave, onCancel, onDirty, t }: Props) {
  const [initial] = useState(() => {
    const f = personFields(record);
    const shown = { ...f };
    for (const key of PERSON_EVENTS) shown[key] = shownEvent(f[key], lang);
    shown.occupations = f.occupations.map((o) => ({ ...o, ...shownEvent(o, lang) }));
    shown.events = f.events.map((e) => ({ ...e, ...shownEvent(e, lang) }));
    shown.attributes = f.attributes.map((a) => ({ ...a, ...shownEvent(a, lang) }));
    const fams = families.map((r) => {
      const ff = familyFields(r);
      return { stored: ff, shown: { ...ff, marriage: shownEvent(ff.marriage, lang), divorce: shownEvent(ff.divorce, lang) } };
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

  const shownEv = (origin: number) => initial.shown.events.find((x) => x.origin === origin)!.date;
  const shownAttr = (origin: number) => initial.shown.attributes.find((x) => x.origin === origin)!.date;
  /** the typed date as GEDCOM, or the stored one when the field was not touched */
  const date = (typed: string, shown: string, stored: string) => (typed === shown ? stored : parseDate(typed, lang).value);

  const save = () => {
    const after: PersonFields = { ...form };
    for (const key of PERSON_EVENTS) {
      after[key] = { ...form[key], date: date(form[key].date, initial.shown[key].date, initial.stored[key].date) };
    }
    if (!form.deceased) {
      after.death = after.burial = { date: "", place: "" };
      after.details = { ...form.details, death: NO_DETAILS, burial: NO_DETAILS };
    }
    after.events = form.events.map((e) => (e.origin < 0 ? { ...e, date: parseDate(e.date, lang).value } : {
      ...e, date: date(e.date, shownEv(e.origin), initial.stored.events.find((x) => x.origin === e.origin)!.date),
    }));
    after.occupations = form.occupations.map((o) => (o.origin < 0 ? { ...o, date: parseDate(o.date, lang).value } : {
      ...o, date: date(o.date, initial.shown.occupations[o.origin].date, initial.stored.occupations[o.origin].date),
    }));
    after.attributes = form.attributes.map((a) => (a.origin < 0 ? { ...a, date: parseDate(a.date, lang).value } : {
      ...a, date: date(a.date, shownAttr(a.origin), initial.stored.attributes.find((x) => x.origin === a.origin)!.date),
    }));
    const changed: GedNode[] = [];
    const rec = applyPerson(record, initial.stored, after);
    if (rec !== record) changed.push(rec);
    // other people whose links to the families change; one record once, however many families touch it
    const linked = new Map<string, GedNode>();
    const latest = (id: string) => linked.get(id) ?? recordOf(id);
    families.forEach((r, i) => {
      const { stored, shown } = initial.fams[i];
      const f = fams[i];
      const next = applyFamily(r, stored, {
        ...f, marriage: { ...f.marriage, date: date(f.marriage.date, shown.marriage.date, stored.marriage.date) },
        divorce: { ...f.divorce, date: date(f.divorce.date, shown.divorce.date, stored.divorce.date) },
      });
      if (next !== r) changed.push(next);
      for (const o of relinkFamily(r.xref!, stored, f, latest)) linked.set(o.xref!, o);
    });
    changed.push(...linked.values());
    onSave(changed);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  };

  const set = <K extends keyof PersonFields>(key: K, value: PersonFields[K]) => setForm({ ...form, [key]: value });
  // the optional parts of the name are shown when the name has one, or after the "more fields" button
  const initialParts = useMemo(() => NAME_PARTS.some(([k]) => initial.stored.nameParts[k]), [initial]);
  const [openParts, setOpenParts] = useState(false);
  const moreParts = initialParts || openParts || NAME_PARTS.some(([k]) => form.nameParts[k]);
  const setPart = (patch: Partial<PersonFields["nameParts"]>) => set("nameParts", { ...form.nameParts, ...patch });
  const setOcc = (i: number, patch: Partial<Occupation>) =>
    set("occupations", form.occupations.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setAttr = (i: number, patch: Partial<AttributeRow>) =>
    set("attributes", form.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setEv = (i: number, patch: Partial<EventRow>) =>
    set("events", form.events.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const [openDetails, setOpenDetails] = useState<string[]>([]);
  const hasDetails = (d: EventDetailFields) => !!(d.age || d.cause || d.agency);
  /** age, cause and agency of an event: shown when it has any, or after the "details" button */
  const details = (id: string, d: EventDetailFields, onChange: (patch: Partial<EventDetailFields>) => void) =>
    hasDetails(d) || openDetails.includes(id) ? <div className="trio">
      {DETAILS.map(([k, label]) => <label key={k}><span>{t(label)}</span>
        <input type="text" value={d[k]} onChange={(e) => { if (!openDetails.includes(id)) setOpenDetails([...openDetails, id]); onChange({ [k]: e.target.value }); }} /></label>)}
    </div> : <button type="button" className="add" onClick={() => setOpenDetails([...openDetails, id])}>
      <Plus className="icon" aria-hidden="true" />{t("eventDetails")}</button>;
  const setCite = (i: number, patch: Partial<CitationRow>) =>
    set("citations", form.citations.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setAlias = (i: number, patch: Partial<Alias>) =>
    set("aliases", form.aliases.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setFam = (i: number, patch: Partial<FamilyFields>, marriage: Partial<EventFields> = {}, divorce: Partial<EventFields> = {}) =>
    setFams(fams.map((f, j) => (j === i ? { ...f, ...patch, marriage: { ...f.marriage, ...marriage }, divorce: { ...f.divorce, ...divorce } } : f)));
  const setFamDetails = (i: number, key: "marriage" | "divorce", patch: Partial<EventDetailFields>) =>
    setFam(i, { details: { ...fams[i].details, [key]: { ...fams[i].details[key], ...patch } } });
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
      {details(key, form.details[key], (patch) => set("details", { ...form.details, [key]: { ...form.details[key], ...patch } }))}
    </fieldset>;
  };
  /** which of the two spouse lines of the family is the other person's */
  const otherKey = (f: FamilyFields) => (f.husb === record.xref ? "wife" : "husb");
  const spouseName = (f: FamilyFields) => (f[otherKey(f)] && data.people[f[otherKey(f)]]?.name) || "?";
  const personChoices = useMemo(() => Object.values(data.people)
    .map((p) => ({ id: p.id, label: `${p.name || "?"} (${p.id})` }))
    .sort((a, b) => a.label.localeCompare(b.label)), [data]);
  const setChildren = (i: number, children: string[]) => setFam(i, { children });

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
      {/* the other parts of the name: shown when the name has them, or after the "more fields" button */}
      {moreParts && <div className="pair">
        {NAME_PARTS.map(([key, label]) => <label key={key}><span>{t(label)}</span>
          <input type="text" value={form.nameParts[key]} autoFocus={!initialParts && key === NAME_PARTS[0][0]}
                 onChange={(e) => setPart({ [key]: e.target.value })} /></label>)}
      </div>}
      {form.aliases.length > 0 && <fieldset className="list">
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
      </fieldset>}
      <div className="adds">
        <button type="button" className="add" onClick={() => set("aliases",
          [...form.aliases, { origin: -1, given: form.given, surname: form.surname }])}>
          <Plus className="icon" aria-hidden="true" />{t("addAka")}</button>
        {!moreParts && <button type="button" className="add" onClick={() => setOpenParts(true)}>
          <Plus className="icon" aria-hidden="true" />{t("nameMore")}</button>}
      </div>
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
      <fieldset className="list">
        <legend>{t("attributes")}</legend>
        {form.attributes.map((a, i) => (
          <div className="item" key={a.origin < 0 ? `new${i}` : a.origin}>
            <div className="item-head">
              <select value={a.tag} disabled={a.origin >= 0} aria-label={t("attributes")}
                      onChange={(e) => setAttr(i, { tag: e.target.value })}>
                {ATTRIBUTE_TAGS.map((tag) => <option key={tag} value={tag}>{t(`attr${tag}` as StringKey)}</option>)}
              </select>
              <input type="text" value={a.value} aria-label={t("attributes")}
                     onChange={(e) => setAttr(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("attributes", form.attributes.filter((_, j) => j !== i))}>
                <X className="icon" aria-hidden="true" /></button>
            </div>
            <DateField value={a.date} shown={a.origin < 0 ? "" : shownAttr(a.origin)} lang={lang}
                       t={t} onChange={(v) => setAttr(i, { date: v })} />
            <label><span>{t("place")}</span>
              <input type="text" value={a.place} list={PLACES}
                     onChange={(e) => setAttr(i, { place: e.target.value })} /></label>
          </div>
        ))}
        <button type="button" className="add" onClick={() => set("attributes",
          [...form.attributes, { origin: -1, tag: ATTRIBUTE_TAGS[0], value: "", date: "", place: "" }])}>
          <Plus className="icon" aria-hidden="true" />{t("addAttribute")}</button>
      </fieldset>
      </>)}
      {section("events", <>
      {event("birth")}
      {event("christening")}
      {form.deceased && <>{event("death")}{event("burial")}</>}
      <fieldset className="list">
        <legend>{t("otherEvents")}</legend>
        {form.events.map((e, i) => (
          <div className="item" key={e.origin < 0 ? `new${i}` : e.origin}>
            <div className="item-head">
              <select value={e.tag} disabled={e.origin >= 0} aria-label={t("eventKind")}
                      onChange={(ev) => setEv(i, { tag: ev.target.value })}>
                {OTHER_EVENT_TAGS.map((tag) => <option key={tag} value={tag}>{t(OTHER_LABEL[tag])}</option>)}
              </select>
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("events", form.events.filter((_, j) => j !== i))}>
                <X className="icon" aria-hidden="true" /></button>
            </div>
            {e.tag === "EVEN" && <label><span>{t("eventKind")}</span>
              <input type="text" value={e.title} onChange={(ev) => setEv(i, { title: ev.target.value })} /></label>}
            {(e.tag === "EVEN" || e.tag === "RESI") && <label><span>{t(e.tag === "RESI" ? "detAddress" : "eventText")}</span>
              <input type="text" value={e.value} onChange={(ev) => setEv(i, { value: ev.target.value })} /></label>}
            <DateField value={e.date} shown={e.origin < 0 ? "" : shownEv(e.origin)} lang={lang}
                       t={t} onChange={(v) => setEv(i, { date: v })} />
            <label><span>{t("place")}</span>
              <input type="text" value={e.place} list={PLACES}
                     onChange={(ev) => setEv(i, { place: ev.target.value })} /></label>
            {details(`o${e.origin < 0 ? `new${i}` : e.origin}`, e, (patch) => setEv(i, patch))}
          </div>
        ))}
        <button type="button" className="add" onClick={() => set("events",
          [...form.events, { origin: -1, tag: OTHER_EVENT_TAGS[0], title: "", value: "", date: "", place: "", age: "", cause: "", agency: "" }])}>
          <Plus className="icon" aria-hidden="true" />{t("addEvent")}</button>
      </fieldset>
      </>)}
      {section("notes", <>
      <label><span>{t("note")}</span>
        <textarea rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
      <fieldset className="list">
        <legend>{t("sources")}</legend>
        {form.citations.map((c, i) => (
          <div className="item" key={c.origin < 0 ? `new${i}` : c.origin}>
            <div className="item-head">
              {/* a pointer to a source record is chosen from the list, a citation written as text stays text */}
              {/^@[^@]+@$/.test(c.source) || (c.origin < 0 && sources.length > 0)
                ? <select value={c.source} aria-label={t("sources")} onChange={(e) => setCite(i, { source: e.target.value })}>
                    {!sources.some((s) => s.xref === c.source) && <option value={c.source}>{c.source}</option>}
                    {sources.map((s) => <option key={s.xref} value={s.xref}>{s.title}</option>)}
                  </select>
                : <input type="text" value={c.source} aria-label={t("sources")} onChange={(e) => setCite(i, { source: e.target.value })} />}
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("citations", form.citations.filter((_, j) => j !== i))}>
                <X className="icon" aria-hidden="true" /></button>
            </div>
            <div className="pair">
              <label><span>{t("srcPage")}</span>
                <input type="text" value={c.page} onChange={(e) => setCite(i, { page: e.target.value })} /></label>
              <label><span>{t("quality")}</span>
                <select value={c.quality} onChange={(e) => setCite(i, { quality: e.target.value })}>
                  <option value="">–</option>
                  {QUALITY.map((q) => <option key={q} value={q}>{t(`quality${q}` as StringKey)}</option>)}
                </select></label>
            </div>
          </div>
        ))}
        <button type="button" className="add" onClick={() => set("citations",
          [...form.citations, { origin: -1, source: sources[0]?.xref || "", page: "", quality: "" }])}>
          <Plus className="icon" aria-hidden="true" />{t("addCitation")}</button>
      </fieldset>
      </>)}
      {section("families", <>
      {families.map((r, i) => (
        <fieldset key={r.xref}>
          <legend>{t("marriage")} · {spouseName(fams[i])}</legend>
          <div className="wide">
            <PersonPick choices={personChoices} exclude={[record.xref!, ...fams[i].children]} value={fams[i][otherKey(fams[i])]}
                        label={t("spouse")} placeholder={t("pickPerson")} onPick={(id) => setFam(i, { [otherKey(fams[i])]: id })} />
          </div>
          <DateField value={fams[i].marriage.date} shown={initial.fams[i].shown.marriage.date} lang={lang} t={t}
                     onChange={(v) => setFam(i, {}, { date: v })} />
          <label><span>{t("place")}</span>
            <input type="text" value={fams[i].marriage.place} list={PLACES}
                   onChange={(e) => setFam(i, {}, { place: e.target.value })} />
          </label>
          {details(`m${r.xref}`, fams[i].details.marriage, (patch) => setFamDetails(i, "marriage", patch))}
          <label className="check"><input type="checkbox" checked={fams[i].divorced}
                   onChange={(e) => setFam(i, { divorced: e.target.checked })} />
            <span>{t("divorcedLabel")}</span></label>
          {fams[i].divorced && <fieldset className="sub">
            <legend>{t("divorce")}</legend>
            <DateField value={fams[i].divorce.date} shown={initial.fams[i].shown.divorce.date} lang={lang} t={t}
                       onChange={(v) => setFam(i, {}, {}, { date: v })} />
            <label><span>{t("place")}</span>
              <input type="text" value={fams[i].divorce.place} list={PLACES}
                     onChange={(e) => setFam(i, {}, {}, { place: e.target.value })} /></label>
            {details(`d${r.xref}`, fams[i].details.divorce, (patch) => setFamDetails(i, "divorce", patch))}
          </fieldset>}
          <div className="wide children">
            <span className="lab">{t("children")}</span>
            {fams[i].children.map((id) => (
              <div className="child" key={id}>
                <span>{data.people[id]?.name || id}</span>
                <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                        onClick={() => setChildren(i, fams[i].children.filter((c) => c !== id))}>
                  <X className="icon" aria-hidden="true" /></button>
              </div>
            ))}
            <PersonPick choices={personChoices} clearOnPick exclude={[record.xref!, fams[i].husb, fams[i].wife, ...fams[i].children]}
                        value="" label={t("addChild")} placeholder={t("pickPerson")} onPick={(id) => id && setChildren(i, [...fams[i].children, id])} />
          </div>
        </fieldset>
      ))}
      {families.length === 0 && <span className="muted">{t("noValue")}</span>}
      </>)}
      <SuggestLists suggest={suggest} lang={lang} />
    </form>
  );
}
