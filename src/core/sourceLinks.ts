/**
 * The text of a source record, as the Sources panel saves it. Only the record that is edited is rewritten; the
 * notes and addresses it already has keep their lines, and lines the panel does not show (references, dates, pointers
 * to note records) stay in place.
 */

import { addChild } from "./edit";
import { appended, freeXref } from "./structure";
import { childOf, childrenOf, gedNode, rewritten, type GedNode } from "./gedcom";
import type { SourceFields } from "./sources";

/** True for a whole web address (http or https) with no spaces around it. */
export const isWebAddress = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

const pointer = (c: GedNode) => c.tag === "NOTE" && /^@[^@]+@$/.test(c.value.trim());
const link = (c: GedNode) => c.tag === "NOTE" && isWebAddress(c.value);
const text = (c: GedNode) => c.tag === "NOTE" && !pointer(c) && !link(c);

/** The records with the source `xref` holding `f`; nothing changes when the source is not there or nothing differs. */
export function setSourceFields(records: GedNode[], xref: string, f: SourceFields): GedNode[] {
  const target = records.find((rec) => rec.xref === xref && rec.tag === "SOUR");
  if (!target) return records;
  const kids = target.children;
  // a note or address that is kept keeps its own lines (CONT and the like); a new one is written as a single line
  const notes = f.notes.map((n) => n.trim()).filter(Boolean)
    .map((value) => kids.find((c) => text(c) && c.value.trim() === value) ?? gedNode("NOTE", value));
  const links = f.links.map((l) => l.trim()).filter(isWebAddress)
    .map((url) => kids.find((c) => link(c) && c.value.trim() === url) ?? gedNode("NOTE", url));
  const single = (tag: string, value: string) => value.trim() ? [gedNode(tag, value.trim())] : [];
  const rest = kids.filter((c) => !["TITL", "AUTH", "PUBL"].includes(c.tag) && !text(c) && !link(c));
  const children = [
    ...(f.title.trim() ? single("TITL", f.title) : kids.filter((c) => c.tag === "TITL")),
    ...single("AUTH", f.author),
    ...single("PUBL", f.publication),
    ...rest,
    ...notes,
    ...links,
  ];
  const next = rewritten(target, children);
  return records.map((rec) => (rec === target ? next : rec));
}

/** The event a source can be cited under from the Sources panel: the whole person, a fixed event, a marriage or divorce of a family, or a residence. */
export type CiteEvent = "" | "BIRT" | "CHR" | "DEAT" | "BURI" | "MARR" | "DIV" | "RESI";

/** where a source is cited: under the person (`event` "" or one of their events), or under a marriage or divorce of a family */
export interface SourceCite { event: CiteEvent; person: string; family: string }

const PERSON_EVENTS: CiteEvent[] = ["BIRT", "CHR", "DEAT", "BURI", "RESI"];
const onFamily = (event: CiteEvent) => event === "MARR" || event === "DIV";
export const citeKey = (c: SourceCite) => `${c.event}|${c.person}|${c.family}`;

/** The places a source is cited from the Sources panel: under a person, one of their events, or a marriage or divorce. Other lines that cite it are not listed. */
export function sourceCites(records: GedNode[], xref: string): SourceCite[] {
  const cites = (node: GedNode) => childrenOf(node, "SOUR").some((c) => c.value === xref);
  const out: SourceCite[] = [];
  for (const rec of records) {
    if (rec.tag === "INDI" && rec.xref) {
      if (cites(rec)) out.push({ event: "", person: rec.xref, family: "" });
      for (const event of PERSON_EVENTS) if (childrenOf(rec, event).some(cites)) out.push({ event, person: rec.xref, family: "" });
    } else if (rec.tag === "FAM" && rec.xref) {
      for (const event of ["MARR", "DIV"] as const) if (childrenOf(rec, event).some(cites)) out.push({ event, person: "", family: rec.xref });
    }
  }
  return out;
}

export const holderOf = (records: GedNode[], c: SourceCite) =>
  records.find((rec) => (onFamily(c.event) ? rec.tag === "FAM" && rec.xref === c.family : rec.tag === "INDI" && rec.xref === c.person));

/** `node` with the source added under its `event` line (the line is added when missing); null when it is already cited there */
function citeOn(node: GedNode, event: CiteEvent, xref: string): GedNode | null {
  const cite = gedNode("SOUR", xref);
  if (!event) return childrenOf(node, "SOUR").some((c) => c.value === xref) ? null : addChild(node, cite);
  const ev = childOf(node, event);
  if (ev && childrenOf(ev, "SOUR").some((c) => c.value === xref)) return null;
  if (!ev) return addChild(node, gedNode(event, "", [cite]));
  return rewritten(node, node.children.map((c) => (c === ev ? addChild(ev, cite) : c)));
}

/** The records with the source `xref` cited at `cite` (the event line is added when missing); nothing changes when it is already there or the person, family or source is not in the file. */
export function addCite(records: GedNode[], xref: string, cite: SourceCite): GedNode[] {
  if (!records.some((rec) => rec.xref === xref && rec.tag === "SOUR")) return records;
  const target = holderOf(records, cite);
  if (!target) return records;
  const next = citeOn(target, cite.event, xref);
  return next ? records.map((rec) => (rec === target ? next : rec)) : records;
}

/** `node` without the citations of `xref` (an event line that is left empty goes with it, a line with a value does not) */
function stripCites(node: GedNode, xref: string, top = true): GedNode {
  let changed = false;
  const kept: GedNode[] = [];
  for (const c of node.children) {
    if (c.tag === "SOUR" && c.value === xref) { changed = true; continue; }
    const inner = stripCites(c, xref, false);
    if (inner !== c) {
      changed = true;
      if (top && !inner.children.length && !inner.value.trim()) continue;
    }
    kept.push(inner);
  }
  return changed ? rewritten(node, kept) : node;
}

/** The records with the source `xref` no longer cited at `cite`. */
export function removeCite(records: GedNode[], xref: string, cite: SourceCite): GedNode[] {
  const target = holderOf(records, cite);
  if (!target) return records;
  let next: GedNode;
  if (!cite.event) {
    const kept = target.children.filter((c) => !(c.tag === "SOUR" && c.value === xref));
    if (kept.length === target.children.length) return records;
    next = rewritten(target, kept);
  } else {
    const events = childrenOf(target, cite.event);
    const stripped = events.map((ev) => stripCites(ev, xref, false));
    if (stripped.every((ev, i) => ev === events[i])) return records;
    const empty = (ev: GedNode) => !ev.children.length && !ev.value.trim();
    next = rewritten(target, target.children.flatMap((c) => {
      const at = events.indexOf(c);
      return at < 0 ? [c] : empty(stripped[at]) ? [] : [stripped[at]];
    }));
  }
  return records.map((rec) => (rec === target ? next : rec));
}

/** The records without the source `xref` and without every line that cites it (an event line left empty goes too). */
export function deleteSource(records: GedNode[], xref: string): GedNode[] {
  return records.filter((rec) => !(rec.tag === "SOUR" && rec.xref === xref)).map((rec) => stripCites(rec, xref));
}

/**
 * Saves the source window as one change: the record `xref` (a new one when null) gets `fields`, and the places it is
 * cited from go from `before` to `after`. Returns the records and the xref of the source.
 */
export function saveSource(records: GedNode[], xref: string | null, fields: SourceFields, before: SourceCite[], after: SourceCite[]): { records: GedNode[]; xref: string } {
  let recs = records;
  let id = xref;
  if (!id) {
    id = freeXref(recs, "SOUR", "S");
    recs = appended(recs, { ...gedNode("SOUR"), xref: id });
  }
  recs = setSourceFields(recs, id, fields);
  const had = new Set(before.map(citeKey));
  const has = new Set(after.map(citeKey));
  for (const c of before) if (!has.has(citeKey(c))) recs = removeCite(recs, id, c);
  for (const c of after) if (!had.has(citeKey(c))) recs = addCite(recs, id, c);
  return { records: recs, xref: id };
}
