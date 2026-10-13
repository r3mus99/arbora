/** The places of a file at a glance: each place once, with its events and the people connected to it. */

import { childOf, type GedNode } from "./gedcom";

export interface PlaceEntry {
  /** the place as written; a village with another house number is another place */
  name: string;
  /** how many events (and other lines with a place) name it */
  events: number;
  /** ids of the people connected to it: a family's place counts for both spouses */
  people: string[];
}

/** The place with its spaces tidied: "Dolná  22 , Okres" and "Dolná 22, Okres" are one place. */
export const placeName = (place: string) => place.trim().replace(/\s+/g, " ").replace(/ ,/g, ",");

/** Every place of the people and families, village and house number together, most used first. */
export function placeOverview(records: GedNode[]): PlaceEntry[] {
  const out = new Map<string, { name: string; events: number; who: Set<string> }>();
  const walk = (node: GedNode, owners: string[]) => {
    for (const c of node.children) {
      const name = c.tag === "PLAC" ? placeName(c.value) : "";
      if (name) {
        const e = out.get(name) ?? { name, events: 0, who: new Set<string>() };
        e.events++;
        owners.forEach((o) => e.who.add(o));
        out.set(name, e);
      }
      walk(c, owners);
    }
  };
  for (const r of records) {
    if (r.tag === "INDI" && r.xref) walk(r, [r.xref]);
    else if (r.tag === "FAM") walk(r, [childOf(r, "HUSB")?.value, childOf(r, "WIFE")?.value].filter((x): x is string => !!x));
  }
  return [...out.values()]
    .map((e) => ({ name: e.name, events: e.events, people: [...e.who] }))
    .sort((a, b) => b.people.length - a.people.length || b.events - a.events || a.name.localeCompare(b.name));
}
