/** Sources (SOUR) and notes (NOTE) attached to a record or an event, resolved to readable text. */

import { childOf, childrenOf, type GedNode } from "./gedcom";
import { OWN_EVENT_TAGS } from "./timeline";

/** a source citation with what the cited source record says about itself */
export interface Citation {
  title: string;
  author: string;
  publication: string;
  repository: string;
  /** PAGE: where in the source */
  page: string;
  /** DATA/TEXT: the quoted text */
  text: string;
  notes: string[];
}

export interface Annotations {
  sources: Citation[];
  notes: string[];
}

/** the record behind an `@X1@` pointer */
export type Lookup = (xref: string) => GedNode | undefined;

/** Lookup over parsed level-0 records. */
export function lookupOf(records: GedNode[]): Lookup {
  const byXref = new Map(records.filter((r) => r.xref).map((r) => [r.xref!, r]));
  return (xref) => byXref.get(xref);
}

/** Text without the simple HTML some programs put into sources (<i>…</i>, <br>). */
export const plainText = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?(?:i|b|u|em|strong|p|span)\b[^>]*>/gi, "");

const isLink = (value: string) => /^@[^@]+@$/.test(value);
/** the text of a NOTE line: its own value, or the value of the NOTE record it points to */
const textOf = (n: GedNode, lookup: Lookup) => plainText(isLink(n.value) ? lookup(n.value)?.value ?? "" : n.value).trim();

function notesOf(node: GedNode, lookup: Lookup): string[] {
  return childrenOf(node, "NOTE").map((n) => textOf(n, lookup)).filter(Boolean);
}

const valueOf = (node: GedNode | null, tag: string) => plainText((node && childOf(node, tag)?.value.trim()) || "");

function citation(cite: GedNode, lookup: Lookup): Citation {
  const rec = isLink(cite.value) ? lookup(cite.value) : undefined;
  const repo = rec && childOf(rec, "REPO");
  const repoRec = repo && isLink(repo.value) ? lookup(repo.value) : undefined;
  const data = childOf(cite, "DATA");
  return {
    // a citation with a text instead of a pointer is its own title
    title: rec ? valueOf(rec, "TITL") || valueOf(rec, "ABBR") || cite.value : cite.value,
    author: valueOf(rec || null, "AUTH"),
    publication: valueOf(rec || null, "PUBL"),
    repository: (repoRec ? valueOf(repoRec, "NAME") : repo && !isLink(repo.value) ? repo.value : "") || "",
    page: valueOf(cite, "PAGE"),
    text: plainText((data && childOf(data, "TEXT")?.value.trim()) || ""),
    notes: [...notesOf(cite, lookup), ...(rec ? notesOf(rec, lookup) : [])],
  };
}

/** The sources and notes written directly under `node` (a record, an event or a name). */
export function annotations(node: GedNode | null | undefined, lookup: Lookup): Annotations {
  if (!node) return { sources: [], notes: [] };
  return { sources: childrenOf(node, "SOUR").map((c) => citation(c, lookup)), notes: notesOf(node, lookup) };
}

export const hasAnnotations = (a: Annotations) => a.sources.length > 0 || a.notes.length > 0;

/** `a` and `b` together, each note and source once */
export function mergeAnnotations(...list: Annotations[]): Annotations {
  const seen = new Set<string>();
  const once = <T,>(items: T[]) => items.filter((x) => !seen.has(JSON.stringify(x)) && !!seen.add(JSON.stringify(x)));
  return { sources: once(list.flatMap((a) => a.sources)), notes: once(list.flatMap((a) => a.notes)) };
}

/** Event tags of a person that the timeline shows; their notes and sources go on the event. */
export const TIMELINE_TAGS = ["BIRT", "CHR", "DEAT", "BURI"];

/**
 * The person's own notes and sources: on the record, on its names and on every line the
 * timeline does not show (occupation, residence, …). The NOTE the edit form shows is included.
 */
export function personAnnotations(rec: GedNode, lookup: Lookup): Annotations {
  const own = annotations(rec, lookup);
  const rest = rec.children.filter((c) => c.tag !== "NOTE" && c.tag !== "SOUR" && !TIMELINE_TAGS.includes(c.tag)
                                          && !OWN_EVENT_TAGS.includes(c.tag) && !c.verbatim);
  return mergeAnnotations(own, ...rest.map((c) => annotations(c, lookup)));
}

/** Notes and sources of the person's event with this tag. */
export function eventAnnotations(rec: GedNode, tag: string, lookup: Lookup): Annotations {
  return mergeAnnotations(...childrenOf(rec, tag).map((c) => annotations(c, lookup)));
}

/** Notes and sources of a marriage: those of the MARR line and those of the family record. */
export function marriageAnnotations(fam: GedNode, lookup: Lookup): Annotations {
  return mergeAnnotations(annotations(fam, lookup), eventAnnotations(fam, "MARR", lookup));
}

export type TextPart = { text: string; href?: string };

/** The text cut into plain pieces and web addresses (http, https); punctuation after an address stays outside it. */
export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+/gi)) {
    const url = m[0].replace(/[.,;:!?)\]'”]+$/, "");
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: url, href: url });
    last = m.index + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** one source of the file with the people who cite it */
export interface SourceEntry {
  key: string;
  citation: Citation;
  /** how many times it is cited (on people, events and families) */
  citations: number;
  /** ids of the people citing it: a family's citation counts for both spouses */
  people: string[];
}

/** one note text with the people it is written under */
export interface NoteEntry {
  text: string;
  people: string[];
}

export interface SourceOverview {
  sources: SourceEntry[];
  notes: NoteEntry[];
}

/**
 * Every source and note of the file at a glance: each source record (also one nobody cites) and each
 * text citation once, with the number of citations and the people; each note text once, with its people.
 */
export function sourceOverview(records: GedNode[], lookup: Lookup = lookupOf(records)): SourceOverview {
  const sources = new Map<string, SourceEntry & { who: Set<string> }>();
  const notes = new Map<string, { text: string; who: Set<string> }>();
  const entry = (key: string, cite: GedNode) => {
    let e = sources.get(key);
    if (!e) sources.set(key, e = { key, citation: citation(cite, lookup), citations: 0, people: [], who: new Set() });
    return e;
  };
  for (const r of records) if (r.tag === "SOUR" && r.xref) {
    // a source record nobody cites still belongs in the list
    entry(r.xref, { tag: "SOUR", value: r.xref, xref: null, children: [] });
  }
  const walk = (node: GedNode, owners: string[]) => {
    for (const c of node.children) {
      if (c.tag === "SOUR" && c.value.trim()) {
        const e = entry(isLink(c.value) ? c.value : c.value.trim(), c);
        e.citations++;
        owners.forEach((o) => e.who.add(o));
      } else if (c.tag === "NOTE") {
        const text = textOf(c, lookup);
        if (text) {
          const n = notes.get(text) ?? { text, who: new Set<string>() };
          owners.forEach((o) => n.who.add(o));
          notes.set(text, n);
        }
      }
      walk(c, owners);
    }
  };
  for (const r of records) {
    if (r.tag === "INDI" && r.xref) walk(r, [r.xref]);
    else if (r.tag === "FAM") walk(r, [childOf(r, "HUSB")?.value, childOf(r, "WIFE")?.value].filter((x): x is string => !!x));
  }
  const byTitle = (a: { citation: Citation }, b: { citation: Citation }) => a.citation.title.localeCompare(b.citation.title);
  return {
    sources: [...sources.values()].map(({ who, ...e }) => ({ ...e, people: [...who] })).sort(byTitle),
    notes: [...notes.values()].map((n) => ({ text: n.text, people: [...n.who] })).sort((a, b) => a.text.localeCompare(b.text)),
  };
}

/** a source record of the file, as offered when citing a source */
export interface SourceChoice { xref: string; title: string }

/** The source records of the file with their titles, sorted by title. */
export function sourceChoices(records: GedNode[]): SourceChoice[] {
  return records.filter((r) => r.tag === "SOUR" && r.xref)
    .map((r) => ({ xref: r.xref!, title: valueOf(r, "TITL") || valueOf(r, "ABBR") || r.xref! }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
