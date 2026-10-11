/**
 * Editing: the fields of a person or family as a form sees them, applied back
 * to the GEDCOM records, and the records written out as GEDCOM text again.
 * Only what changed is touched, so tags the app does not know stay as they were.
 */

import { formatDate } from "./format";
import type { GedNode } from "./gedcom";
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
}

export interface Occupation extends EventFields { origin: number; value: string }

export interface FamilyFields { marriage: EventFields; divorced: boolean }

const EVENT_TAGS = { birth: "BIRT", christening: "CHR", death: "DEAT", burial: "BURI" } as const;
type EventKey = keyof typeof EVENT_TAGS;
export const PERSON_EVENTS = Object.keys(EVENT_TAGS) as EventKey[];

const first = (node: GedNode, tag: string) => node.children.find((c) => c.tag === tag) || null;
const isLink = (value: string) => /^@[^@]+@$/.test(value);
const inlineNote = (rec: GedNode) => rec.children.find((c) => c.tag === "NOTE" && !isLink(c.value)) || null;

function datePlace(ev: GedNode | null): EventFields {
  const d = ev && first(ev, "DATE"), p = ev && first(ev, "PLAC");
  return { date: d ? d.value : "", place: p ? p.value : "" };
}
const eventFields = (rec: GedNode, tag: string) => datePlace(first(rec, tag));

/** "Ján Pavol /Kováč/ ml." → given, surname and what follows the surname */
function splitName(value: string): { given: string; surname: string; suffix: string } {
  const m = /^([^/]*)\/([^/]*)\/?(.*)$/.exec(value);
  if (!m) return { given: value.trim(), surname: "", suffix: "" };
  return { given: m[1].trim(), surname: m[2].trim(), suffix: m[3].trim() };
}

export function personFields(rec: GedNode): PersonFields {
  const name = first(rec, "NAME");
  let { given, surname } = splitName(name ? name.value : "");
  if (name && !given && !surname) {
    given = first(name, "GIVN")?.value || "";
    surname = first(name, "SURN")?.value || "";
  }
  const sex = first(rec, "SEX");
  const fields: PersonFields = {
    given, surname, sex: sex ? sex.value.toUpperCase() : "",
    birth: eventFields(rec, "BIRT"), christening: eventFields(rec, "CHR"),
    death: eventFields(rec, "DEAT"), burial: eventFields(rec, "BURI"),
    occupations: rec.children.filter((c) => c.tag === "OCCU")
      .map((c, origin) => ({ origin, value: c.value, ...datePlace(c) })),
    note: inlineNote(rec)?.value || "",
  };
  return fields;
}

export function familyFields(rec: GedNode): FamilyFields {
  return { marriage: eventFields(rec, "MARR"), divorced: !!first(rec, "DIV") };
}

// ------------------------------------------------------------ changing nodes

const node = (tag: string, value = "", children: GedNode[] = []): GedNode =>
  ({ tag, value, xref: null, children });

/** usual GEDCOM order of a person's or family's lines; new lines go to their place */
const ORDER = ["NAME", "SEX", "HUSB", "WIFE", "BIRT", "CHR", "BAPM", "DEAT", "BURI", "CREM", "MARR", "DIV",
               "OCCU", "NOTE"];
const LATE = new Set(["FAMC", "FAMS", "CHIL", "SOUR", "OBJE", "CHAN", "RIN", "REFN"]);

function insert(children: GedNode[], added: GedNode): GedNode[] {
  const rank = ORDER.indexOf(added.tag);
  // after the lines with the same tag, else before the first one that comes later
  let at = children.map((c) => c.tag).lastIndexOf(added.tag) + 1;
  if (!at) at = children.findIndex((c) => LATE.has(c.tag) || ORDER.indexOf(c.tag) > rank);
  if (at < 0) at = children.length;
  return [...children.slice(0, at), added, ...children.slice(at)];
}

/** Set (or with "" remove) the first child with the tag. */
function setChild(parent: GedNode, tag: string, value: string, insertAt?: number): GedNode {
  const i = parent.children.findIndex((c) => c.tag === tag);
  let children: GedNode[];
  if (!value) children = i < 0 ? parent.children : parent.children.filter((_, j) => j !== i);
  else if (i >= 0) children = parent.children.map((c, j) => (j === i ? { ...c, value } : c));
  else if (insertAt !== undefined) children = [...parent.children.slice(0, insertAt), node(tag, value),
                                                ...parent.children.slice(insertAt)];
  else children = insert(parent.children, node(tag, value));
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

function setEvent(rec: GedNode, tag: string, before: EventFields, after: EventFields): GedNode {
  if (before.date === after.date && before.place === after.place) return rec;
  const i = rec.children.findIndex((c) => c.tag === tag);
  const ev = setDatePlace(i >= 0 ? rec.children[i] : node(tag), before, after);
  // an event left without anything in it ("1 DEAT Y" says the person died, so it stays)
  const empty = !ev.children.length && !ev.value;
  if (i < 0) return empty ? rec : { ...rec, children: insert(rec.children, ev) };
  return { ...rec, children: empty ? rec.children.filter((_, j) => j !== i)
                                   : rec.children.map((c, j) => (j === i ? ev : c)) };
}

function setName(rec: GedNode, before: PersonFields, after: PersonFields): GedNode {
  if (before.given === after.given && before.surname === after.surname) return rec;
  const given = after.given.trim(), surname = after.surname.trim();
  const i = rec.children.findIndex((c) => c.tag === "NAME");
  const old = i >= 0 ? rec.children[i] : null;
  const suffix = old ? splitName(old.value).suffix : "";
  const value = [given, `/${surname}/`, suffix].filter(Boolean).join(" ");
  let name = old ? { ...old, value } : node("NAME", value);
  if (old && first(old, "GIVN") || given && !old) name = setChild(name, "GIVN", given);
  if (old && first(old, "SURN") || surname && !old) name = setChild(name, "SURN", surname);
  if (!given && !surname && !old) return rec;
  return { ...rec, children: old ? rec.children.map((c, j) => (j === i ? name : c)) : insert(rec.children, name) };
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
    out = { ...out, children: insert(out.children, setDatePlace(node("OCCU", row.value), { date: "", place: "" }, row)) };
  }
  return out;
}

function setNote(rec: GedNode, text: string): GedNode {
  const note = inlineNote(rec);
  const value = text.replace(/\r\n?/g, "\n").trim();
  if (!note) return value ? { ...rec, children: insert(rec.children, node("NOTE", value)) } : rec;
  return { ...rec, children: value ? rec.children.map((c) => (c === note ? { ...c, value } : c))
                                   : rec.children.filter((c) => c !== note) };
}

const tidy = (e: EventFields): EventFields => ({ date: e.date.trim(), place: e.place.trim() });

/**
 * The person's record with the changes from `before` to `after`; the same object
 * when nothing changed. A changed record loses `raw` and is written anew.
 */
export function applyPerson(rec: GedNode, before: PersonFields, after: PersonFields): GedNode {
  let out = setName(rec, before, after);
  if (after.sex !== before.sex) out = setChild(out, "SEX", after.sex);
  for (const key of PERSON_EVENTS) out = setEvent(out, EVENT_TAGS[key], before[key], tidy(after[key]));
  out = setOccupations(out, before.occupations, after.occupations);
  if (after.note.trim() !== before.note.trim()) out = setNote(out, after.note);
  if (out === rec) return rec;
  const { raw: _, ...rest } = out;
  return rest;
}

export function applyFamily(rec: GedNode, before: FamilyFields, after: FamilyFields): GedNode {
  let out = setEvent(rec, "MARR", before.marriage, tidy(after.marriage));
  if (after.divorced !== before.divorced) {
    out = after.divorced ? { ...out, children: insert(out.children, node("DIV", "Y")) }
                         : { ...out, children: out.children.filter((c) => c.tag !== "DIV") };
  }
  if (out === rec) return rec;
  const { raw: _, ...rest } = out;
  return rest;
}

// ------------------------------------------------------------ dates

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const G_DATE = String.raw`(?:@#D[A-Z ]+@\s+)?(?:(?:\d{1,2}\s+)?(?:${MONTHS.join("|")})\s+)?\d{1,4}(?:\/\d{2})?(?:\s+B\.?C\.?)?`;
const G_VALUE = new RegExp(String.raw`^(?:(?:ABT|CAL|EST|BEF|AFT|INT)\s+)?${G_DATE}(?:\s+\(.*\))?$|` +
  String.raw`^BET\s+${G_DATE}\s+AND\s+${G_DATE}$|^FROM\s+${G_DATE}(?:\s+TO\s+${G_DATE})?$|^TO\s+${G_DATE}$|^\(.*\)$`);

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

const QUALIFIED = /^(ABT|CAL|EST|BEF|AFT|BET|FROM|TO|INT) /;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What a person typed into a date field, as a GEDCOM date. Accepts GEDCOM itself
 * ("ABT 1890", "14 MAY 1891"), numbers ("14.5.1891"), ranges ("1890–1895") and the
 * qualifiers of the language ("cca 1890", "pred 1890") or ~ < >. Anything else is
 * kept as a date phrase in parentheses, with `ok` false.
 */
export function parseDate(input: string, lang: Lang): { value: string; ok: boolean } {
  const s = input.trim().replace(/\s+/g, " ");
  if (!s) return { value: "", ok: true };
  const gedcom = (t: string) => {
    const up = t.toUpperCase();
    if (!G_VALUE.test(up)) return null;
    // a date phrase in parentheses keeps its letters as typed
    const i = t.indexOf("(");
    return i < 0 ? up : up.slice(0, i) + t.slice(i);
  };
  const plain = (t: string) => numericDate(t) ?? gedcom(t);
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
  const head = `${level}${n.xref ? " " + n.xref : ""} ${n.tag}`;
  n.value.split("\n").forEach((line, i) => {
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

/** The whole file as UTF-8 GEDCOM text (the header then says CHAR UTF-8). */
export function writeGedcom(records: GedNode[], eol = "\n"): string {
  const lines: string[] = [];
  for (let rec of records) {
    if (rec.tag === "HEAD") {
      const char = first(rec, "CHAR");
      if (char && char.value.toUpperCase() !== "UTF-8") rec = { ...setChild(rec, "CHAR", "UTF-8"), raw: undefined };
    }
    lines.push(...recordLines(rec));
  }
  return lines.join(eol) + eol;
}

/** Line ending of a GEDCOM text, to write it back the same way. */
export const lineEnding = (text: string) => (/\r\n/.test(text) ? "\r\n" : /\r/.test(text) ? "\r" : "\n");
