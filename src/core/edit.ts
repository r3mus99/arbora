/**
 * Editing: the fields of a person or family as a form sees them, applied back
 * to the GEDCOM records, and the records written out as GEDCOM text again.
 * Only what changed is touched, so tags the app does not know stay as they were.
 */

import { MONTHS, gedcomDay, validDateValue } from "./date";
import { formatDate } from "./format";
import { ATTRIBUTE_TAGS } from "./facts";
import { EXTRA_EVENT_TAGS } from "./timeline";
import { childOf, childrenOf, gedNode, isAka, joinedSrc, mainName, rewritten, type GedNode } from "./gedcom";
import { TEXTS, type Lang } from "./texts";

export interface EventFields { date: string; place: string }

export interface PersonFields {
  given: string;
  surname: string;
  /** "M", "F", "U" or "" (no SEX line) */
  sex: string;
  birth: EventFields;
  christening: EventFields;
  death: EventFields;
  burial: EventFields;
  /** OCCU lines in file order; `origin` is the index among them, -1 for a new one */
  occupations: Occupation[];
  /** the first NOTE written in the record (not a link to a NOTE record) */
  note: string;
  /** RELI, religious affiliation */
  religion: string;
  /** died, even without a known date: a DEAT, BURI or CREM line */
  deceased: boolean;
  /** other forms of the name, NAME lines with TYPE aka; `origin` as for occupations */
  aliases: Alias[];
  /** the lines under the main NAME that hold the other parts of the name */
  nameParts: NameParts;
  /** age, cause and agency of birth, christening, death and burial */
  details: Record<EventKey, EventDetailFields>;
  /** the other events of the person (baptism, residence, custom, …) */
  events: EventRow[];
  /** the source citations written directly under the person */
  citations: CitationRow[];
  /** the attribute lines (education, nationality, …) that have a value, date or place; `origin` is the index among all attribute lines, -1 for a new one */
  attributes: AttributeRow[];
}

/** AGE, CAUS and AGNC written under an event line */
export interface EventDetailFields { age: string; cause: string; agency: string }
const NO_DETAILS: EventDetailFields = { age: "", cause: "", agency: "" };

/** an event of the person beyond birth, christening, death and burial: `origin` is the index among such lines, -1 for a new one */
export interface EventRow extends EventFields, EventDetailFields {
  origin: number;
  tag: string;
  /** the TYPE of a custom event (EVEN) */
  title: string;
  /** the text on the line itself: the address of a residence, what a custom event is about */
  value: string;
}

/** the tags of the other events, in the order they are offered */
export const OTHER_EVENT_TAGS = [...EXTRA_EVENT_TAGS, "RESI", "EVEN"];

/** a source citation directly under the person: `source` is the pointer to a source record (@S1@) or the text of the citation */
export interface CitationRow {
  /** the index among the person's SOUR lines, -1 for a new one */
  origin: number;
  source: string;
  /** PAGE: where in the source */
  page: string;
  /** QUAY: how reliable, "0" to "3", or "" */
  quality: string;
}

export interface AttributeRow extends EventFields { origin: number; tag: string; value: string }

/** NPFX title before the name, NICK nickname, SPFX surname prefix (van, de), NSFX what follows the name; the first line of each */
export interface NameParts { prefix: string; nickname: string; surnamePrefix: string; suffix: string }

export interface Alias { origin: number; given: string; surname: string }

export interface Occupation extends EventFields { origin: number; value: string }

/** the marriage and the divorce of a family; `divorce` and its details only count while `divorced` is set */
export interface FamilyFields {
  marriage: EventFields;
  divorced: boolean;
  divorce: EventFields;
  /** the spouses and the children as pointers (@I1@); "" when a spouse is not set */
  husb: string;
  wife: string;
  children: string[];
  /** age, cause and agency written under MARR and DIV */
  details: { marriage: EventDetailFields; divorce: EventDetailFields };
}

const EVENT_TAGS = { birth: "BIRT", christening: "CHR", death: "DEAT", burial: "BURI" } as const;
type EventKey = keyof typeof EVENT_TAGS;
export const PERSON_EVENTS = Object.keys(EVENT_TAGS) as EventKey[];

const DEATH_TAGS = ["DEAT", "BURI", "CREM"];
const isLink = (value: string) => /^@[^@]+@$/.test(value);
const inlineNote = (rec: GedNode) => rec.children.find((c) => c.tag === "NOTE" && !isLink(c.value)) || null;

function datePlace(ev: GedNode | null): EventFields {
  const d = ev && childOf(ev, "DATE"), p = ev && childOf(ev, "PLAC");
  return { date: d ? d.value : "", place: p ? p.value : "" };
}
const detailFields = (ev: GedNode | null): EventDetailFields => ({
  age: (ev && childOf(ev, "AGE")?.value) || "", cause: (ev && childOf(ev, "CAUS")?.value) || "", agency: (ev && childOf(ev, "AGNC")?.value) || "",
});
const eventFields = (rec: GedNode, tag: string) => datePlace(childOf(rec, tag));

/** "Ján Pavol /Kováč/ ml." → given, surname and what follows the surname */
function splitName(value: string): { given: string; surname: string; suffix: string } {
  const m = /^([^/]*)\/([^/]*)\/?(.*)$/.exec(value);
  if (!m) return { given: value.trim(), surname: "", suffix: "" };
  return { given: m[1].trim(), surname: m[2].trim(), suffix: m[3].trim() };
}

/** given name and surname of a NAME line, from GIVN and SURN when the value has none */
function nameParts(name: GedNode | null): { given: string; surname: string } {
  let { given, surname } = splitName(name ? name.value : "");
  if (name && !given && !surname) {
    given = childOf(name, "GIVN")?.value || "";
    surname = childOf(name, "SURN")?.value || "";
  }
  return { given, surname };
}
const akaNames = (rec: GedNode) => rec.children.filter((c) => c.tag === "NAME" && isAka(c) && c !== mainName(rec));

const NAME_PART_TAGS = { prefix: "NPFX", nickname: "NICK", surnamePrefix: "SPFX", suffix: "NSFX" } as const;
const NAME_PART_ORDER = ["NPFX", "GIVN", "NICK", "SPFX", "SURN", "NSFX"];

function namePartFields(name: GedNode | null): NameParts {
  const get = (tag: string) => (name && childOf(name, tag)?.value) || "";
  return { prefix: get("NPFX"), nickname: get("NICK"), surnamePrefix: get("SPFX"), suffix: get("NSFX") };
}

export function personFields(rec: GedNode): PersonFields {
  const { given, surname } = nameParts(mainName(rec));
  const sex = childOf(rec, "SEX");
  const fields: PersonFields = {
    given, surname, sex: sex ? sex.value.toUpperCase() : "",
    birth: eventFields(rec, "BIRT"), christening: eventFields(rec, "CHR"),
    death: eventFields(rec, "DEAT"), burial: eventFields(rec, "BURI"),
    occupations: rec.children.filter((c) => c.tag === "OCCU")
      .map((c, origin) => ({ origin, value: c.value, ...datePlace(c) })),
    note: inlineNote(rec)?.value || "",
    religion: childOf(rec, "RELI")?.value || "",
    deceased: DEATH_TAGS.some((tag) => childOf(rec, tag)),
    aliases: akaNames(rec).map((n, origin) => ({ origin, ...nameParts(n) })),
    nameParts: namePartFields(mainName(rec)),
    details: Object.fromEntries(PERSON_EVENTS.map((key) => [key, detailFields(childOf(rec, EVENT_TAGS[key]))])) as Record<EventKey, EventDetailFields>,
    events: rec.children.filter((c) => OTHER_EVENT_TAGS.includes(c.tag)).map((c, origin) => ({
      origin, tag: c.tag, title: c.tag === "EVEN" ? childOf(c, "TYPE")?.value || "" : "",
      value: c.value === "Y" ? "" : c.value, ...datePlace(c), ...detailFields(c),
    })),
    citations: childrenOf(rec, "SOUR").map((c, origin) => ({
      origin, source: c.value, page: childOf(c, "PAGE")?.value || "", quality: childOf(c, "QUAY")?.value.trim() || "",
    })),
    attributes: rec.children.filter((c) => ATTRIBUTE_TAGS.includes(c.tag))
      .map((c, origin) => ({ origin, tag: c.tag, value: c.value === "Y" ? "" : c.value, ...datePlace(c) }))
      .filter((a) => a.value || a.date || a.place),
  };
  return fields;
}

export function familyFields(rec: GedNode): FamilyFields {
  return {
    marriage: eventFields(rec, "MARR"), divorced: !!childOf(rec, "DIV"), divorce: eventFields(rec, "DIV"),
    husb: childOf(rec, "HUSB")?.value.trim() || "", wife: childOf(rec, "WIFE")?.value.trim() || "",
    children: childrenOf(rec, "CHIL").map((c) => c.value.trim()).filter(Boolean),
    details: { marriage: detailFields(childOf(rec, "MARR")), divorce: detailFields(childOf(rec, "DIV")) },
  };
}

/** Given names, surnames, places and religions used in the file, sorted, for suggestions in the form.
 *  Names come only from each person's main name, never from aka names. */
export type Suggestions = { givens: string[]; givensM: string[]; givensF: string[]; surnames: string[]; places: string[]; religions: string[] };

/** `givensM` and `givensF` hold only the given names already used for men or for women in the file. */
export function suggestions(records: GedNode[]): Suggestions {
  const givensM = new Set<string>(), givensF = new Set<string>(), givens = new Set<string>(), surnames = new Set<string>(), places = new Set<string>(), religions = new Set<string>();
  const walk = (n: GedNode) => {
    if (n.tag === "PLAC" && n.value) places.add(n.value);
    if (n.tag === "RELI" && n.value) religions.add(n.value);
    n.children.forEach(walk);
  };
  records.forEach((rec) => {
    walk(rec);
    // only people: other records (places, repositories) have a NAME too
    if (rec.tag !== "INDI") return;
    const name = mainName(rec);
    if (!name) return;
    const parts = splitName(name.value);
    const given = parts.given || childOf(name, "GIVN")?.value || "";
    const surname = parts.surname || childOf(name, "SURN")?.value || "";
    if (given) {
      givens.add(given);
      const sex = childOf(rec, "SEX")?.value.trim().toUpperCase();
      if (sex === "M") givensM.add(given);
      if (sex === "F") givensF.add(given);
    }
    if (surname) surnames.add(surname);
  });
  const sort = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return { givens: sort(givens), givensM: sort(givensM), givensF: sort(givensF), surnames: sort(surnames), places: sort(places), religions: sort(religions) };
}

// ------------------------------------------------------------ changing nodes


/** usual GEDCOM order of a person's or family's lines; new lines go to their place */
const ORDER = ["NAME", "SEX", "HUSB", "WIFE", "BIRT", "CHR", "BAPM", "DEAT", "BURI", "CREM", "MARR", "DIV",
               "OCCU", "RELI", ...ATTRIBUTE_TAGS, "NOTE"];
const LINKS = new Set(["FAMC", "FAMS", "CHIL"]);
const CLOSING = new Set(["SOUR", "OBJE", "CHAN", "RIN", "REFN"]);
const LATE = new Set(["FAMC", "FAMS", "CHIL", "SOUR", "OBJE", "CHAN", "RIN", "REFN"]);

/** A record with one more line `tag value`, put where GEDCOM usually has it; written anew. */
export function addLine(rec: GedNode, tag: string, value: string): GedNode {
  return rewritten(rec, insert(rec.children, gedNode(tag, value)));
}

function insert(children: GedNode[], added: GedNode): GedNode[] {
  const rank = ORDER.indexOf(added.tag);
  // after the lines with the same tag, else before the first one that comes later
  let at = children.map((c) => c.tag).lastIndexOf(added.tag) + 1;
  // the links to families come after everything else except the lines that always close a record
  if (!at && LINKS.has(added.tag)) at = children.findIndex((c) => CLOSING.has(c.tag));
  else if (!at) at = children.findIndex((c) => LATE.has(c.tag) || ORDER.indexOf(c.tag) > rank);
  if (at < 0) at = children.length;
  return [...children.slice(0, at), added, ...children.slice(at)];
}

/** Set (or with "" remove) the first child with the tag. */
function setChild(parent: GedNode, tag: string, value: string, insertAt?: number): GedNode {
  const i = parent.children.findIndex((c) => c.tag === tag);
  let children: GedNode[];
  if (!value) children = i < 0 ? parent.children : parent.children.filter((_, j) => j !== i);
  else if (i >= 0) children = parent.children.map((c, j) => (j === i ? { ...c, value } : c));
  else if (insertAt !== undefined) children = [...parent.children.slice(0, insertAt), gedNode(tag, value),
                                                ...parent.children.slice(insertAt)];
  else children = insert(parent.children, gedNode(tag, value));
  return { ...parent, children };
}

/** DATE and PLAC of an event (or OCCU) node; its other lines stay */
function setDatePlace(ev: GedNode, before: EventFields, after: EventFields): GedNode {
  if (after.date !== before.date) ev = setChild(ev, "DATE", after.date, 0);
  if (after.place !== before.place) {
    const d = ev.children.findIndex((c) => c.tag === "DATE");
    ev = setChild(ev, "PLAC", after.place, d + 1);
  }
  return ev;
}

/** the order of the lines under an event; a line the app does not know stays where it is */
const EVENT_LINE_ORDER = ["TYPE", "DATE", "PLAC", "ADDR", "AGE", "AGNC", "CAUS"];

/** AGE, AGNC and CAUS of an event set to the typed values (an empty one is removed), in the usual place */
function setDetails(ev: GedNode, before: EventDetailFields, after: EventDetailFields): GedNode {
  const tags = { age: "AGE", agency: "AGNC", cause: "CAUS" } as const;
  for (const k of ["age", "agency", "cause"] as const) {
    const value = after[k].trim();
    if (value === before[k]) continue;
    const rank = EVENT_LINE_ORDER.indexOf(tags[k]);
    const at = ev.children.findIndex((c) => { const r = EVENT_LINE_ORDER.indexOf(c.tag); return r > rank || r < 0; });
    ev = setChild(ev, tags[k], value, at < 0 ? ev.children.length : at);
  }
  return ev;
}

function setEvent(rec: GedNode, tag: string, before: EventFields, after: EventFields,
                  beforeD: EventDetailFields = NO_DETAILS, afterD: EventDetailFields = NO_DETAILS): GedNode {
  const same = (["age", "cause", "agency"] as const).every((k) => beforeD[k] === afterD[k].trim());
  if (before.date === after.date && before.place === after.place && same) return rec;
  const i = rec.children.findIndex((c) => c.tag === tag);
  const ev = setDetails(setDatePlace(i >= 0 ? rec.children[i] : gedNode(tag), before, after), beforeD, afterD);
  // an event left without anything in it ("1 DEAT Y" says the person died, so it stays)
  const empty = !ev.children.length && !ev.value;
  if (i < 0) return empty ? rec : { ...rec, children: insert(rec.children, ev) };
  return { ...rec, children: empty ? rec.children.filter((_, j) => j !== i)
                                   : rec.children.map((c, j) => (j === i ? ev : c)) };
}

const sameEvent = (a: EventRow, b: EventRow) => (["title", "value", "date", "place", "age", "cause", "agency"] as const).every((k) => a[k] === b[k]);

/** The other event lines from the rows: kept ones updated, removed ones deleted, new ones added after the other events. */
function setEvents(rec: GedNode, before: EventRow[], after: EventRow[]): GedNode {
  const rows = after.map((e) => ({ ...e, title: e.title.trim(), value: e.value.trim(), date: e.date.trim(), place: e.place.trim(),
                                   age: e.age.trim(), cause: e.cause.trim(), agency: e.agency.trim() }));
  if (rows.length === before.length && rows.every((e, i) => e.origin === before[i].origin && sameEvent(e, before[i]))) return rec;
  let k = -1;
  const children: GedNode[] = [];
  for (const c of rec.children) {
    if (!OTHER_EVENT_TAGS.includes(c.tag)) { children.push(c); continue; }
    k++;
    const was = before.find((b) => b.origin === k);
    const row = rows.find((e) => e.origin === k);
    if (!row) continue;
    if (!was || sameEvent(row, was)) { children.push(c); continue; }
    let ev = setDetails(setDatePlace(row.value === was.value ? c : { ...c, value: row.value }, was, row), was, row);
    if (row.title !== was.title) ev = setChild(ev, "TYPE", row.title, 0);
    children.push(ev);
  }
  let out = { ...rec, children };
  for (const row of rows.filter((e) => e.origin < 0)) {
    let ev = gedNode(row.tag, row.value);
    ev = setDetails(setDatePlace(ev, { date: "", place: "" }, row), NO_DETAILS, row);
    if (row.tag === "EVEN" && row.title) ev = setChild(ev, "TYPE", row.title, 0);
    // after the last event of the person, else before the lines that always come last
    const last = out.children.map((c) => OTHER_EVENT_TAGS.includes(c.tag) || ["BIRT", "CHR", "DEAT", "BURI"].includes(c.tag)).lastIndexOf(true);
    const at = last >= 0 ? last + 1 : out.children.findIndex((c) => LATE.has(c.tag));
    out = { ...out, children: [...out.children.slice(0, at < 0 ? out.children.length : at), ev, ...out.children.slice(at < 0 ? out.children.length : at)] };
  }
  return out;
}

/** a NAME value; the slashes around an empty surname are written only when the old value had them */
function nameValue(given: string, surname: string, suffix: string, old: GedNode | null): string {
  const slashes = surname || old?.value.includes("/") ? `/${surname}/` : "";
  return [given, slashes, suffix].filter(Boolean).join(" ");
}

function setName(rec: GedNode, before: PersonFields, after: PersonFields): GedNode {
  if (before.given === after.given && before.surname === after.surname) return rec;
  const given = after.given.trim(), surname = after.surname.trim();
  const main = mainName(rec);
  const i = main ? rec.children.indexOf(main) : -1;
  const old = i >= 0 ? rec.children[i] : null;
  const suffix = old ? splitName(old.value).suffix : "";
  const value = nameValue(given, surname, suffix, old);
  let name = old ? { ...old, value } : gedNode("NAME", value);
  if (old && childOf(old, "GIVN") || given && !old) name = setChild(name, "GIVN", given);
  if (old && childOf(old, "SURN") || surname && !old) name = setChild(name, "SURN", surname);
  if (!given && !surname && !old) return rec;
  return { ...rec, children: old ? rec.children.map((c, j) => (j === i ? name : c)) : insert(rec.children, name) };
}

/** The parts of the main name (title, nickname, surname prefix, suffix) set as lines under it, in the usual order; other lines stay. */
function setNameParts(rec: GedNode, before: NameParts, after: NameParts): GedNode {
  const keys = (Object.keys(NAME_PART_TAGS) as (keyof NameParts)[]).filter((k) => after[k].trim() !== before[k]);
  if (!keys.length) return rec;
  const main = mainName(rec);
  let name = main || gedNode("NAME", "");
  for (const k of keys) {
    const tag = NAME_PART_TAGS[k], value = after[k].trim();
    const rank = NAME_PART_ORDER.indexOf(tag);
    const at = name.children.findIndex((c) => { const r = NAME_PART_ORDER.indexOf(c.tag); return r > rank || r < 0; });
    name = setChild(name, tag, value, at < 0 ? name.children.length : at);
  }
  if (!main) return name.children.length ? { ...rec, children: insert(rec.children, name) } : rec;
  return { ...rec, children: rec.children.map((c) => (c === main ? name : c)) };
}

/** A NAME value and its GIVN/SURN lines set to the given name and surname; the suffix stays. */
function nameNode(old: GedNode | null, given: string, surname: string): GedNode {
  const value = nameValue(given, surname, old ? splitName(old.value).suffix : "", old);
  let name = old ? { ...old, value } : gedNode("NAME", value);
  if (old && childOf(old, "GIVN")) name = setChild(name, "GIVN", given);
  if (old && childOf(old, "SURN")) name = setChild(name, "SURN", surname);
  return name;
}

/** NAME lines with TYPE aka from the rows: kept ones updated, missing ones removed, new ones added. */
function setAliases(rec: GedNode, before: Alias[], after: Alias[], main: PersonFields): GedNode {
  const [mg, ms] = [main.given.trim(), main.surname.trim()];
  const rows = after.map((a) => ({ ...a, given: a.given.trim(), surname: a.surname.trim() }))
    // a new aka that does not differ from the main name (the form starts as a copy of it) is dropped
    .filter((a) => (a.given || a.surname) && (a.origin >= 0 || a.given !== mg || a.surname !== ms));
  if (rows.length === before.length && rows.every((a, i) => a.origin === i && a.given === before[i].given
                                                       && a.surname === before[i].surname)) return rec;
  const olds = akaNames(rec);
  const children: GedNode[] = [];
  for (const c of rec.children) {
    const k = olds.indexOf(c);
    if (k < 0) { children.push(c); continue; }
    const row = rows.find((a) => a.origin === k);
    if (!row) continue;
    const same = row.given === before[k].given && row.surname === before[k].surname;
    children.push(same ? c : nameNode(c, row.given, row.surname));
  }
  let out = { ...rec, children };
  for (const row of rows.filter((a) => a.origin < 0)) {
    const added = nameNode(null, row.given, row.surname);
    out = { ...out, children: insert(out.children, { ...added, children: [gedNode("TYPE", "aka")] }) };
  }
  return out;
}

const sameOccupation = (a: Occupation, b: Occupation) =>
  a.value === b.value && a.date === b.date && a.place === b.place;

/** OCCU lines from the rows: kept ones updated, missing ones removed, new ones added after the others. */
function setOccupations(rec: GedNode, before: Occupation[], after: Occupation[]): GedNode {
  const rows = after.map((o) => ({ ...o, value: o.value.trim(), date: o.date.trim(), place: o.place.trim() }))
    .filter((o) => o.value || o.date || o.place);
  if (rows.length === before.length && rows.every((o, i) => o.origin === i && sameOccupation(o, before[i]))) return rec;
  let k = -1;
  const children: GedNode[] = [];
  for (const c of rec.children) {
    if (c.tag !== "OCCU") { children.push(c); continue; }
    k++;
    const row = rows.find((o) => o.origin === k);
    if (!row) continue;
    children.push(setDatePlace(row.value === c.value ? c : { ...c, value: row.value }, before[k], row));
  }
  let out = { ...rec, children };
  for (const row of rows.filter((o) => o.origin < 0)) {
    out = { ...out, children: insert(out.children, setDatePlace(gedNode("OCCU", row.value), { date: "", place: "" }, row)) };
  }
  return out;
}

const sameAttribute = (a: AttributeRow, b: AttributeRow) => a.value === b.value && a.date === b.date && a.place === b.place;

/** Attribute lines from the rows: kept ones updated, removed ones deleted, new ones added after the others; lines the form did not list stay. */
function setAttributes(rec: GedNode, before: AttributeRow[], after: AttributeRow[]): GedNode {
  const rows = after.map((a) => ({ ...a, value: a.value.trim(), date: a.date.trim(), place: a.place.trim() }))
    .filter((a) => a.value || a.date || a.place);
  if (rows.length === before.length && rows.every((a, i) => a.origin === before[i].origin && sameAttribute(a, before[i]))) return rec;
  let k = -1;
  const children: GedNode[] = [];
  for (const c of rec.children) {
    if (!ATTRIBUTE_TAGS.includes(c.tag)) { children.push(c); continue; }
    k++;
    const was = before.find((b) => b.origin === k);
    const row = rows.find((a) => a.origin === k);
    if (!was) { children.push(c); continue; }
    if (!row) continue;
    children.push(setDatePlace(row.value === was.value ? c : { ...c, value: row.value }, was, row));
  }
  let out = { ...rec, children };
  for (const row of rows.filter((a) => a.origin < 0)) {
    out = { ...out, children: insert(out.children, setDatePlace(gedNode(row.tag, row.value), { date: "", place: "" }, row)) };
  }
  return out;
}

/** The citation line with the typed page and quality; PAGE comes first, QUAY before the notes. */
function setCitation(cite: GedNode, before: CitationRow, after: CitationRow): GedNode {
  let out = cite;
  if (after.source !== before.source) out = { ...out, value: after.source };
  if (after.page !== before.page) out = setChild(out, "PAGE", after.page, 0);
  if (after.quality !== before.quality) {
    const note = out.children.findIndex((c) => c.tag === "NOTE");
    out = setChild(out, "QUAY", after.quality, note < 0 ? out.children.length : note);
  }
  return out;
}

/** The citations from the rows: kept ones updated, removed ones deleted, new ones added with the other SOURs. */
function setCitations(rec: GedNode, before: CitationRow[], after: CitationRow[]): GedNode {
  const rows = after.map((r) => ({ ...r, source: r.source.trim(), page: r.page.trim(), quality: r.quality.trim() }));
  const same = (a: CitationRow, b: CitationRow) => a.source === b.source && a.page === b.page && a.quality === b.quality;
  if (rows.length === before.length && rows.every((r, i) => r.origin === before[i].origin && same(r, before[i]))) return rec;
  let k = -1;
  const children: GedNode[] = [];
  for (const c of rec.children) {
    if (c.tag !== "SOUR") { children.push(c); continue; }
    k++;
    const was = before.find((b) => b.origin === k);
    const row = rows.find((r) => r.origin === k);
    if (!was) { children.push(c); continue; }
    if (!row || !row.source) continue;
    children.push(same(row, was) ? c : setCitation(c, was, row));
  }
  let out = { ...rec, children };
  const empty: CitationRow = { origin: -1, source: "", page: "", quality: "" };
  for (const row of rows.filter((r) => r.origin < 0 && r.source)) {
    out = { ...out, children: insert(out.children, setCitation(gedNode("SOUR", row.source), empty, { ...row, source: "" })) };
  }
  return out;
}

function setNote(rec: GedNode, text: string): GedNode {
  const note = inlineNote(rec);
  const value = text.replace(/\r\n?/g, "\n").trim();
  if (!note) return value ? { ...rec, children: insert(rec.children, gedNode("NOTE", value)) } : rec;
  return { ...rec, children: value ? rec.children.map((c) => (c === note ? { ...c, value } : c))
                                   : rec.children.filter((c) => c !== note) };
}

/** "1 DEAT Y" for a death without any details, removed again when unticked */
function setDeceased(rec: GedNode, before: boolean, after: boolean): GedNode {
  const dead = DEATH_TAGS.some((tag) => childOf(rec, tag));
  if (after && !dead) return { ...rec, children: insert(rec.children, gedNode("DEAT", "Y")) };
  if (!after && before) {
    const bare = (c: GedNode) => c.tag === "DEAT" && c.value === "Y" && !c.children.length;
    if (rec.children.some(bare)) return { ...rec, children: rec.children.filter((c) => !bare(c)) };
  }
  return rec;
}

const tidy = (e: EventFields): EventFields => ({ date: e.date.trim(), place: e.place.trim() });

/**
 * The person's record with the changes from `before` to `after`; the same object
 * when nothing changed. A changed record loses `raw` and is written anew.
 */
export function applyPerson(rec: GedNode, before: PersonFields, after: PersonFields): GedNode {
  let out = setName(rec, before, after);
  if (after.sex !== before.sex) out = setChild(out, "SEX", after.sex);
  for (const key of PERSON_EVENTS) out = setEvent(out, EVENT_TAGS[key], before[key], tidy(after[key]), before.details[key], after.details[key]);
  out = setEvents(out, before.events, after.events);
  out = setDeceased(out, before.deceased, after.deceased);
  out = setOccupations(out, before.occupations, after.occupations);
  out = setAttributes(out, before.attributes, after.attributes);
  out = setCitations(out, before.citations, after.citations);
  out = setNameParts(out, before.nameParts, after.nameParts);
  out = setAliases(out, before.aliases, after.aliases, after);
  if (after.religion.trim() !== before.religion) out = setChild(out, "RELI", after.religion.trim());
  if (after.note.trim() !== before.note.trim()) out = setNote(out, after.note);
  return out === rec ? rec : rewritten(out);
}

/** The record with the date and place of one of its own event lines (`node`, by identity) changed; other lines stay. */
export function applyEventNode(rec: GedNode, node: GedNode, before: EventFields, after: EventFields): GedNode {
  const at = rec.children.indexOf(node);
  if (at < 0) return rec;
  const changed = setDatePlace(node, before, tidy(after));
  if (changed === node) return rec;
  return rewritten({ ...rec, children: rec.children.map((c, i) => (i === at ? changed : c)) });
}

export interface AttributeFields extends EventFields { value: string }

/** The record with the value, date and place of one of its own lines (an attribute such as EDUC) changed. */
export function applyAttribute(rec: GedNode, node: GedNode, before: AttributeFields, after: AttributeFields): GedNode {
  const at = rec.children.indexOf(node);
  if (at < 0) return rec;
  let changed = setDatePlace(node, before, tidy(after));
  if (after.value.trim() !== before.value) changed = { ...changed, value: after.value.trim() };
  if (changed === node) return rec;
  return rewritten({ ...rec, children: rec.children.map((c, i) => (i === at ? changed : c)) });
}

/** The record with one sub-line (AGE, CAUS, AGNC) of one of its event lines set; "" removes it. */
export function applyEventLine(rec: GedNode, node: GedNode, tag: string, before: string, after: string): GedNode {
  const at = rec.children.indexOf(node);
  if (at < 0 || after.trim() === before.trim()) return rec;
  return rewritten({ ...rec, children: rec.children.map((c, i) => (i === at ? setChild(node, tag, after.trim()) : c)) });
}

export function applyFamily(rec: GedNode, before: FamilyFields, after: FamilyFields): GedNode {
  let out = setEvent(rec, "MARR", before.marriage, tidy(after.marriage), before.details.marriage, after.details.marriage);
  if (!after.divorced) {
    if (before.divorced) out = { ...out, children: out.children.filter((c) => c.tag !== "DIV") };
  } else {
    // "1 DIV Y" says the marriage ended; the date, place and details go under it
    if (!before.divorced) out = { ...out, children: insert(out.children, gedNode("DIV", "Y")) };
    const was = before.divorced ? before : { ...before, divorce: { date: "", place: "" }, details: { ...before.details, divorce: NO_DETAILS } };
    out = setEvent(out, "DIV", was.divorce, tidy(after.divorce), was.details.divorce, after.details.divorce);
  }
  for (const tag of ["HUSB", "WIFE"] as const) {
    const key = tag === "HUSB" ? "husb" : "wife";
    if (after[key] !== before[key]) out = setChild(out, tag, after[key]);
  }
  // removed children lose their CHIL line, new ones are added after the others
  for (const id of before.children) {
    if (!after.children.includes(id)) out = { ...out, children: withoutFirst(out.children, (c) => c.tag === "CHIL" && c.value.trim() === id) };
  }
  for (const id of after.children) {
    if (!before.children.includes(id) && !out.children.some((c) => c.tag === "CHIL" && c.value.trim() === id)) {
      out = { ...out, children: insert(out.children, gedNode("CHIL", id)) };
    }
  }
  return out === rec ? rec : rewritten(out);
}

const withoutFirst = (list: GedNode[], is: (c: GedNode) => boolean) => {
  const i = list.findIndex(is);
  return i < 0 ? list : list.filter((_, j) => j !== i);
};

/** a record with the pointer line `tag @fam@` (FAMC, FAMS) added when it has none, or removed when `on` is false */
function setLink(rec: GedNode, tag: "FAMC" | "FAMS", fam: string, on: boolean): GedNode {
  const has = rec.children.some((c) => c.tag === tag && c.value.trim() === fam);
  if (on === has) return rec;
  const children = on ? insert(rec.children, gedNode(tag, fam)) : withoutFirst(rec.children, (c) => c.tag === tag && c.value.trim() === fam);
  return rewritten({ ...rec, children });
}

/**
 * The other records a family change touches: a child taken out of the family loses its FAMC line, a child put in gets
 * one, and the same for the FAMS line of a spouse who is replaced or removed. `get` gives the record of a person
 * (the newest one, when several families change the same person); the changed ones are returned.
 */
export function relinkFamily(fam: string, before: FamilyFields, after: FamilyFields, get: (id: string) => GedNode | undefined): GedNode[] {
  const changed = new Map<string, GedNode>();
  const touch = (id: string, tag: "FAMC" | "FAMS", on: boolean) => {
    const rec = changed.get(id) ?? get(id);
    if (!rec) return;
    const next = setLink(rec, tag, fam, on);
    if (next !== rec) changed.set(id, next);
  };
  before.children.filter((id) => !after.children.includes(id)).forEach((id) => touch(id, "FAMC", false));
  after.children.filter((id) => !before.children.includes(id)).forEach((id) => touch(id, "FAMC", true));
  for (const key of ["husb", "wife"] as const) {
    if (before[key] === after[key]) continue;
    // a spouse who is still the other spouse of the family keeps the link
    if (before[key] && ![after.husb, after.wife].includes(before[key])) touch(before[key], "FAMS", false);
    if (after[key]) touch(after[key], "FAMS", true);
  }
  return [...changed.values()];
}

// ------------------------------------------------------------ dates


/** "14.5.1891", "5/1891", "1891-05-14", "1891" → "14 MAY 1891", "MAY 1891", …; else null */
function numericDate(s: string): string | null {
  const parts = s.split(/\s*[./-]\s*|\s+/).filter(Boolean);
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  // the year is last, or first in ISO dates (and in Hungarian ones)
  const yearFirst = parts.length > 1 && parts[0].length >= 3;
  const ordered = yearFirst ? [...parts].reverse() : parts;
  const year = ordered[ordered.length - 1];
  if (year.length < 3 || year.length > 4) return null;
  const [d, m] = ordered.length === 3 ? [+ordered[0], +ordered[1]] : [null, ordered.length === 2 ? +ordered[0] : null];
  if (m !== null && !(m >= 1 && m <= 12)) return null;
  if (d !== null && !(d >= 1 && d <= 31)) return null;
  return [d, m !== null ? MONTHS[m - 1] : null, +year].filter((x) => x !== null).join(" ");
}

/** "Okt. 1961" → "10 1961": month names of the language (and GEDCOM's) as numbers */
function monthNumbers(s: string, lang: Lang): string {
  const key = (w: string) => w.toLowerCase().replace(/\.$/, "");
  const names = [TEXTS[lang].months, MONTHS];
  return s.split(" ").map((w) => {
    for (const list of names) {
      const i = list.findIndex((m) => key(m) === key(w));
      if (i >= 0) return String(i + 1);
    }
    return w;
  }).join(" ");
}

const QUALIFIED = /^(ABT|CAL|EST|BEF|AFT|BET|FROM|TO|INT) /;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What a person typed into a date field, as a GEDCOM date. Accepts GEDCOM itself
 * ("ABT 1890", "14 MAY 1891"), numbers ("14.5.1891"), month names of the language ("Okt. 1961"), ranges ("1890–1895") and the
 * qualifiers of the language ("cca 1890", "pred 1890") or ~ < >. Anything else is
 * kept as a date phrase in parentheses, with `ok` false.
 */
export function parseDate(input: string, lang: Lang): { value: string; ok: boolean } {
  const s = input.trim().replace(/\s+/g, " ");
  if (!s) return { value: "", ok: true };
  const gedcom = (t: string) => {
    const up = t.toUpperCase();
    if (!validDateValue(up)) return null;
    // a date phrase in parentheses keeps its letters as typed
    const i = t.indexOf("(");
    return i < 0 ? up : up.slice(0, i) + t.slice(i);
  };
  // a date GEDCOM allows: no 31 FEB, no INT without its phrase
  const plain = (t: string) => {
    const d = numericDate(monthNumbers(t, lang));
    return d === null ? gedcom(t) : validDateValue(d) ? d : null;
  };
  const whole = plain(s);
  if (whole) return { value: whole, ok: true };

  // a range of two plain dates, "1890–1895"
  const range = /^(.+?)\s*(?:–|—|-|\.\.)\s*(.+)$/.exec(s);
  const a = range && plain(range[1]), b = range && plain(range[2]);
  if (a && b && !QUALIFIED.test(a) && !QUALIFIED.test(b)) return { value: `BET ${a} AND ${b}`, ok: true };
  for (const key of ["ABT", "BEF", "AFT"] as const) {
    const sign = { ABT: "~", BEF: "<", AFT: ">" }[key];
    const word = escape(TEXTS[lang].qual[key]).replace(/ /g, "\\s*").replace("\\{d\\}", "(.+?)");
    for (const re of [new RegExp(`^${escape(sign)}\\s*(.+)$`), new RegExp(`^${word}$`, "i")]) {
      const m = re.exec(s);
      const d = m && plain(m[1].trim());
      if (d && !QUALIFIED.test(d) && !d.startsWith("(")) {
        return { value: `${key} ${d}`, ok: true };
      }
    }
  }
  return { value: `(${s.replace(/[()]/g, "")})`, ok: false };
}

/** A stored GEDCOM date as the form shows it: as the page writes it, when that reads back the same. */
export function dateInput(value: string, lang: Lang): string {
  if (!value) return "";
  const shown = formatDate(value, true, lang);
  return shown && parseDate(shown, lang).value === value.toUpperCase().replace(/\s+/g, " ") ? shown : value;
}

// ------------------------------------------------------------ writing GEDCOM

// GEDCOM lines may have at most 255 characters; long values continue on CONC lines
const PIECE = 200;

function pieces(value: string): string[] {
  const out: string[] = [];
  let rest = value;
  while (rest.length > PIECE) {
    // do not cut next to a space: some programs drop spaces at the ends of lines
    let cut = PIECE;
    while (cut > PIECE / 2 && (rest[cut - 1] === " " || rest[cut] === " ")) cut--;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  out.push(rest);
  return out;
}

function writeNode(n: GedNode, level: number, out: string[]) {
  if (n.verbatim !== undefined) {
    out.push(n.verbatim);
    return;
  }
  const head = `${level}${n.xref ? " " + n.xref : ""} ${n.tag}`;
  if (n.src && joinedSrc(n.src) === n.value) {
    // unchanged value: written with the same line breaks and spaces as in the file
    n.src.forEach(([t, text], i) => out.push(`${i ? `${level + 1} ${t}` : head}${text ? " " + text : ""}`));
  } else n.value.split("\n").forEach((line, i) => {
    pieces(line).forEach((piece, j) => {
      const start = i === 0 && j === 0 ? head : `${level + 1} ${j === 0 ? "CONT" : "CONC"}`;
      out.push(piece ? `${start} ${piece}` : start);
    });
  });
  for (const c of n.children) writeNode(c, level + 1, out);
}

/** GEDCOM lines of one record: the original ones when it was not changed. */
export function recordLines(rec: GedNode): string[] {
  if (rec.raw) return rec.raw;
  const out: string[] = [];
  writeNode(rec, 0, out);
  return out;
}

/** The program writing the file, recorded in the header as HEAD SOUR and DATE. */
export interface Writer { version: string; date: Date }

/** HEAD saying the file was saved by Arbora at that time; the old SOUR and DATE are replaced */
function stampHead(head: GedNode, w: Writer): GedNode {
  const d = w.date, pad = (n: number) => String(n).padStart(2, "0");
  const sour = gedNode("SOUR", "ARBORA", [gedNode("VERS", w.version), gedNode("NAME", "Arbora")]);
  const date = gedNode("DATE", gedcomDay(d),
                    [gedNode("TIME", `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`)]);
  let children = head.children;
  for (const added of [sour, date]) {
    const i = children.findIndex((c) => c.tag === added.tag);
    if (i >= 0) children = children.map((c, j) => (j === i ? added : c));
    else {
      // SOUR first, DATE after SOUR and DEST
      const tags = children.map((c) => c.tag);
      const at = added.tag === "SOUR" ? 0 : Math.max(tags.lastIndexOf("SOUR"), tags.lastIndexOf("DEST")) + 1;
      children = [...children.slice(0, at), added, ...children.slice(at)];
    }
  }
  return rewritten(head, children);
}

/**
 * The whole file as UTF-8 GEDCOM text (the header then says CHAR UTF-8). With a
 * writer the header names Arbora as the program that saved the file.
 */
export function writeGedcom(records: GedNode[], eol = "\n", writer?: Writer): string {
  const lines: string[] = [];
  for (let rec of records) {
    if (rec.tag === "HEAD") {
      const char = childOf(rec, "CHAR");
      if (char && char.value.toUpperCase() !== "UTF-8") rec = rewritten(setChild(rec, "CHAR", "UTF-8"));
      if (writer) rec = stampHead(rec, writer);
    }
    lines.push(...recordLines(rec));
  }
  return lines.join(eol) + eol;
}

/** Line ending of a GEDCOM text, to write it back the same way. */
export const lineEnding = (text: string) => (/\r\n/.test(text) ? "\r\n" : /\r/.test(text) ? "\r" : "\n");
