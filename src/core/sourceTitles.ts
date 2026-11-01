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

/** where a source is cited: the event word, the people it is about and the year of the event */
interface Place { event: SourceTitleEvent; people: string[]; year: string | null }

/** the year written in the date of an event ("1 JAN 1753", "ABT 1753", "1753"), or null */
export function yearOfDate(date: string | undefined): string | null {
  const m = /(?:^|\s)(\d{4})\s*$/.exec((date ?? "").trim());
  return m ? m[1] : null;
}

/**
 * The name a renamed source gets: the generated title and, in brackets, the year of the event it is cited under
 * ("Krst Zuzana Sedláková (1753)"). Without a year the title is kept as it is.
 */
export const withYear = (title: string, year: string | null): string => (year ? `${title} (${year})` : title);

/**
 * The sources of the file with a new name: every source record cited exactly once, directly on a person or under their birth,
 * christening, death or burial, or under a marriage or divorce of a family, whose generated name differs from its title.
 * The name gets the year of that event in brackets, always. Two sources that would get the same name get ", 2", ", 3" … after the year.
 */
export function sourceRenames(records: GedNode[], lang: string, nameOf: (id: string) => string): SourceRename[] {
  const cites = new Map<string, { n: number; place: Place | null }>();
  const walk = (node: GedNode, place: (tag: string, node: GedNode) => Place | null, parent: string, owner: GedNode) => {
    for (const c of node.children) {
      if (c.tag === "SOUR" && /^@[^@]+@$/.test(c.value)) {
        const e = cites.get(c.value) ?? { n: 0, place: null };
        e.n++;
        e.place = place(parent, owner);
        cites.set(c.value, e);
      }
      walk(c, place, c.tag, c);
    }
  };
  const dateOf = (rec: GedNode) => {
    const d = childOf(rec, "DATE");
    return d?.value;
  };
  for (const r of records) {
    if (r.tag === "INDI" && r.xref) {
      const id = r.xref;
      walk(r, (p, owner) => {
        const ev = PERSON_EVENT[p];
        if (p === "INDI") return { event: "person", people: [id], year: null };
        return ev ? { event: ev, people: [id], year: yearOfDate(dateOf(owner)) } : null;
      }, "INDI", r);
    } else if (r.tag === "FAM") {
      const spouses = ["HUSB", "WIFE"].map((t) => childOf(r, t)?.value ?? "").filter(Boolean);
      walk(r, (p, owner) => (FAMILY_EVENT[p] ? { event: FAMILY_EVENT[p], people: spouses, year: yearOfDate(dateOf(owner)) } : null), "FAM", r);
    } else walk(r, () => null, r.tag, r);
  }
  const titleOf = (r: GedNode) => childOf(r, "TITL")?.value.trim() ?? "";
  const sources = records.filter((r) => r.tag === "SOUR" && r.xref);
  const renames: SourceRename[] = [];
  const used = new Set<string>();
  const wanted = new Map<string, { base: string; year: string | null }>();
  for (const s of sources) {
    const e = cites.get(s.xref!);
    const place = e && e.n === 1 ? e.place : null;
    const base = place && sourceTitle(lang, place.event, ...place.people.map(nameOf));
    // no names at all ("Birth") is not a title worth writing
    if (place && base && place.people.some((id) => nameOf(id).trim()) && withYear(base, place.year) !== titleOf(s)) wanted.set(s.xref!, { base, year: place.year });
    else used.add(titleOf(s));
  }
  for (const s of sources) {
    const w = wanted.get(s.xref!);
    if (!w) continue;
    let to = withYear(w.base, w.year), k = 1;
    while (used.has(to)) {
      k++;
      to = w.year ? `${w.base} (${w.year}, ${k})` : `${w.base} (${k})`;
    }
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
    // the old title stays as a note, once: a source renamed twice keeps the first one
    const note = `Original title: ${r.from}`;
    return r.from && !rec.children.some((c) => c.tag === "NOTE" && c.value === note) ? addLine(renamed, "NOTE", note) : renamed;
  });
}
