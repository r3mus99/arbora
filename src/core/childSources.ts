/**
 * Sources written under a parent that are really about an event of a child: a church book entry
 * ("Entry for Anna and Peter, 11 May 1753") cited on the father only, while the child's christening has no source.
 */

import { monthOf } from "./date";
import { addChild } from "./edit";
import { childOf, childrenOf, gedNode, rewritten, type GedNode } from "./gedcom";

/** One suggestion: cite the source of `parent` also under the `event` of `child` (and on the other parent). */
export interface ChildSource {
  parent: string;
  child: string;
  /** the other parent of that family, when there is one */
  spouse: string | null;
  /** the source record */
  source: string;
  title: string;
  /** CHR, or BIRT when the child has no christening */
  event: "CHR" | "BIRT";
  /** the date of the child's event, as written */
  date: string;
}

const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 864e5;

/** A full day written in the GEDCOM way ("11 MAY 1753"), as a day number; null for anything vaguer. */
function gedcomDay(value: string): number | null {
  const m = /^(\d{1,2}) ([A-Za-z]{3}) (\d{3,4})$/.exec(value.trim());
  const month = m ? monthOf(m[2]) : 0;
  return m && month ? day(+m[3], month, +m[1]) : null;
}

/** The day a church-book style source is about: "Entry for … 11 May 1753" in the title, publication, page or text. */
export function entryDay(texts: string[]): number | null {
  for (const text of texts) {
    const m = /Entry for[^]*?\b(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})\b/i.exec(text);
    const month = m ? monthOf(m[2]) : 0;
    if (m && month) return day(+m[3], month, +m[1]);
  }
  return null;
}

const isLink = (v: string) => /^@[^@]+@$/.test(v);
const EVENTS = ["BIRT", "CHR", "DEAT", "BURI"];

/** the cited source of the lines (person level or under any event) */
const citesSource = (rec: GedNode, xref: string, deep = true): boolean =>
  rec.children.some((c) => (c.tag === "SOUR" && c.value === xref) || (deep && EVENTS.includes(c.tag) && citesSource(c, xref, false)));

export function childSources(records: GedNode[]): ChildSource[] {
  const byId = new Map(records.filter((r) => r.xref).map((r) => [r.xref!, r]));
  const out: ChildSource[] = [];
  for (const p of records) {
    if (p.tag !== "INDI" || !p.xref) continue;
    const cites = childrenOf(p, "SOUR").filter((c) => isLink(c.value) && byId.get(c.value)?.tag === "SOUR");
    if (!cites.length) continue;
    const kids: { id: string; spouse: string | null }[] = [];
    for (const f of childrenOf(p, "FAMS").map((c) => byId.get(c.value)).filter((f): f is GedNode => f?.tag === "FAM")) {
      const spouse = ["HUSB", "WIFE"].map((t) => childOf(f, t)?.value ?? "").find((v) => v && v !== p.xref) || null;
      for (const c of childrenOf(f, "CHIL")) if (byId.get(c.value)?.tag === "INDI") kids.push({ id: c.value, spouse });
    }
    if (!kids.length) continue;
    const own = EVENTS.map((t) => childOf(p, t)).map((e) => (e && childOf(e, "DATE") ? gedcomDay(childOf(e, "DATE")!.value) : null));
    for (const cite of cites) {
      const rec = byId.get(cite.value)!;
      const texts = [...["TITL", "PUBL", "ABBR"].map((t) => childOf(rec, t)?.value ?? ""), childOf(cite, "PAGE")?.value ?? "",
                     childOf(childOf(cite, "DATA") ?? gedNode("DATA"), "TEXT")?.value ?? ""];
      const sd = entryDay(texts);
      // a source about the parent's own birth, death, … stays where it is
      if (sd === null || own.some((o) => o !== null && Math.abs(o - sd) <= 1)) continue;
      const hits: ChildSource[] = [];
      for (const k of kids) {
        const kid = byId.get(k.id)!;
        const at = (tag: string) => { const e = childOf(kid, tag), d = e && childOf(e, "DATE"); const n = d ? gedcomDay(d.value) : null; return n !== null && Math.abs(n - sd) <= 1 ? d!.value.trim() : null; };
        // the christening comes first; the birth when there is no christening line or it does not fit
        const date = at("CHR") ?? at("BIRT");
        const event = at("CHR") ? "CHR" : "BIRT";
        if (date && !citesSource(kid, cite.value)) {
          hits.push({ parent: p.xref, child: k.id, spouse: k.spouse, source: cite.value, event, date,
                      title: childOf(rec, "TITL")?.value.trim() || childOf(rec, "ABBR")?.value.trim() || cite.value });
        }
      }
      // two children at the same time (twins): no guess
      if (hits.length === 1) out.push(hits[0]);
    }
  }
  return out;
}

/** The records with the suggestion done: the citation also under the child's event, and on the other parent. Null when it cannot be done. */
export function applyChildSource(records: GedNode[], s: ChildSource): GedNode[] | null {
  const parent = records.find((r) => r.xref === s.parent), kid = records.find((r) => r.xref === s.child);
  const cite = parent && childrenOf(parent, "SOUR").find((c) => c.value === s.source);
  if (!parent || !kid || !cite) return null;
  const event = childOf(kid, s.event);
  if (!event || citesSource(kid, s.source)) return null;
  // the same line with its PAGE, NOTE and so on, written anew
  const copy = (): GedNode => gedNode("SOUR", s.source, cite.children);
  return records.map((r) => {
    if (r === kid) return rewritten(r, r.children.map((c) => (c === event ? addChild(c, copy()) : c)));
    if (s.spouse && r.xref === s.spouse && !childrenOf(r, "SOUR").some((c) => c.value === s.source)) {
      // like most programs: after the other lines of the person, before the change date
      const at = r.children.findIndex((c) => c.tag === "CHAN" || c.tag === "RIN");
      const i = at < 0 ? r.children.length : at;
      return rewritten(r, [...r.children.slice(0, i), copy(), ...r.children.slice(i)]);
    }
    return r;
  });
}
