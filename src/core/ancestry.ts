/** The ancestors of the home person: how many generations away each one is and the line from them down to the home person. */

import type { GedcomData, Person } from "./gedcom";

export interface Ancestry {
  /** ancestor -> generations above the home person (1 = parent) */
  generations: Map<string, number>;
  /** ancestor (and the home person) -> the line [ancestor, ..., home person] */
  paths: Map<string, string[]>;
}

/** Breadth first over the birth parents, so every ancestor gets the shortest line; the first one found wins a tie. */
export function ancestry(data: GedcomData, homeId: string | null): Ancestry {
  const generations = new Map<string, number>();
  const paths = new Map<string, string[]>();
  if (!homeId) return { generations, paths };
  const queue: [string, number][] = [[homeId, 0]];
  const seen = new Set([homeId]);
  paths.set(homeId, [homeId]);
  for (let i = 0; i < queue.length; i++) {
    const [personId, generation] = queue[i];
    for (const familyId of data.people[personId]?.famc || []) {
      const family = data.families[familyId];
      for (const parent of [family?.husb, family?.wife]) {
        if (!parent || seen.has(parent) || !data.people[parent]) continue;
        seen.add(parent);
        generations.set(parent, generation + 1);
        paths.set(parent, [parent, ...(paths.get(personId) || [personId])]);
        queue.push([parent, generation + 1]);
      }
    }
  }
  return { generations, paths };
}

const TITLES = /^(archduke|archduchess|prince|princess|king|queen|emperor|empress|duke|duchess|count|countess|baron|baroness)\s+/i;

/** A short name for a crumb: no titles, no "of ..." and nothing after a comma ("Archduke Franz Karl of Austria" -> "Franz Karl"). */
export function shortName(p: Person | undefined): string {
  const full = (p?.given || p?.name || "").trim();
  const short = full.split(",")[0].split(/\s+of\s+/i)[0].replace(TITLES, "").trim();
  return short || full || "?";
}
