/**
 * Renaming existing sources the way the app names a new one (see `sourceTitle`): the event, then the people
 * ("Birth Jan Novak", "Wedding Jan Novak & Eva Novak"). Only a source cited exactly once can be named after an event.
 */

import { addLine } from "./edit";
import { childOf, gedNode, rewritten, type GedNode } from "./gedcom";
import { sourceTitle, type SourceTitleEvent } from "./sources";

/** one source that can be renamed */
export interface SourceRename {
  xref: string;
  from: string;
  to: string;
  /** cited on the person itself, not under an event: the generated name is only "Person <name>", often worse than the old one */
  weak: boolean;
}

const PERSON_EVENT: Record<string, SourceTitleEvent> = { BIRT: "birth", CHR: "christening", DEAT: "death", BURI: "burial" };
const FAMILY_EVENT: Record<string, SourceTitleEvent> = { MARR: "marriage", DIV: "divorce" };

/** where a source is cited: the event word and the people it is about */
interface Place { event: SourceTitleEvent; people: string[] }

/**
 * The sources of the file with a new name: every source record cited exactly once, directly on a person or under their birth,
 * christening, death or burial, or under a marriage or divorce of a family, whose generated name differs from its title.
 * Names that would repeat another source's title get " (2)", " (3)" … so titles stay unique.
 */
export function sourceRenames(records: GedNode[], lang: string, nameOf: (id: string) => string): SourceRename[] {
  const cites = new Map<string, { n: number; place: Place | null }>();
  const walk = (node: GedNode, place: (tag: string) => Place | null, parent: string) => {
    for (const c of node.children) {
      if (c.tag === "SOUR" && /^@[^@]+@$/.test(c.value)) {
        const e = cites.get(c.value) ?? { n: 0, place: null };
        e.n++;
        e.place = place(parent);
        cites.set(c.value, e);
      }
      walk(c, place, c.tag);
    }
  };
  for (const r of records) {
    if (r.tag === "INDI" && r.xref) {
      const id = r.xref;
      walk(r, (p) => (p === "INDI" ? { event: "person", people: [id] } : PERSON_EVENT[p] ? { event: PERSON_EVENT[p], people: [id] } : null), "INDI");
    } else if (r.tag === "FAM") {
      const spouses = ["HUSB", "WIFE"].map((t) => childOf(r, t)?.value ?? "").filter(Boolean);
      walk(r, (p) => (FAMILY_EVENT[p] ? { event: FAMILY_EVENT[p], people: spouses } : null), "FAM");
    } else walk(r, () => null, r.tag);
  }
  const titleOf = (r: GedNode) => childOf(r, "TITL")?.value.trim() ?? "";
  const sources = records.filter((r) => r.tag === "SOUR" && r.xref);
  const renames: SourceRename[] = [];
  const used = new Set<string>();
  const wanted = new Map<string, string>();
  for (const s of sources) {
    const e = cites.get(s.xref!);
    const place = e && e.n === 1 ? e.place : null;
    const to = place && sourceTitle(lang, place.event, ...place.people.map(nameOf));
    // no names at all ("Birth") is not a title worth writing
    if (place && to && place.people.some((id) => nameOf(id).trim()) && to !== titleOf(s)) wanted.set(s.xref!, to);
    else used.add(titleOf(s));
  }
  for (const s of sources) {
    const base = wanted.get(s.xref!);
    if (!base) continue;
    let to = base, k = 1;
    while (used.has(to)) to = `${base} (${++k})`;
    used.add(to);
    renames.push({ xref: s.xref!, from: titleOf(s), to, weak: cites.get(s.xref!)!.place!.event === "person" });
  }
  return renames;
}

/** The records with the sources renamed: only the title line changes, and the old title is kept as a note of the source. */
export function applySourceRenames(records: GedNode[], renames: SourceRename[]): GedNode[] {
  const by = new Map(renames.map((r) => [r.xref, r]));
  if (!by.size) return records;
  return records.map((rec) => {
    const r = rec.xref && rec.tag === "SOUR" ? by.get(rec.xref) : undefined;
    if (!r) return rec;
    const has = rec.children.some((c) => c.tag === "TITL");
    const renamed = has ? rewritten(rec, rec.children.map((c) => (c.tag === "TITL" ? { ...gedNode("TITL", r.to) } : c))) : addLine(rec, "TITL", r.to);
    return r.from ? addLine(renamed, "NOTE", `Original title: ${r.from}`) : renamed;
  });
}
