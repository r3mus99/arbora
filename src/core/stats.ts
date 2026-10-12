/** File overview: counts and the most common surnames and places. */
import { yearOf } from "./date";
import { mainName, type GedcomData, type GedNode, type Person } from "./gedcom";

export interface Count { value: string; count: number }

export interface Overview {
  people: number;
  men: number;
  women: number;
  families: number;
  /** people in the longest line from a parent to a child to a grandchild… */
  generations: number;
  /** earliest and latest year of a birth or death, null when no date has a year */
  firstYear: number | null;
  lastYear: number | null;
  /** person born (or christened) first, with that year */
  oldest: { id: string; year: number } | null;
  surnames: Count[];
  /** towns: the first part of a place */
  places: Count[];
}

const first = (node: GedNode, tag: string) => node.children.find((c) => c.tag === tag) || null;
const ROMAN = /^[IVXLCDM]+\.?$/;

/**
 * Surname from a NAME value: the part between slashes, else SURN, else the last word of a name
 * of two or more words (not a regnal number like "I." or a word in lower case like "von").
 */
export function surnameOf(name: GedNode): string {
  const m = /\/([^/]*)\//.exec(name.value);
  if (m) return m[1].trim();
  const surn = first(name, "SURN")?.value.trim();
  if (surn) return surn;
  const words = name.value.trim().split(/\s+/);
  const last = words[words.length - 1] || "";
  if (words.length < 2 || ROMAN.test(last) || last.endsWith(".") || last.toLowerCase() === last) return "";
  return last;
}

/** Most common values, ties in alphabetical order. */
function top(counts: Map<string, number>, n: number): Count[] {
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).slice(0, n);
}
const add = (m: Map<string, number>, key: string) => { if (key) m.set(key, (m.get(key) || 0) + 1); };

/** Overview of a loaded file; `n` is the length of the surname and place lists. */
export function overview(records: GedNode[], data: GedcomData, n = 6): Overview {
  const people = Object.values(data.people);
  const surnames = new Map<string, number>(), places = new Map<string, number>();
  for (const rec of records) {
    if (rec.tag !== "INDI") continue;
    const name = mainName(rec);
    if (name) add(surnames, surnameOf(name));
    // each town once per person, so a long-lived local family does not count for every event
    const towns = new Set<string>();
    const walk = (node: GedNode) => {
      if (node.tag === "PLAC") towns.add(node.value.split(",")[0].trim());
      node.children.forEach(walk);
    };
    rec.children.forEach(walk);
    towns.forEach((t) => add(places, t));
  }

  let firstYear: number | null = null, lastYear: number | null = null;
  let oldest: Overview["oldest"] = null;
  for (const p of people) {
    const born = yearOf(p.birth?.date), died = yearOf(p.death?.date);
    for (const y of [born, died]) {
      if (y === null) continue;
      if (firstYear === null || y < firstYear) firstYear = y;
      if (lastYear === null || y > lastYear) lastYear = y;
    }
    if (born !== null && (!oldest || born < oldest.year)) oldest = { id: p.id, year: born };
  }

  return {
    people: people.length,
    men: people.filter((p) => p.sex === "M").length,
    women: people.filter((p) => p.sex === "F").length,
    families: Object.keys(data.families).length,
    generations: generations(data),
    firstYear, lastYear, oldest,
    surnames: top(surnames, n), places: top(places, n),
  };
}

/** Length of the longest parent–child line; a loop in the links does not count twice. */
function generations(data: GedcomData): number {
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const down = (p: Person): number => {
    const known = depth.get(p.id);
    if (known !== undefined) return known;
    if (visiting.has(p.id)) return 0;
    visiting.add(p.id);
    let best = 0;
    for (const f of p.fams) {
      for (const c of data.families[f]?.children || []) {
        const child = data.people[c];
        if (child) best = Math.max(best, down(child));
      }
    }
    visiting.delete(p.id);
    depth.set(p.id, best + 1);
    return best + 1;
  };
  let most = 0;
  // only people without parents start a line; everyone else is counted from above
  for (const p of Object.values(data.people)) {
    if (!p.famc.some((f) => data.families[f])) most = Math.max(most, down(p));
  }
  return most;
}
