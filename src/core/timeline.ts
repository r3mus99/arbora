/** The events of one person's life in order: birth, marriages, children born, death, … */

import { dateParts, yearsBetween } from "./date";
import type { EventFields, PersonFields } from "./edit";
import type { GedcomData } from "./gedcom";

export type TimelineKind = "birth" | "christening" | "marriage" | "child" | "death" | "burial";

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
export function timeline(data: GedcomData, id: string, fields: PersonFields | null): TimelineItem[] {
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
  for (const fid of p.fams) {
    const fam = data.families[fid];
    if (!fam) continue;
    const spouse = fam.husb === id ? fam.wife : fam.husb;
    add("marriage", fam.marriage, fid, spouse && spouse in data.people ? spouse : null, fam.divorced, true);
    for (const c of fam.children) {
      if (c in data.people) add("child", data.people[c].birth, `${fid}${c}`, c, false, true);
    }
  }
  const deceased = fields ? fields.deceased : !!p.death;
  add("death", fields ? fields.death : p.death, "death", null, false, deceased);
  if (fields) add("burial", fields.burial, "burial");

  // Undated marriages and children take the place of the event before them; an undated birth
  // or christening goes first, an undated death after every dated event except the burial,
  // and an undated burial last.
  const dated = items.map((item) => sortKey(item.date));
  const latest = Math.max(-Infinity, ...dated.filter((k, i): k is number => k !== null && items[i].kind !== "burial"));
  let last = -Infinity;
  const ranked = items.map((item, i) => {
    let k = dated[i];
    if (k !== null) last = k;
    else if (item.kind === "birth" || item.kind === "christening") k = -Infinity;
    else if (item.kind === "death") k = latest;
    else if (item.kind === "burial") k = Infinity;
    else k = last;
    return { item, k, i };
  });
  return ranked.sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.item);
}
