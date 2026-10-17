import { Hash, Phone, Baby, BookMarked, Briefcase, CalendarDays, Copy, Cross, Droplets, Flower2, Handshake, Heart, HeartCrack, ChevronDown, Plus, Search, Tag, Tags, Trash2, UserPlus, Users, type LucideIcon } from "lucide-react";
import { familyRecord, personRecord, type NewPerson } from "../core/structure";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CONTACT_TAGS, OTHER_EVENT_TAGS, PEDIGREES, RESTRICTIONS, PERSON_EVENTS, applyFamily, applyPerson, dateInput, familyFields, parseDate, personFields, relinkFamily, relinkParents, type EventFields,
  type Alias, type AssocRow, type AttributeRow, type CitationRow, type ContactRow, type ReferenceRow, type EventDetailFields, type EventRow, type Suggestions, type FamilyFields, type Occupation, type PersonFields,
} from "../core/edit";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { SourceChoice } from "../core/sources";
import type { Lang } from "../core/texts";
import { surnamesFor } from "../core/surnames";
import { ATTRIBUTE_TAGS } from "../core/facts";
import { yearOf } from "../core/date";
import { SECTIONS } from "./editSections";
import type { StringKey } from "./i18n";
import { SectionHead } from "./Section";

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
  /** changed records only; nothing when nothing changed. `added` are the new people made in the form (new children) */
  onSave: (changed: GedNode[], added?: GedNode[]) => void;
  /** a free ID for a new person; `pending` are the IDs given out in this form and not saved yet */
  allocate: (tag: "INDI" | "FAM", pending: string[]) => string;
  onCancel: () => void;
  /** the parts that are open (keys of SECTIONS); the usual ones when not given, e.g. when the form is rebuilt after a family changed */
  open?: Set<string>;
  onToggleSection?: (key: string, open: boolean) => void;
  /** adds an empty family of this person; the editor is closed or reopened by the caller */
  onAddFamily?: () => void;
  /** removes the family (its ID) with the links to it */
  onDeleteFamily?: (id: string) => void;
  /** whether the form differs from the record as it was opened */
  /** the number of changed values in the form, 0 when nothing changed */
  onDirty?: (changes: number) => void;
  t: (key: StringKey) => string;
}

/** the icons the detail uses for the same events */
const EVENT_ICON: Record<(typeof PERSON_EVENTS)[number], LucideIcon> = { birth: Baby, christening: Droplets, death: Cross, burial: Flower2 };
const ico = (Icon: LucideIcon) => <Icon className="icon" aria-hidden="true" />;

const EVENT_LABEL: Record<(typeof PERSON_EVENTS)[number], StringKey> = {
  birth: "thBirth", christening: "christening", death: "thDeath", burial: "burial",
};

/** dates as shown in the form, the stored GEDCOM date otherwise */
const shownEvent = (e: EventFields, lang: Lang): EventFields => ({ ...e, date: dateInput(e.date, lang) });

function DateField({ value, shown, lang, onChange, t, label }: {
  value: string; shown: string; lang: Lang; onChange: (v: string) => void; t: (key: StringKey) => string; label?: string;
}) {
  const parsed = value !== shown && value.trim() ? parseDate(value, lang) : null;
  return <label title={t("dateHint")}><input placeholder={label ?? t("date")} aria-label={label ?? t("date")} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    {/* how the typed date is understood, as it will be stored */}
    {parsed && <small className={parsed.ok ? "hint" : "hint warn"}>
      {parsed.ok ? `→ ${parsed.value}` : t("datePhrase")}</small>}
  </label>;
}

type NamePartKey = keyof PersonFields["nameParts"];
/** the optional parts of a name, in the order they are offered */
const NAME_PARTS: [NamePartKey, StringKey, StringKey][] = [["prefix", "namePrefix", "tipNamePrefix"], ["suffix", "nameSuffix", "tipNameSuffix"], ["nickname", "nickname", "tipNickname"], ["surnamePrefix", "surnamePrefix", "tipSurnamePrefix"]];

/** Picking a person of the file by typing a name; `onPick("")` when the field is emptied. */
function PersonPick({ choices, exclude, value, label, placeholder, tip, clearOnPick, focus, onPick }: {
  choices: { id: string; label: string }[]; exclude: string[]; value: string; label: string; placeholder: string; tip: string;
  clearOnPick?: boolean; focus?: boolean; onPick: (id: string) => void;
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
  return <label title={tip}>{label && <span>{label}</span>}
    <input type="text" value={text} list={list} aria-label={label || placeholder} placeholder={placeholder} autoComplete="off" autoFocus={focus} onChange={(e) => change(e.target.value)} />
    <datalist id={list}>{text.length >= 2 && options.slice(0, 5000).map((c) => <option key={c.id} value={c.label} />)}</datalist>
  </label>;
}

/** the form's id, so the icon buttons in the detail header can submit it */
/** the parts that are open when the window opens: the ones edited most often; the others are collapsed */
export const OPEN_AT_START = new Set<string>(["name", "events"]);
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
const DETAILS: [keyof EventDetailFields, StringKey, StringKey][] = [["age", "detAge", "tipAge"], ["cause", "detCause", "tipCause"], ["agency", "detAgency", "tipAgency"]];
/** the names of the other events, as in the timeline */
const OTHER_LABEL = Object.fromEntries(OTHER_EVENT_TAGS.map((tag) => [tag,
  (tag === "RESI" ? "residence" : tag === "EVEN" ? "event" : `ev${tag}`) as StringKey])) as Record<string, StringKey>;

/** christening and burial can take the date and place of birth and death */
const COPY_FROM: Partial<Record<(typeof PERSON_EVENTS)[number], ["birth" | "death", StringKey]>> = {
  christening: ["birth", "copyBirth"], burial: ["death", "copyDeath"],
};

/** how many values differ between two form states (arrays and objects compared value by value) */
export function diffCount(a: unknown, b: unknown): number {
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0;
    for (const k of keys) n += diffCount((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]);
    return n;
  }
  return a === b ? 0 : 1;
}

/** Form for the facts of one person and of their marriages. */
export function PersonEditor({ data, record, families, lang, suggest, recordOf, sources, onSave, allocate, onCancel, open, onToggleSection, onAddFamily, onDeleteFamily, onDirty, t }: Props) {
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
  /** the family whose "add a child" field is open */
  const [adding, setAdding] = useState<number | null>(null);
  const [findingSpouse, setFindingSpouse] = useState<number | null>(null);
  /** the "add parents" and "add association" search fields are behind a button */
  const [addingParents, setAddingParents] = useState(false);
  const [addingAssoc, setAddingAssoc] = useState(false);
  /** the people made in this form (new children), by the ID they will get, and the child form being filled in */
  const [fresh, setFresh] = useState<Record<string, NewPerson & { year: string; kind: "child" | "spouse" | "parent"; fam: string }>>({});
  /** the families made in this form for new parents, by the ID they will get */
  const [freshFams, setFreshFams] = useState<Record<string, { husb: string; wife: string }>>({});
  /** the form of a new person being filled in: `fam` is the position of the family in the form, 0 for parents */
  const [kid, setKid] = useState<{ kind: "child" | "spouse" | "parent"; fam: number; given: string; surname: string; sex: string; birth: string; deceased: boolean; death: string } | null>(null);
  const [fams, setFams] = useState<FamilyFields[]>(initial.fams.map((f) => f.shown));
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) firstInput.current?.focus({ preventScroll: true }); }, []);
  const [opened] = useState(() => JSON.stringify([initial.shown, initial.fams.map((f) => f.shown)]));
  const changes = useMemo(() => diffCount(JSON.parse(opened), JSON.parse(JSON.stringify([form, fams]))), [opened, form, fams]);
  const dirty = changes > 0;
  useEffect(() => onDirty?.(changes), [changes, onDirty]);

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
    for (const o of relinkParents(record.xref!, initial.stored.parents, form.parents, latest)) linked.set(o.xref!, o);
    changed.push(...linked.values());
    // the new people and families that are still in the form
    const added: GedNode[] = [];
    const person = (id: string, links: { famc?: string; fams?: string }) => added.push(personRecord(id, fresh[id], links));
    fams.forEach((f, i) => {
      f.children.filter((c) => fresh[c]).forEach((c) => person(c, { famc: families[i].xref! }));
      for (const id of [f.husb, f.wife]) if (fresh[id]) person(id, { fams: families[i].xref! });
    });
    for (const fam of form.parents.map((p) => p.fam).filter((id) => freshFams[id])) {
      const { husb, wife } = freshFams[fam];
      for (const id of [husb, wife]) if (id) person(id, { fams: fam });
      added.push(familyRecord(fam, husb, wife, [record.xref!]));
    }
    onSave(changed, added);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  };

  const set = <K extends keyof PersonFields>(key: K, value: PersonFields[K]) => setForm({ ...form, [key]: value });
  // the optional parts of the name are shown when the name has one, or after the "more fields" button
  const initialParts = useMemo(() => NAME_PARTS.some(([k]) => initial.stored.nameParts[k]), [initial]);
  const [partsOpen, setPartsOpen] = useState<boolean | null>(null);
  const moreParts = partsOpen ?? (initialParts || NAME_PARTS.some(([k]) => form.nameParts[k]));
  const setPart = (patch: Partial<PersonFields["nameParts"]>) => set("nameParts", { ...form.nameParts, ...patch });
  const setOcc = (i: number, patch: Partial<Occupation>) =>
    set("occupations", form.occupations.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setAttr = (i: number, patch: Partial<AttributeRow>) =>
    set("attributes", form.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const setEv = (i: number, patch: Partial<EventRow>) =>
    set("events", form.events.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const [openDetails, setOpenDetails] = useState<string[]>([]);
  /** the parts (details, address) the user has hidden again although they hold a value */
  const [closed, setClosed] = useState<string[]>([]);
  const toggleOf = (id: string, shown: boolean) => {
    if (shown) { setClosed([...closed, id]); setOpenDetails(openDetails.filter((x) => x !== id)); }
    else { setClosed(closed.filter((x) => x !== id)); setOpenDetails([...openDetails, id]); if (id.startsWith("addr:")) setOpenAddr([...openAddr, id.slice(5)]); }
  };
  /** the button that shows or hides hidden fields: it stays after they are shown, the chevron turns up */
  const revealBtn = (id: string, shown: boolean, label: string, title?: string) =>
    <button type="button" className={`reveal${shown ? " open" : ""}`} title={title} aria-expanded={shown} onClick={() => toggleOf(id, shown)}>
      {label}<ChevronDown className="icon" aria-hidden="true" /></button>;
  /** the residences whose address field is open although it is empty or the same as the place */
  const [openAddr, setOpenAddr] = useState<string[]>([]);
  const rowId = (e: EventRow, i: number) => (e.origin < 0 ? `new${i}` : `o${e.origin}`);
  const hasDetails = (d: EventDetailFields) => !!(d.age || d.cause || d.agency);
  /** age, cause and agency of an event: shown when it has any, or after the "details" button */
  const details = (id: string, d: EventDetailFields, onChange: (patch: Partial<EventDetailFields>) => void, extra?: ReactNode, extraSet?: boolean) => {
    const shown = (hasDetails(d) || !!extraSet || openDetails.includes(id)) && !closed.includes(id);
    return <>
      {revealBtn(id, shown, t("eventDetails"), t("tipDetails"))}
      {shown && <>
        <div className="trio">
          {DETAILS.map(([k, label, tip]) => <label key={k} title={t(tip)}><input placeholder={t(label)} aria-label={t(label)} type="text" value={d[k]} onChange={(e) => { if (!openDetails.includes(id)) setOpenDetails([...openDetails, id]); onChange({ [k]: e.target.value }); }} /></label>)}
        </div>
        {extra}
      </>}
    </>;
  };
  const setContact = (i: number, patch: Partial<ContactRow>) =>
    set("contacts", form.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setRef = (i: number, patch: Partial<ReferenceRow>) =>
    set("references", form.references.map((r, j) => (j === i ? { ...r, ...patch } : r)));
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
      <legend>{ico(EVENT_ICON[key])}{t(EVENT_LABEL[key])}
        {(key === "birth" || key === "death") && !fixedKeys.includes(key === "birth" ? "christening" : "burial") && acts(
          <button type="button" className="head-act" onClick={() => setFixedOn([...fixedOn, key === "birth" ? "christening" : "burial"])}>
            <Plus className="icon" aria-hidden="true" />{t(key === "birth" ? "addChristening" : "addBurial")}</button>)}
        {from && acts(<button type="button" className="head-act" title={t(from[1])}
                         disabled={!source?.date && !source?.place} onClick={() => set(key, { ...source! })}>
          <Copy className="icon" aria-hidden="true" />{t(from[1])}</button>)}
      </legend>
      <DateField value={form[key].date} shown={initial.shown[key].date} lang={lang} t={t}
                 onChange={(v) => set(key, { ...form[key], date: v })} />
      <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={form[key].place} list={PLACES}
               onChange={(e) => set(key, { ...form[key], place: e.target.value })} />
      </label>
      {key === "christening" && <label className="full" title={t("tipReligion")}><input placeholder={t("religion")} aria-label={t("religion")} type="text" value={form.religion} list={RELIGIONS}
               onChange={(e) => set("religion", e.target.value)} /></label>}
      {details(key, form.details[key], (patch) => set("details", { ...form.details, [key]: { ...form.details[key], ...patch } }))}
    </fieldset>;
  };
  /** christening and burial are listed among the other events, as rows that keep their own fields */
  const [fixedOn, setFixedOn] = useState<string[]>([]);
  const hasEv = (k: "christening" | "burial") => !!(form[k].date || form[k].place || hasDetails(form.details[k]) || (k === "christening" && form.religion));
  const fixedKeys = (["christening", "burial"] as const).filter((k) => (k !== "burial" || form.deceased) && (fixedOn.includes(k) || hasEv(k)));
  const fixedRow = (key: "christening" | "burial") => {
    const from = COPY_FROM[key]!;
    const source = form[from[0]];
    return <fieldset className="list" key={key}><div className="item">
      <div className="item-head">
        <span className="grow kind">{ico(EVENT_ICON[key])}{t(EVENT_LABEL[key])}</span>
        <button type="button" className="head-act" title={t(from[1])} disabled={!source.date && !source.place} onClick={() => set(key, { ...source })}>
          <Copy className="icon" aria-hidden="true" />{t(from[1])}</button>
        <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                onClick={() => { setFixedOn(fixedOn.filter((k) => k !== key));
                  setForm({ ...form, [key]: { date: "", place: "" }, details: { ...form.details, [key]: NO_DETAILS }, ...(key === "christening" ? { religion: "" } : {}) }); }}>
          <Trash2 className="icon" aria-hidden="true" /></button>
      </div>
      <DateField value={form[key].date} shown={initial.shown[key].date} lang={lang} t={t}
                 onChange={(v) => set(key, { ...form[key], date: v })} />
      <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={form[key].place} list={PLACES}
               onChange={(e) => set(key, { ...form[key], place: e.target.value })} /></label>
      {key === "christening" && <label className="full" title={t("tipReligion")}><input placeholder={t("religion")} aria-label={t("religion")} type="text" value={form.religion} list={RELIGIONS}
               onChange={(e) => set("religion", e.target.value)} /></label>}
      {details(key, form.details[key], (patch) => set("details", { ...form.details, [key]: { ...form.details[key], ...patch } }))}
    </div></fieldset>;
  };
  /** which of the two spouse lines of the family is the other person's */
  const otherKey = (f: FamilyFields) => (f.husb === record.xref ? "wife" : "husb");
  /** "Husband" or "Wife" by the sex of the chosen spouse, else by the place in the family */
  const spouseLabel = (f: FamilyFields) => {
    const sex = data.people[f[otherKey(f)]]?.sex || (otherKey(f) === "husb" ? "M" : "F");
    return t(sex === "F" ? "spouseF" : sex === "M" ? "spouseM" : "spouse");
  };
  /** name and birth year, the ID only where two people would look the same */
  const personChoices = useMemo(() => {
    const plain = Object.values(data.people).map((p) => {
      const year = yearOf(p.birth?.date);
      return { id: p.id, label: `${p.name || "?"}${year ? ` · ${year}` : ""}` };
    });
    const count = new Map<string, number>();
    plain.forEach((c) => count.set(c.label, (count.get(c.label) || 0) + 1));
    return plain.map((c) => (count.get(c.label)! > 1 ? { ...c, label: `${c.label} · ${c.id}` } : c))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);
  const freshLabel = (id: string) => `${[fresh[id].given, fresh[id].surname].filter(Boolean).join(" ") || "?"}${fresh[id].year ? ` · ${fresh[id].year}` : ""}`;
  const labelOf = (id: string) => (fresh[id] ? freshLabel(id) : personChoices.find((c) => c.id === id)?.label || id);
  /** the surname a new child starts with: the father's, else the other parent's */
  const familySurname = (f: FamilyFields) => {
    for (const id of [f.husb, f.wife]) {
      const rec = id === record.xref ? record : id ? recordOf(id) : undefined;
      const surname = rec && (id === record.xref ? form.surname : personFields(rec).surname);
      if (surname) return surname;
    }
    return "";
  };
  const startKid = (kind: "child" | "spouse" | "parent", i = 0) => {
    const sex = kind === "parent" ? "M" : kind === "spouse" ? (otherKey(fams[i]) === "wife" ? "F" : "M") : "";
    const surname = kind === "child" ? familySurname(fams[i]) : kind === "parent" ? form.surname : "";
    setKid({ kind, fam: i, given: "", surname, sex, birth: "", deceased: false, death: "" });
  };
  const addKid = () => {
    if (!kid || !kid.given.trim()) return;
    const taken = [...Object.keys(fresh), ...Object.keys(freshFams)];
    const id = allocate("INDI", taken);
    const birth = kid.birth.trim() ? parseDate(kid.birth, lang).value : "";
    const person = { given: kid.given, surname: kid.surname, sex: kid.sex, birth, deceased: kid.deceased, death: kid.deceased && kid.death.trim() ? parseDate(kid.death, lang).value : "", year: String(yearOf(birth) ?? "") };
    if (kid.kind === "parent") {
      // a mother joins the new family of a father made in this form, and the other way round
      const slot = kid.sex === "F" ? "wife" : "husb";
      let fam = Object.keys(freshFams).find((f) => form.parents.some((p) => p.fam === f) && !freshFams[f][slot]);
      if (!fam) {
        fam = allocate("FAM", [...taken, id]);
        set("parents", [...form.parents, { origin: -1, fam, pedigree: "" }]);
      }
      setFreshFams({ ...freshFams, [fam]: { ...(freshFams[fam] ?? { husb: "", wife: "" }), [slot]: id } });
      setFresh({ ...fresh, [id]: { ...person, kind: "parent", fam } });
    } else {
      setFresh({ ...fresh, [id]: { ...person, kind: kid.kind, fam: families[kid.fam].xref! } });
      if (kid.kind === "child") setChildren(kid.fam, [...fams[kid.fam].children, id]);
      else setFam(kid.fam, { [otherKey(fams[kid.fam])]: id });
    }
    setKid(null);
  };
  /** the form of a new person of this kind (child, spouse, parent), open under the place that asked for it */
  const newPersonForm = (kind: "child" | "spouse" | "parent", i: number) => kid?.kind === kind && kid.fam === i && (<div className="sub new-child" role="group">
              <div className="card-head">{ico(UserPlus)}{t(kind === "child" ? "newChild" : kind === "spouse" ? "newSpouse" : "newParent")}</div>
              <div className="kid-row">
                <label title={t("tipGiven")}><input placeholder={t("givenName")} aria-label={t("givenName")} type="text" autoFocus value={kid.given} list={givenList(kid.sex)} onChange={(e) => setKid({ ...kid, given: e.target.value })}
                         onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKid(); } }} /></label>
                <label title={t("tipSurname")}><input placeholder={t("surname")} aria-label={t("surname")} type="text" value={kid.surname} list={surnameList(kid.sex)} onChange={(e) => setKid({ ...kid, surname: e.target.value })}
                         onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKid(); } }} /></label>
                <DateField value={kid.birth} shown="" lang={lang} t={t} onChange={(v) => setKid({ ...kid, birth: v })} label={t(EVENT_LABEL.birth)} />
              </div>
              <div className="sex-field" title={t("tipSex")}>
                <span>{t("sex")}</span>
                <div className="sex" role="radiogroup" aria-label={t("sex")}>
                  {([["M", "male"], ["F", "female"], ["", "sexUnknown"]] as [string, StringKey][]).map(([value, key]) => <label key={key}>
                    <input type="radio" name={`kid-sex-${kind}-${i}`} value={value} checked={kid.sex === value} onChange={() => setKid({ ...kid, sex: value, ...(kind === "parent" && (value === "F" ? kid.surname === form.surname : !kid.surname) ? { surname: value === "F" ? "" : form.surname } : {}) })} /> {t(key)}</label>)}
                </div>
              </div>
              <div className="kid-death">
                <label className="check" title={t("tipDeceased")}>
                  <input type="checkbox" checked={kid.deceased} onChange={(e) => setKid({ ...kid, deceased: e.target.checked })} />
                  <span>{t(kid.sex === "M" ? "deceasedM" : kid.sex === "F" ? "deceasedF" : "deceased")}</span></label>
                {kid.deceased && <DateField value={kid.death} shown="" lang={lang} t={t} onChange={(v) => setKid({ ...kid, death: v })} label={t(EVENT_LABEL.death)} />}
              </div>
              <div className="kid-actions">
                <button type="button" onClick={() => setKid(null)}>{t("cancel")}</button>
                <button type="button" className="primary" disabled={!kid.given.trim()} onClick={addKid}>
                  <Plus className="icon" aria-hidden="true" />{t(kind === "child" ? "addChild" : "addPerson")}</button>
              </div>
            </div>);
  const setChildren = (i: number, children: string[]) => setFam(i, { children });
  /** the families a person can be put into as a child: not the ones they already belong to or have themselves */
  const familyChoices = useMemo(() => {
    const plain = Object.values(data.families).map((f) => {
      const names = [f.husb, f.wife].map((p) => (p && data.people[p]?.name) || "").filter(Boolean).join(" & ") || "?";
      const year = yearOf(f.marriage?.date);
      return { id: f.id, label: `${names}${year ? ` · ${year}` : ""}` };
    });
    const count = new Map<string, number>();
    plain.forEach((c) => count.set(c.label, (count.get(c.label) || 0) + 1));
    return plain.map((c) => (count.get(c.label)! > 1 ? { ...c, label: `${c.label} · ${c.id}` } : c))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);
  const familyLabel = (id: string) => (freshFams[id]
    ? [freshFams[id].husb, freshFams[id].wife].filter(Boolean).map((p) => [fresh[p].given, fresh[p].surname].filter(Boolean).join(" ") || "?").join(" & ")
    : familyChoices.find((c) => c.id === id)?.label || id);
  const setAssoc = (i: number, patch: Partial<AssocRow>) =>
    set("associations", form.associations.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  /** text actions at the right end of a group's title row */
  const acts = (...buttons: ReactNode[]) => <span className="head-acts">{buttons}</span>;
  const section = (key: keyof typeof SECTIONS, children: ReactNode, extra?: ReactNode) => {
    const { icon, title } = SECTIONS[key];
    return <details className="section collapsible" open={(open ?? OPEN_AT_START).has(key) || undefined}
                    onToggle={(e) => onToggleSection?.(key, e.currentTarget.open)}>
      <summary className="sec-head"><SectionHead icon={icon} title={t(title)} extra={extra} /></summary>
      <div className="sec-fields">{children}</div>
    </details>;
  };
  return (
    <form id={EDITOR_FORM} className="editor" onKeyDown={onKey} onSubmit={(e) => { e.preventDefault(); save(); }}>
      {section("name", <>
      <div className="pair">
        <label title={t("tipGiven")}><input placeholder={t("givenName")} aria-label={t("givenName")} ref={firstInput} type="text" value={form.given} list={givenList(form.sex)} onChange={(e) => set("given", e.target.value)} /></label>
        <label title={t("tipSurname")}><input placeholder={t("surname")} aria-label={t("surname")} type="text" value={form.surname} list={surnameList(form.sex)}
                 onChange={(e) => set("surname", e.target.value)} /></label>
      </div>
      <div className="sex-field" title={t("tipSex")}>
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
      <fieldset className="list">
        <legend title={t("tipAka")}>{ico(Tag)}{t("aka")}{acts(<button type="button" className="head-act" onClick={() => set("aliases",
          [...form.aliases, { origin: -1, given: form.given, surname: form.surname }])}><Plus className="icon" aria-hidden="true" />{t("addAka")}</button>)}</legend>
        {form.aliases.map((a, i) => (
          <div className="item alias" key={a.origin < 0 ? `new${i}` : a.origin}>
            <input type="text" value={a.given} list={givenList(form.sex)} aria-label={t("givenName")} title={t("tipGiven")} placeholder={t("givenName")}
                   onChange={(e) => setAlias(i, { given: e.target.value })} />
            <input type="text" value={a.surname} list={surnameList(form.sex)} aria-label={t("surname")} title={t("tipSurname")} placeholder={t("surname")}
                   onChange={(e) => setAlias(i, { surname: e.target.value })} />
            <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                    onClick={() => set("aliases", form.aliases.filter((_, j) => j !== i))}>
              <Trash2 className="icon" aria-hidden="true" /></button>
          </div>
        ))}
      </fieldset>
      {/* the other parts of the name: a toggle with a fixed place, the fields open below it */}
      <button type="button" className={`reveal${moreParts ? " open" : ""}`} aria-expanded={moreParts} onClick={() => setPartsOpen(!moreParts)}>
        {t("eventDetails")}<ChevronDown className="icon" aria-hidden="true" /></button>
      {moreParts && <div className="pair">
        {NAME_PARTS.map(([key, label, tip]) => <label key={key} title={t(tip)}><input placeholder={t(label)} aria-label={t(label)} type="text" value={form.nameParts[key]} autoFocus={!initialParts && key === NAME_PARTS[0][0]}
                 onChange={(e) => setPart({ [key]: e.target.value })} /></label>)}
      </div>}
      </>)}
      {section("events", <>
      {event("birth")}
      {fixedKeys.includes("christening") && fixedRow("christening")}
      {/* the death (and burial) only for someone who died; unticking hides them and saving clears them,
          ticking again before saving brings them back */}
      <label className="check" title={t("tipDeceased")}>
        <input type="checkbox" checked={form.deceased}
               onChange={(e) => set("deceased", e.target.checked)} />
        <span>{t(form.sex === "M" ? "deceasedM" : form.sex === "F" ? "deceasedF" : "deceased")}</span></label>
      {form.deceased && event("death")}
      {form.deceased && fixedKeys.includes("burial") && fixedRow("burial")}
      <fieldset className="list">
        <legend>{ico(CalendarDays)}{t("otherEvents")}{acts(<button type="button" className="head-act" onClick={() => set("events",
          [...form.events, { origin: -1, tag: OTHER_EVENT_TAGS[0], title: "", value: "", date: "", place: "", age: "", cause: "", agency: "" }])}><Plus className="icon" aria-hidden="true" />{t("addEvent")}</button>)}</legend>
        {form.events.map((e, i) => (
          <div className="item" key={e.origin < 0 ? `new${i}` : e.origin}>
            <div className="item-head">
              <select value={e.tag} disabled={e.origin >= 0} aria-label={t("eventKind")} title={t("tipEventKind")}
                      onChange={(ev) => setEv(i, { tag: ev.target.value })}>
                {OTHER_EVENT_TAGS.map((tag) => <option key={tag} value={tag}>{t(OTHER_LABEL[tag])}</option>)}
              </select>
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("events", form.events.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            {e.tag === "EVEN" && <label className="full" title={t("tipEventTitle")}><input placeholder={t("eventKind")} aria-label={t("eventKind")} type="text" value={e.title} onChange={(ev) => setEv(i, { title: ev.target.value })} /></label>}
            {e.tag === "EVEN" && <label className="full" title={t("tipEventText")}><input placeholder={t("eventText")} aria-label={t("eventText")} type="text" value={e.value} onChange={(ev) => setEv(i, { value: ev.target.value })} /></label>}
            {/* a residence: the address (street and number) is separate from the place (town), and is not shown twice when it is the same text */}
            {e.tag === "RESI" && <>
              {(() => { const id = `addr:${rowId(e, i)}`, shown = (!!e.value && e.value !== e.place || openAddr.includes(rowId(e, i))) && !closed.includes(id);
                return <>
                  <div className="full">{revealBtn(id, shown, t("detAddress"), t(e.value ? "sameAsPlace" : "addrHint"))}</div>
                  {shown && <label className="full" title={t("addrHint")}><input placeholder={t("detAddress")} aria-label={t("detAddress")} type="text" value={e.value} onChange={(ev) => setEv(i, { value: ev.target.value })} /></label>}
                </>; })()}
            </>}
            <DateField value={e.date} shown={e.origin < 0 ? "" : shownEv(e.origin)} lang={lang}
                       t={t} onChange={(v) => setEv(i, { date: v })} />
            <label title={t(e.tag === "RESI" ? "resiPlaceHint" : "tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={e.place} list={PLACES}
                     onChange={(ev) => setEv(i, { place: ev.target.value })} /></label>
            {details(`o${e.origin < 0 ? `new${i}` : e.origin}`, e, (patch) => setEv(i, patch))}
          </div>
        ))}
      </fieldset>
      </>)}
      {section("families", <>
      {families.map((r, i) => (
        <fieldset key={r.xref}>
          <legend>{ico(Heart)}{t("marriage")}
            {onDeleteFamily && acts(<button type="button" className="head-act" disabled={dirty} title={dirty ? t("saveFirst") : undefined}
                                       onClick={() => { if (window.confirm(t("confirmDeleteFamily"))) onDeleteFamily(r.xref!); }}>
              <Trash2 className="icon" aria-hidden="true" />{t("deleteFamily")}</button>)}
          </legend>
          <div className="wide spouse">
            <span className="lab" title={t("tipSpouse")}>{ico(Users)}{spouseLabel(fams[i])}
              {acts(<button type="button" className="head-act" title={t("newSpouse")} onClick={() => startKid("spouse", i)}><Plus className="icon" aria-hidden="true" />{t("addShort")}</button>,
                    <button type="button" className="head-act" title={t("findChild")} onClick={() => setFindingSpouse(findingSpouse === i ? null : i)}><Search className="icon" aria-hidden="true" />{t("findShort")}</button>)}</span>
            {findingSpouse === i && <PersonPick choices={[...personChoices, ...Object.keys(fresh).map((id) => ({ id, label: freshLabel(id) }))]} clearOnPick focus
                        exclude={[record.xref!, ...fams[i].children]} value="" label="" placeholder={t("pickPerson")} tip={t("tipSpouse")}
                        onPick={(id) => { if (id) { setFam(i, { [otherKey(fams[i])]: id }); setFindingSpouse(null); } }} />}
            {fams[i][otherKey(fams[i])] && <div className="child">
              <span>{labelOf(fams[i][otherKey(fams[i])])}</span>
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => setFam(i, { [otherKey(fams[i])]: "" })}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>}
            {newPersonForm("spouse", i)}
          </div>
          <DateField value={fams[i].marriage.date} shown={initial.fams[i].shown.marriage.date} lang={lang} t={t}
                     onChange={(v) => setFam(i, {}, { date: v })} />
          <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={fams[i].marriage.place} list={PLACES}
                   onChange={(e) => setFam(i, {}, { place: e.target.value })} />
          </label>
          {details(`m${r.xref}`, fams[i].details.marriage, (patch) => setFamDetails(i, "marriage", patch),
            <label className="check" title={t("tipDivorced")}><input type="checkbox" checked={fams[i].divorced}
                     onChange={(e) => setFam(i, { divorced: e.target.checked })} />
              <span>{t("divorcedLabel")}</span></label>, fams[i].divorced)}
          {fams[i].divorced && <fieldset className="sub">
            <legend>{ico(HeartCrack)}{t("divorce")}</legend>
            <DateField value={fams[i].divorce.date} shown={initial.fams[i].shown.divorce.date} lang={lang} t={t}
                       onChange={(v) => setFam(i, {}, {}, { date: v })} />
            <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={fams[i].divorce.place} list={PLACES}
                     onChange={(e) => setFam(i, {}, {}, { place: e.target.value })} /></label>
            {details(`d${r.xref}`, fams[i].details.divorce, (patch) => setFamDetails(i, "divorce", patch))}
          </fieldset>}
          <div className="wide children">
            <span className="lab">{ico(Baby)}{t("children")}
              {acts(<button type="button" className="head-act" title={t("newChild")} onClick={() => startKid("child", i)}><Plus className="icon" aria-hidden="true" />{t("addShort")}</button>,
                    <button type="button" className="head-act" title={t("findChild")} onClick={() => setAdding(adding === i ? null : i)}><Search className="icon" aria-hidden="true" />{t("findShort")}</button>)}</span>
            {adding === i && <PersonPick choices={personChoices} clearOnPick focus exclude={[record.xref!, fams[i].husb, fams[i].wife, ...fams[i].children]}
                        value="" label="" placeholder={t("pickPerson")} tip={t("addChild")}
                        onPick={(id) => { if (id) { setChildren(i, [...fams[i].children, id]); setAdding(null); } }} />}
            {fams[i].children.map((id) => (
              <div className="child" key={id}>
                <span>{labelOf(id)}</span>
                <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                        onClick={() => setChildren(i, fams[i].children.filter((c) => c !== id))}>
                  <Trash2 className="icon" aria-hidden="true" /></button>
              </div>
            ))}
            {newPersonForm("child", i)}
          </div>
        </fieldset>
      ))}
      {families.length === 0 && <span className="muted">{t("noValue")}</span>}
      </>, onAddFamily && <button type="button" className="head-act" disabled={dirty} title={dirty ? t("saveFirst") : undefined}
                                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddFamily(); }}>
        <Plus className="icon" aria-hidden="true" />{t("addFamily")}</button>)}
      {section("parents", <>
      <fieldset className="list">
        <legend>{ico(Users)}{t("parents")}{acts(
          <button type="button" className="head-act" title={t("newParent")} onClick={() => startKid("parent")}><Plus className="icon" aria-hidden="true" />{t("addShort")}</button>,
          <button type="button" className="head-act" title={t("tipAddParents")} aria-expanded={addingParents} onClick={() => setAddingParents(!addingParents)}><Search className="icon" aria-hidden="true" />{t("findShort")}</button>)}</legend>
        {addingParents && <PersonPick choices={familyChoices} clearOnPick focus
                    exclude={[...form.parents.map((p) => p.fam), ...families.map((f) => f.xref!)]} value="" label="" tip={t("tipAddParents")}
                    placeholder={t("pickFamily")} onPick={(id) => { if (id) { set("parents", [...form.parents, { origin: -1, fam: id, pedigree: "" }]); setAddingParents(false); } }} />}
        {form.parents.map((p, i) => (
          <div className="item" key={p.origin < 0 ? `new${i}` : p.origin}>
            <div className="item-head">
              <span className="grow">{familyLabel(p.fam)}</span>
              <select value={p.pedigree} aria-label={t("pedigree")} title={t("tipPedigree")}
                      onChange={(e) => set("parents", form.parents.map((q, j) => (j === i ? { ...q, pedigree: e.target.value } : q)))}>
                <option value="">{t("pedigree")}</option>
                {PEDIGREES.map((k) => <option key={k} value={k}>{t(`pedi_${k}` as StringKey)}</option>)}
              </select>
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("parents", form.parents.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
          </div>
        ))}
        {newPersonForm("parent", 0)}
      </fieldset>
      <fieldset className="list">
        <legend>{ico(Handshake)}{t("associations")}{acts(<button type="button" className="head-act" title={t("tipAddAssoc")} aria-expanded={addingAssoc} onClick={() => setAddingAssoc(!addingAssoc)}><Plus className="icon" aria-hidden="true" />{t("addAssoc")}</button>)}</legend>
        {addingAssoc && <PersonPick choices={personChoices} clearOnPick focus exclude={[record.xref!]} value="" label="" tip={t("tipAddAssoc")}
                    placeholder={t("pickPerson")} onPick={(id) => { if (id) { set("associations", [...form.associations, { origin: -1, id, role: "" }]); setAddingAssoc(false); } }} />}
        {form.associations.map((a, i) => (
          <div className="item" key={a.origin < 0 ? `new${i}` : a.origin}>
            <div className="item-head">
              <span className="grow">{labelOf(a.id)}</span>
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("associations", form.associations.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            <label className="full" title={t("tipAssocRole")}><input placeholder={t("assocRole")} aria-label={t("assocRole")} type="text" value={a.role} onChange={(e) => setAssoc(i, { role: e.target.value })} /></label>
          </div>
        ))}
      </fieldset>
      </>)}
      {section("facts", <>
      <fieldset className="list">
        <legend>{ico(Briefcase)}{t("occupation")}{acts(<button type="button" className="head-act" onClick={() => set("occupations",
          [...form.occupations, { origin: -1, value: "", date: "", place: "" }])}><Plus className="icon" aria-hidden="true" />{t("addOccupation")}</button>)}</legend>
        {form.occupations.map((o, i) => (
          <div className="item" key={o.origin < 0 ? `new${i}` : o.origin}>
            <div className="item-head">
              <input type="text" value={o.value} aria-label={t("occupation")} title={t("tipOccupation")}
                     onChange={(e) => setOcc(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("occupations", form.occupations.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            <DateField value={o.date} shown={o.origin < 0 ? "" : initial.shown.occupations[o.origin].date} lang={lang}
                       t={t} onChange={(v) => setOcc(i, { date: v })} />
            <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={o.place} list={PLACES}
                     onChange={(e) => setOcc(i, { place: e.target.value })} /></label>
          </div>
        ))}
      </fieldset>
      <fieldset className="list">
        <legend>{ico(Tags)}{t("attributes")}{acts(<button type="button" className="head-act" onClick={() => set("attributes",
          [...form.attributes, { origin: -1, tag: ATTRIBUTE_TAGS[0], value: "", date: "", place: "" }])}><Plus className="icon" aria-hidden="true" />{t("addAttribute")}</button>)}</legend>
        {form.attributes.map((a, i) => (
          <div className="item" key={a.origin < 0 ? `new${i}` : a.origin}>
            <div className="item-head">
              <select value={a.tag} disabled={a.origin >= 0} aria-label={t("attributes")} title={t("tipAttrKind")}
                      onChange={(e) => setAttr(i, { tag: e.target.value })}>
                {ATTRIBUTE_TAGS.map((tag) => <option key={tag} value={tag}>{t(`attr${tag}` as StringKey)}</option>)}
              </select>
              <input type="text" value={a.value} aria-label={t("attributes")} title={t("tipAttrValue")}
                     onChange={(e) => setAttr(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("attributes", form.attributes.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            <DateField value={a.date} shown={a.origin < 0 ? "" : shownAttr(a.origin)} lang={lang}
                       t={t} onChange={(v) => setAttr(i, { date: v })} />
            <label title={t("tipPlace")}><input placeholder={t("place")} aria-label={t("place")} type="text" value={a.place} list={PLACES}
                     onChange={(e) => setAttr(i, { place: e.target.value })} /></label>
          </div>
        ))}
      </fieldset>
      </>)}
      {section("notes", <>
      <label title={t("tipNote")}><textarea placeholder={t("note")} aria-label={t("note")} rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
      <fieldset className="list">
        <legend>{ico(BookMarked)}{t("sources")}{acts(<button type="button" className="head-act" onClick={() => set("citations",
          [...form.citations, { origin: -1, source: sources[0]?.xref || "", page: "", quality: "" }])}><Plus className="icon" aria-hidden="true" />{t("addCitation")}</button>)}</legend>
        {form.citations.map((c, i) => (
          <div className="item" key={c.origin < 0 ? `new${i}` : c.origin}>
            <div className="item-head">
              {/* a pointer to a source record is chosen from the list, a citation written as text stays text */}
              {/^@[^@]+@$/.test(c.source) || (c.origin < 0 && sources.length > 0)
                ? <select className="fill" value={c.source} aria-label={t("sources")} title={t("tipSource")} onChange={(e) => setCite(i, { source: e.target.value })}>
                    {!sources.some((s) => s.xref === c.source) && <option value={c.source}>{c.source}</option>}
                    {sources.map((s) => <option key={s.xref} value={s.xref}>{s.title}</option>)}
                  </select>
                : <input type="text" value={c.source} aria-label={t("sources")} title={t("tipSource")} onChange={(e) => setCite(i, { source: e.target.value })} />}
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("citations", form.citations.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            <div className="pair">
              <label title={t("tipPage")}><input placeholder={t("srcPage")} aria-label={t("srcPage")} type="text" value={c.page} onChange={(e) => setCite(i, { page: e.target.value })} /></label>
              <label title={t("tipQuality")}><span>{t("quality")}</span>
                <select value={c.quality} onChange={(e) => setCite(i, { quality: e.target.value })}>
                  <option value="">–</option>
                  {QUALITY.map((q) => <option key={q} value={q}>{t(`quality${q}` as StringKey)}</option>)}
                </select></label>
            </div>
          </div>
        ))}
      </fieldset>
      </>)}
      {section("other", <>
      <label title={t("tipRestriction")}><span>{t("restriction")}</span>
        <select value={form.restriction} onChange={(e) => set("restriction", e.target.value)}>
          <option value="">–</option>
          {!RESTRICTIONS.includes(form.restriction) && form.restriction && <option value={form.restriction}>{form.restriction}</option>}
          {RESTRICTIONS.map((r) => <option key={r} value={r}>{t(`resn_${r}` as StringKey)}</option>)}
        </select></label>
      <label title={t("tipAddress")}><textarea placeholder={t("address")} aria-label={t("address")} rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
      <fieldset className="list">
        <legend>{ico(Phone)}{t("contacts")}{acts(<button type="button" className="head-act" onClick={() => set("contacts", [...form.contacts, { origin: -1, tag: CONTACT_TAGS[0], value: "" }])}><Plus className="icon" aria-hidden="true" />{t("addContact")}</button>)}</legend>
        {form.contacts.map((c, i) => (
          <div className="item" key={c.origin < 0 ? `new${i}` : c.origin}>
            <div className="item-head">
              <select value={c.tag} disabled={c.origin >= 0} aria-label={t("contacts")} title={t("tipContactKind")} onChange={(e) => setContact(i, { tag: e.target.value })}>
                {CONTACT_TAGS.map((tag) => <option key={tag} value={tag}>{t(`contact_${tag}` as StringKey)}</option>)}
              </select>
              <input type="text" value={c.value} aria-label={t(`contact_${c.tag}` as StringKey)} title={t("tipContactValue")} onChange={(e) => setContact(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("contacts", form.contacts.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </fieldset>
      <fieldset className="list">
        <legend>{ico(Hash)}{t("references")}{acts(<button type="button" className="head-act" onClick={() => set("references", [...form.references, { origin: -1, value: "", type: "" }])}><Plus className="icon" aria-hidden="true" />{t("addReference")}</button>)}</legend>
        {form.references.map((r, i) => (
          <div className="item" key={r.origin < 0 ? `new${i}` : r.origin}>
            <div className="item-head">
              <input type="text" value={r.value} aria-label={t("references")} title={t("tipRefValue")} onChange={(e) => setRef(i, { value: e.target.value })} />
              <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                      onClick={() => set("references", form.references.filter((_, j) => j !== i))}>
                <Trash2 className="icon" aria-hidden="true" /></button>
            </div>
            <label className="full" title={t("tipRefType")}><input placeholder={t("refType")} aria-label={t("refType")} type="text" value={r.type} onChange={(e) => setRef(i, { type: e.target.value })} /></label>
          </div>
        ))}
      </fieldset>
      <div className="pair">
        <label title={t("tipAfn")}><input placeholder={t("afn")} aria-label={t("afn")} type="text" value={form.afn} onChange={(e) => set("afn", e.target.value)} /></label>
        <label title={t("tipRfn")}><input placeholder={t("rfn")} aria-label={t("rfn")} type="text" value={form.rfn} onChange={(e) => set("rfn", e.target.value)} /></label>
      </div>
      </>)}
      <SuggestLists suggest={suggest} lang={lang} />
    </form>
  );
}
