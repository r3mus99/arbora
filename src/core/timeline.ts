/** The events of one person's life in order: birth, marriages, children born, death, … */

import { dateParts, yearsBetween } from "./date";
import type { EventFields, PersonFields } from "./edit";
import { placeCoords, type Coords } from "./places";
import { childOf, type GedNode, type GedcomData } from "./gedcom";

export type TimelineKind = "birth" | "christening" | "marriage" | "child" | "death" | "burial"
  | "residence" | "event" | "famEvent";

export interface TimelineItem {
  kind: TimelineKind;
  date: string;
  place: string;
  /** the person's age at the event, when both dates tell it */
  age: number | null;
  /** the spouse of a marriage or the child born */
  other: string | null;
  /** a marriage that ended in divorce */
  divorced: boolean;
  /** the family of a marriage or a child, for React keys */
  key: string;
  /** a custom event: its TYPE, or its value when it has no TYPE */
  title?: string;
  /** where the place is on the map, when the file says */
  coords?: Coords;
  /** people named as witnesses of a marriage (_WITN) */
  witnesses?: string[];
  /** the GEDCOM tag of a standard event shown as "event" (BAPM, CENS, …) */
  tag?: string;
  /** age, cause, agency and address written under the event, as small labelled lines */
  details?: EventDetail[];
  /** a residence: the text written on the line itself (an address), when there is one */
  detail?: string;
  /** the GEDCOM line of a residence or custom event, to read its sources and notes from */
  node?: GedNode;
}

export interface EventDetail { key: "age" | "cause" | "agency" | "address"; value: string }

/** Standard events beyond birth, christening, marriage, death and burial, titled by their tag. */
export const EXTRA_EVENT_TAGS = ["BAPM", "BLES", "CREM", "ADOP", "CONF", "FCOM", "ORDN", "CENS", "EMIG", "IMMI",
                                 "NATU", "GRAD", "RETI", "PROB", "WILL"];

/** Lines of a person that are events or facts in their own right, shown on the timeline in file order. */
const OWN_EVENTS: Record<string, "residence" | "event"> = { RESI: "residence", EVEN: "event" };
for (const tag of EXTRA_EVENT_TAGS) OWN_EVENTS[tag] = "event";
export const OWN_EVENT_TAGS: string[] = Object.keys(OWN_EVENTS);

/** Family events shown on the timeline of both spouses besides the marriage itself. */
export const FAMILY_EVENT_TAGS = ["DIV", "ENGA", "MARB", "MARC", "MARL", "MARS", "ANUL"];

const ADDRESS_PARTS = ["ADR1", "ADR2", "ADR3", "CITY", "STAE", "POST", "CTRY"];

/** The age, cause, agency and address written under an event line. */
export function eventDetails(node: GedNode): EventDetail[] {
  const out: EventDetail[] = [];
  const one = (key: EventDetail["key"], tag: string) => {
    const v = childOf(node, tag)?.value.trim();
    if (v) out.push({ key, value: v });
  };
  one("age", "AGE"); one("cause", "CAUS"); one("agency", "AGNC");
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
                 age: kind === "birth" || !date ? null : yearsBetween(birthDate, date) });
  };

  add("birth", fields ? fields.birth : p.birth, "birth");
  if (fields) add("christening", fields.christening, "christening");
  // residences and custom events (EVEN with a TYPE) of the record, as they are written
  record?.children.forEach((node, i) => {
    const tag = node.tag;
    if (!(tag in OWN_EVENTS)) return;
    const e = { date: childOf(node, "DATE")?.value || "", place: childOf(node, "PLAC")?.value || "" };
    const type = childOf(node, "TYPE")?.value || "";
    const value = node.value === "Y" ? "" : node.value;
    const title = tag === "EVEN" ? type || value : "";
    const detail = tag === "RESI" ? value : tag === "EVEN" && type ? value : "";
    const details = eventDetails(node);
    const noted = !!(childOf(node, "SOUR") || childOf(node, "NOTE"));
    if (!e.date && !e.place && !title && !detail && !details.length && !noted && !EXTRA_EVENT_TAGS.includes(tag)) return;
    add(OWN_EVENTS[tag], e, `${tag}${i}`, null, false, true);
    const item = items[items.length - 1];
    if (title) item.title = title;
    if (detail) item.detail = detail;
    if (details.length) item.details = details;
    const at = placeCoords(node, family);
    if (at) item.coords = at;
    if (EXTRA_EVENT_TAGS.includes(tag)) item.tag = tag;
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
      const details = marrNode ? eventDetails(marrNode) : [];
      if (details.length) marr.details = details;
      const marrAt = marrNode && placeCoords(marrNode, family);
      if (marrAt) marr.coords = marrAt;
      const witnesses = famRec.children.filter((c) => c.tag === "_WITN" && c.value in data.people).map((c) => c.value);
      if (witnesses.length) marr.witnesses = witnesses;
      famRec.children.forEach((node, i) => {
        const isEven = node.tag === "EVEN";
        if (!isEven && !FAMILY_EVENT_TAGS.includes(node.tag)) return;
        const e = { date: childOf(node, "DATE")?.value || "", place: childOf(node, "PLAC")?.value || "" };
        const title = isEven ? childOf(node, "TYPE")?.value || (node.value === "Y" ? "" : node.value) : "";
        const det = eventDetails(node);
        const noted = !!(childOf(node, "SOUR") || childOf(node, "NOTE"));
        // a plain "DIV Y" is already told by the marriage row; an empty EVEN says nothing
        if (!e.date && !e.place && !title && !det.length && !noted) return;
        add("famEvent", e, `${fid}${node.tag}${i}`, other, false, true);
        const item = items[items.length - 1];
        if (isEven) item.title = title; else item.tag = node.tag;
        if (det.length) item.details = det;
        const at = placeCoords(node, family);
        if (at) item.coords = at;
        item.node = node;
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
      const details = node ? eventDetails(node) : [];
      if (details.length) item.details = details;
      const at = node && placeCoords(node, family);
      if (at) item.coords = at;
    }
  }

  // Undated marriages and children take the place of the event before them; an undated birth
  // or christening goes first, an undated death, residence or custom event after every dated event except the burial,
  // and an undated burial last.
  const dated = items.map((item) => sortKey(item.date));
  const latest = Math.max(-Infinity, ...dated.filter((k, i): k is number => k !== null && items[i].kind !== "burial"));
  let last = -Infinity;
  const ranked = items.map((item, i) => {
    let k = dated[i];
    if (k !== null) last = k;
    else if (item.kind === "birth" || item.kind === "christening") k = -Infinity;
    else if (item.kind === "death" || item.kind === "residence" || item.kind === "event") k = latest;
    else if (item.kind === "burial") k = Infinity;
    else k = last;
    return { item, k, i };
  });
  return ranked.sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.item);
}
