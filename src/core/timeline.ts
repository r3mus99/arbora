/** The events of one person's life in order: birth, marriages, children born, death, … */

import { ageBetween, dateParts, yearsBetween, type Age } from "./date";
import { eventNoteText, type EventFields, type PersonFields } from "./edit";
import { childOf, type GedNode, type GedcomData } from "./gedcom";

export type TimelineKind = "birth" | "christening" | "marriage" | "child" | "death" | "burial"
  | "residence" | "famEvent";

export interface TimelineItem {
  kind: TimelineKind;
  date: string;
  place: string;
  /** the person's age at the event (years, months when under a year, days when under a month), when both dates tell it */
  age: Age | null;
  /** the spouse of a marriage or the child born */
  other: string | null;
  /** a marriage that ended in divorce */
  divorced: boolean;
  /** the family of a marriage or a child, for React keys */
  key: string;
  /** the GEDCOM tag of a family event (DIV) */
  tag?: string;
  /** the cause (death) and address (residence) written under the event, as small labelled lines */
  details?: EventDetail[];
  /** the text note written under the event line (not a pointer to a NOTE record) */
  note?: string;
  /** a residence: the text written on the line itself (an address), when there is one */
  detail?: string;
  /** the GEDCOM line of a residence or family event, to read its sources and notes from */
  node?: GedNode;
  /** a family event (divorce, custom): the xref of the family record whose line `node` is */
  family?: string;
}

/** Given name and whole-year age on the wedding day of each person whose birth and the wedding date tell it. */
export function weddingAges(wedding: string | undefined, people: { name: string; born: string }[]): { name: string; age: number }[] {
  if (!wedding) return [];
  return people.map((x) => ({ name: x.name, age: yearsBetween(x.born, wedding) }))
    .filter((x): x is { name: string; age: number } => x.age !== null && !!x.name);
}

export interface EventDetail { key: "cause" | "address"; value: string }

/** Lines of a person shown on the timeline in file order besides the life events: residences only. */
export const OWN_EVENT_TAGS: string[] = ["RESI"];

/** Family events shown on the timeline of both spouses besides the marriage itself: the divorce. */
export const FAMILY_EVENT_TAGS = ["DIV"];

const ADDRESS_PARTS = ["ADR1", "ADR2", "ADR3", "CITY", "STAE", "POST", "CTRY"];

/** The cause (when `withCause`) and the address written under an event line. */
export function eventDetails(node: GedNode, withCause = false): EventDetail[] {
  const out: EventDetail[] = [];
  const cause = withCause ? childOf(node, "CAUS")?.value.trim() : "";
  if (cause) out.push({ key: "cause", value: cause });
  const addr = childOf(node, "ADDR");
  const parts = [addr?.value || "", ...ADDRESS_PARTS.map((t) => (addr && childOf(addr, t)?.value) || "")]
    .map((v) => v.replace(/\s*\n\s*/g, ", ").trim()).filter(Boolean);
  if (parts.length) out.push({ key: "address", value: parts.join(", ") });
  return out;
}

const sortKey = (date: string) => {
  const p = dateParts(date);
  return p ? p.y * 10000 + p.m * 100 + p.d : null;
};

/**
 * The life of person `id` as a timeline. `fields` (the edit form's view of the record) adds
 * christening and burial and tells whether the person died without a known date.
 * Dated events go in date order; an undated one stays after the event it follows in the
 * natural order (birth, christening, each marriage with its children, death, burial).
 */
export function timeline(data: GedcomData, id: string, fields: PersonFields | null,
                         record?: GedNode, family?: (xref: string) => GedNode | undefined): TimelineItem[] {
  const p = data.people[id];
  if (!p) return [];
  const birthDate = fields ? fields.birth.date : p.birth?.date || "";
  const items: TimelineItem[] = [];
  const add = (kind: TimelineKind, e: EventFields | null | undefined, key: string,
               other: string | null = null, divorced = false, always = false) => {
    if (!always && !(e && (e.date || e.place))) return;
    const date = e?.date || "";
    items.push({ kind, date, place: e?.place || "", key, other, divorced,
                 age: kind === "birth" || !date ? null : ageBetween(birthDate, date) });
  };

  add("birth", fields ? fields.birth : p.birth, "birth");
  if (fields) add("christening", fields.christening, "christening");
  // residences of the record, as they are written
  record?.children.forEach((node, i) => {
    if (node.tag !== "RESI") return;
    const e = { date: childOf(node, "DATE")?.value || "", place: childOf(node, "PLAC")?.value || "" };
    const detail = node.value === "Y" ? "" : node.value;
    const details = eventDetails(node);
    const note = eventNoteText(node);
    const noted = !!(childOf(node, "SOUR") || childOf(node, "NOTE"));
    if (!e.date && !e.place && !detail && !details.length && !noted) return;
    add("residence", e, `RESI${i}`, null, false, true);
    const item = items[items.length - 1];
    if (detail) item.detail = detail;
    if (details.length) item.details = details;
    if (note) item.note = note;
    item.node = node;
  });
  for (const fid of p.fams) {
    const fam = data.families[fid];
    if (!fam) continue;
    const spouse = fam.husb === id ? fam.wife : fam.husb;
    const other = spouse && spouse in data.people ? spouse : null;
    add("marriage", fam.marriage, fid, other, fam.divorced, true);
    const famRec = family?.(fid);
    if (famRec) {
      const marr = items[items.length - 1];
      const marrNode = childOf(famRec, "MARR");
      const marrNote = marrNode ? eventNoteText(marrNode) : "";
      if (marrNote) marr.note = marrNote;
      famRec.children.forEach((node, i) => {
        if (!FAMILY_EVENT_TAGS.includes(node.tag)) return;
        const e = { date: childOf(node, "DATE")?.value || "", place: childOf(node, "PLAC")?.value || "" };
        const noted = !!childOf(node, "SOUR");
        // a plain "DIV Y" is already told by the marriage row
        if (!e.date && !e.place && !noted) return;
        add("famEvent", e, `${fid}${node.tag}${i}`, other, false, true);
        const item = items[items.length - 1];
        item.tag = node.tag;
        item.node = node;
        item.family = fid;
      });
    }
    for (const c of fam.children) {
      if (c in data.people) add("child", data.people[c].birth, `${fid}${c}`, c, false, true);
    }
  }
  const deceased = fields ? fields.deceased : !!p.death;
  add("death", fields ? fields.death : p.death, "death", null, false, deceased);
  if (fields) add("burial", fields.burial, "burial");

  if (record) {
    const tags: Partial<Record<TimelineKind, string>> = { birth: "BIRT", christening: "CHR", death: "DEAT", burial: "BURI" };
    for (const item of items) {
      const node = tags[item.kind] && childOf(record, tags[item.kind]!);
      // the birth, christening and burial show their address; the death also its cause; the birth and the death their note
      const details = node ? eventDetails(node, item.kind === "death") : [];
      if (details.length) item.details = details;
      const note = (item.kind === "birth" || item.kind === "death") && node ? eventNoteText(node) : "";
      if (note) item.note = note;
    }
  }

  // Undated marriages and children take the place of the event before them; an undated birth
  // or christening goes first, an undated death, residence after every dated event except the burial,
  // and an undated burial last.
  const dated = items.map((item) => sortKey(item.date));
  const latest = Math.max(-Infinity, ...dated.filter((k, i): k is number => k !== null && items[i].kind !== "burial"));
  let last = -Infinity;
  const ranked = items.map((item, i) => {
    let k = dated[i];
    if (k !== null) last = k;
    else if (item.kind === "birth" || item.kind === "christening") k = -Infinity;
    else if (item.kind === "death" || item.kind === "residence") k = latest;
    else if (item.kind === "burial") k = Infinity;
    else k = last;
    return { item, k, i };
  });
  return ranked.sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.item);
}
