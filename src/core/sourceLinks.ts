/**
 * The text of a source record, as the Sources panel saves it. Only the record that is edited is rewritten; the
 * notes and addresses it already has keep their lines, and lines the panel does not show (references, dates, pointers
 * to note records) stay in place.
 */

import { addChild } from "./edit";
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

/** The event a source can be cited under from the Sources panel: the whole person, or one of its four fixed events. */
export type CiteEvent = "" | "BIRT" | "CHR" | "DEAT" | "BURI";

/**
 * The records with the source `xref` cited for the person `person`: under the person itself (`event` ""), or under
 * the event line (the event is added when the person has none). A citation that is already there changes nothing.
 */
export function addSourceCitation(records: GedNode[], xref: string, person: string, event: CiteEvent): GedNode[] {
  const who = records.find((rec) => rec.xref === person && rec.tag === "INDI");
  if (!who || !records.some((rec) => rec.xref === xref && rec.tag === "SOUR")) return records;
  const cite = gedNode("SOUR", xref);
  let next: GedNode;
  if (!event) {
    if (childrenOf(who, "SOUR").some((c) => c.value === xref)) return records;
    next = addChild(who, cite);
  } else {
    const ev = childOf(who, event);
    if (ev && childrenOf(ev, "SOUR").some((c) => c.value === xref)) return records;
    const updated = ev ? addChild(ev, cite) : gedNode(event, "", [cite]);
    next = ev ? rewritten(who, who.children.map((c) => (c === ev ? updated : c))) : addChild(who, updated);
  }
  return records.map((rec) => (rec === who ? next : rec));
}
