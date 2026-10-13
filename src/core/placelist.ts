/** The places of a file at a glance: each place once, with its events and the people connected to it. */

import { childOf, type GedNode } from "./gedcom";
import { townOf } from "./variants";

export interface PlaceEntry {
  /** the place without house numbers: "Lieskovice, Senica" for "Lieskovice 22, Senica" */
  name: string;
  /** how many events (and other lines with a place) name it */
  events: number;
  /** ids of the people connected to it: a family's place counts for both spouses */
  people: string[];
  /** the house numbers written after the town, with the people living there */
  houses: Map<string, string[]>;
}

/** "Lieskovice 22, Senica" → "Lieskovice, Senica": the place as one entry, whatever the house number. */
export function placeName(place: string): string {
  const town = townOf(place);
  const tail = place.slice(place.indexOf(town) + town.length).replace(/^\s*\d*\s*/, "");
  return (town + tail).trim();
}

/** The house number after the town of a place, or "". */
const houseOf = (place: string) => /^\s*\d+/.exec(place.slice(place.indexOf(townOf(place)) + townOf(place).length))?.[0].trim() ?? "";

/** Every place of the people and families, grouped by town (without house number), most used first. */
export function placeOverview(records: GedNode[]): PlaceEntry[] {
  const out = new Map<string, { name: string; events: number; who: Set<string>; houses: Map<string, Set<string>> }>();
  const walk = (node: GedNode, owners: string[]) => {
    for (const c of node.children) {
      const place = c.tag === "PLAC" ? c.value.trim() : "";
      if (place) {
        const name = placeName(place);
        const e = out.get(name) ?? { name, events: 0, who: new Set<string>(), houses: new Map<string, Set<string>>() };
        e.events++;
        owners.forEach((o) => e.who.add(o));
        const house = houseOf(place);
        if (house) {
          const h = e.houses.get(house) ?? new Set<string>();
          owners.forEach((o) => h.add(o));
          e.houses.set(house, h);
        }
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
    .map((e) => ({ name: e.name, events: e.events, people: [...e.who],
      houses: new Map([...e.houses].map(([k, v]) => [k, [...v]] as [string, string[]])) }))
    .sort((a, b) => b.people.length - a.people.length || b.events - a.events || a.name.localeCompare(b.name));
}
