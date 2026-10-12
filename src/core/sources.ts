/** Sources (SOUR) and notes (NOTE) attached to a record or an event, resolved to readable text. */

import { DAYS, MONTHS, monthOf } from "./date";
import { childOf, childrenOf, rewritten, type GedNode } from "./gedcom";

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
                                          && !c.verbatim);
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

// ------------------------------------------------------------ attaching a source to an event

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Whole dates written in a text ("24 Nov 1796", "24.11.1796", "1796-11-24") as GEDCOM dates ("24 NOV 1796"). */
export function datesIn(text: string): string[] {
  const out: string[] = [];
  const add = (d: number, m: number, y: string) => {
    if (m >= 1 && m <= 12 && d >= 1 && d <= DAYS[m - 1]) out.push(`${d} ${MONTHS[m - 1]} ${y}`);
  };
  for (const m of text.matchAll(/(?<![\d.])(\d{1,2})[ .-]+([A-Za-z]{3})[A-Za-z]*\.?,? +(\d{4})(?!\d)/g)) {
    add(+m[1], MONTH_NAMES.indexOf(m[2].toLowerCase()) + 1, m[3]);
  }
  for (const m of text.matchAll(/(?<![\d.])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})(?!\d)/g)) add(+m[1], +m[2], m[3]);
  for (const m of text.matchAll(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g)) add(+m[3], +m[2], m[1]);
  return [...new Set(out)];
}

/** An event's DATE as a whole GEDCOM date ("04 nov 1796" → "4 NOV 1796"), or "" when it is not one. */
const wholeDate = (value: string) => {
  const m = /^(\d{1,2}) ([A-Z]{3}) (\d{4})$/.exec(value.trim().toUpperCase().replace(/\s+/g, " "));
  return m && monthOf(m[2]) ? `${+m[1]} ${m[2]} ${m[3]}` : "";
};

/** Events a source can be moved to, in the order of the timeline. */
const EVENT_TAGS = ["BIRT", "CHR", "BAPM", "DEAT", "BURI", "CREM"];

/** every text a citation carries: its own lines and those of the source record */
function citationTexts(cite: GedNode, lookup: Lookup): string[] {
  const rec = isLink(cite.value) ? lookup(cite.value) : undefined;
  const c = citation(cite, lookup);
  const own = [cite.value, c.title, c.page, c.text, c.publication, ...c.notes];
  return rec ? [...own, valueOf(rec, "TEXT"), valueOf(childOf(rec, "DATA"), "TEXT")] : own;
}

export interface SourceMove {
  /** position among the SOUR lines of the person record */
  index: number;
  /** the event line the source belongs to */
  tag: string;
  /** the date both have */
  date: string;
  title: string;
}

/**
 * Sources cited on the person as a whole that mention the date of exactly one of the person's
 * events (birth, christening, death, burial) and are not yet cited there.
 */
export function sourceMoves(rec: GedNode, lookup: Lookup): SourceMove[] {
  const events = rec.children.filter((c) => EVENT_TAGS.includes(c.tag))
    .map((ev) => ({ tag: ev.tag, ev, date: wholeDate(childOf(ev, "DATE")?.value || "") })).filter((e) => e.date);
  if (!events.length) return [];
  const moves: SourceMove[] = [];
  childrenOf(rec, "SOUR").forEach((cite, index) => {
    const dates = new Set(citationTexts(cite, lookup).flatMap(datesIn));
    const hits = events.filter((e) => dates.has(e.date));
    // a date shared by two events (birth and baptism on one day) tells nothing
    if (hits.length !== 1 || events.filter((e) => e.date === hits[0].date).length > 1) return;
    const { tag, ev, date } = hits[0];
    if (childrenOf(ev, "SOUR").some((s) => s.value === cite.value && cite.value)) return;
    moves.push({ index, tag, date, title: citation(cite, lookup).title });
  });
  return moves;
}

/** The person record with its `index`-th SOUR line (and the lines under it) moved under the event with the tag and date. */
export function moveSource(rec: GedNode, index: number, tag: string, date: string): GedNode {
  const cite = childrenOf(rec, "SOUR")[index];
  const ev = rec.children.find((c) => c.tag === tag && wholeDate(childOf(c, "DATE")?.value || "") === date);
  if (!cite || !ev) return rec;
  return rewritten(rec, rec.children.filter((c) => c !== cite)
    .map((c) => (c === ev ? rewritten(ev, [...ev.children, cite]) : c)));
}
