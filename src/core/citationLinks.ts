/**
 * Web addresses that sit in the citations of a source (the PAGE, NOTE or TEXT line under the person's or event's `SOUR` line),
 * not in the source record itself. FamilySearch and similar exports write the address of one entry there.
 * Only the address changes when one is edited; the rest of the line, and every other line of the file, stays as it was.
 */

import { addChild } from "./edit";
import { childOf, childrenOf, gedNode, rewritten, type GedNode } from "./gedcom";
import { holderOf, isWebAddress, type SourceCite } from "./sourceLinks";

/** one web address found in a citation of a source */
export interface CitationLinkLine {
  /** where it sits in the file (record, lines, which address of the line); stable until the records change */
  key: string;
  /** the person or family record that holds the citation */
  holder: string;
  /** the tag of the event line the citation sits under; "" when it sits on the record itself */
  event: string;
  url: string;
}

const ADDRESS = /https?:\/\/[^\s<>"]+/gi;
const trimEnd = (url: string) => url.replace(/[.,;:!?)\]'”]+$/, "");
const isPointer = (value: string) => /^@[^@]+@$/.test(value.trim());
const READ = new Set(["PAGE", "NOTE", "TEXT"]);

/** the addresses of one line: where each starts and ends in the value */
function addressesOf(value: string): { at: number; url: string }[] {
  return [...value.matchAll(ADDRESS)].map((m) => ({ at: m.index, url: trimEnd(m[0]) }));
}

/** the lines of a citation that can hold an address (a pointer to a note record is not text), as paths below the citation */
function textLines(cite: GedNode): number[][] {
  const out: number[][] = [];
  cite.children.forEach((c, i) => {
    if (READ.has(c.tag) && !(c.tag === "NOTE" && isPointer(c.value))) out.push([i]);
    if (c.tag === "DATA") c.children.forEach((d, j) => { if (d.tag === "TEXT") out.push([i, j]); });
  });
  return out;
}

const at = (node: GedNode, path: number[]): GedNode => path.reduce((n, i) => n.children[i], node);

/** every citation line of the source `xref`: [holder record index, path to the citation, event tag] */
function citations(records: GedNode[], xref: string): { rec: number; path: number[]; event: string }[] {
  const out: { rec: number; path: number[]; event: string }[] = [];
  const cites = (n: GedNode) => n.tag === "SOUR" && n.value.trim() === xref;
  records.forEach((rec, r) => {
    if ((rec.tag !== "INDI" && rec.tag !== "FAM") || !rec.xref) return;
    rec.children.forEach((c, i) => {
      if (cites(c)) out.push({ rec: r, path: [i], event: "" });
      else c.children.forEach((d, j) => { if (cites(d)) out.push({ rec: r, path: [i, j], event: c.tag }); });
    });
  });
  return out;
}

/** The web addresses written in the citations of the source `xref`, in file order. */
export function citationLinkLines(records: GedNode[], xref: string): CitationLinkLine[] {
  const out: CitationLinkLine[] = [];
  for (const c of citations(records, xref)) {
    const rec = records[c.rec];
    for (const line of textLines(at(rec, c.path))) {
      addressesOf(at(rec, [...c.path, ...line]).value).forEach((a, n) =>
        out.push({ key: [c.rec, ...c.path, ...line, n].join("."), holder: rec.xref!, event: c.event, url: a.url }));
    }
  }
  return out;
}

/** A change of one address: `url` is the new address, or "" to take the address out of the line. */
export interface CitationLinkChange { key: string; url: string }

/** `value` with its `n`-th address replaced; taking it out also takes the brackets and separators it leaves behind. */
function replaceAddress(value: string, n: number, url: string): string {
  const found = addressesOf(value)[n];
  if (!found) return value;
  const next = value.slice(0, found.at) + url + value.slice(found.at + found.url.length);
  return url ? next : next.replace(/\(\s*[:;,]?\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/\s+([,;:.])/g, "$1").replace(/^[\s:;,]+|[\s:;,]+$/g, "");
}

/**
 * The records with the given addresses of the citations changed. A new address must be a whole web address, otherwise the
 * change is ignored. A line left empty by taking its address out is removed. Records that are not touched stay the same objects.
 */
export function setCitationLinks(records: GedNode[], changes: CitationLinkChange[]): GedNode[] {
  const valid = changes.filter((c) => c.url === "" || isWebAddress(c.url));
  if (!valid.length) return records;
  const parsed = valid.map((c) => {
    const parts = c.key.split(".").map(Number);
    return { rec: parts[0], n: parts[parts.length - 1], path: parts.slice(1, -1), url: c.url.trim() };
  });
  const byRecord = new Map<number, typeof parsed>();
  for (const p of parsed) byRecord.set(p.rec, [...(byRecord.get(p.rec) ?? []), p]);
  return records.map((rec, r) => {
    const mine = byRecord.get(r);
    if (!mine) return rec;
    const edit = (node: GedNode, path: number[]): GedNode => {
      const here = mine.filter((p) => p.path.length === path.length && p.path.every((v, i) => v === path[i]));
      let value = node.value;
      let changed = false;
      // later addresses first, so the places of the earlier ones in the line do not move
      for (const p of [...here].sort((a, b) => b.n - a.n)) {
        const next = replaceAddress(value, p.n, p.url);
        if (next !== value) { value = next; changed = true; }
      }
      const kids = node.children.flatMap((c, i) => {
        const inner = edit(c, [...path, i]);
        return inner.tag === "" ? [] : [inner];
      });
      const kidsChanged = kids.length !== node.children.length || kids.some((k, i) => k !== node.children[i]);
      if (!changed && !kidsChanged) return node;
      const next = rewritten({ ...node, value }, kids);
      // a line that held only the address and has nothing below it goes away
      return changed && !value.trim() && !kids.length && READ.has(node.tag) ? { ...next, tag: "" } : next;
    };
    return edit(rec, []);
  });
}

/** An address for a citation that has none yet (or has a page text without one). */
export interface CitationAddress { cite: SourceCite; url: string }

/**
 * The records with the web address written into the citation of the source `xref` at each place (a person, one of their events,
 * or a marriage or divorce). The address goes into the citation's page line: after the text already there, or as a new page line.
 * Places that do not cite the source and things that are not a whole web address are skipped.
 */
export function addCitationAddresses(records: GedNode[], xref: string, adds: CitationAddress[]): GedNode[] {
  let out = records;
  for (const { cite, url } of adds) {
    const address = url.trim();
    if (!isWebAddress(address)) continue;
    const holder = holderOf(out, cite);
    if (!holder) continue;
    const cites = (n: GedNode) => n.tag === "SOUR" && n.value.trim() === xref;
    const withAddress = (sour: GedNode): GedNode => {
      const page = childOf(sour, "PAGE");
      return page
        ? rewritten(sour, sour.children.map((c) => (c === page ? rewritten({ ...c, value: `${c.value.trim()} ${address}`.trim() }) : c)))
        : addChild(sour, gedNode("PAGE", address));
    };
    let next: GedNode | null = null;
    if (!cite.event) {
      const sour = holder.children.find(cites);
      if (sour) next = rewritten(holder, holder.children.map((c) => (c === sour ? withAddress(c) : c)));
    } else {
      const ev = childrenOf(holder, cite.event).find((e) => e.children.some(cites));
      const sour = ev?.children.find(cites);
      if (ev && sour) next = rewritten(holder, holder.children.map((c) => (c === ev ? rewritten(ev, ev.children.map((k) => (k === sour ? withAddress(k) : k))) : c)));
    }
    if (next) out = out.map((r) => (r === holder ? next! : r));
  }
  return out;
}

/** the page text of one citation that has no web address in it (a book page, a line of a chronicle) */
export interface CitationPageLine {
  /** where the PAGE line sits in the file (record, path to it); stable until the records change */
  key: string;
  holder: string;
  event: string;
  text: string;
}

/** The page lines (PAGE) of the citations of the source `xref` that hold text without a web address, in file order. */
export function citationPageLines(records: GedNode[], xref: string): CitationPageLine[] {
  const out: CitationPageLine[] = [];
  for (const c of citations(records, xref)) {
    const rec = records[c.rec];
    at(rec, c.path).children.forEach((d, i) => {
      if (d.tag === "PAGE" && d.value.trim() && !addressesOf(d.value).length)
        out.push({ key: [c.rec, ...c.path, i].join("."), holder: rec.xref!, event: c.event, text: d.value.trim() });
    });
  }
  return out;
}

/** A change of one page text: `text` is the new text; an empty text is ignored, so no line moves and the keys of other changes stay valid. */
export interface CitationPageChange { key: string; text: string }

/** The records with the given page texts changed . Records that are not touched stay the same objects. */
export function setCitationPages(records: GedNode[], changes: CitationPageChange[]): GedNode[] {
  const valid = changes.filter((c) => c.text.trim() !== "");
  if (!valid.length) return records;
  const byRecord = new Map<number, { path: number[]; text: string }[]>();
  for (const c of valid) {
    const parts = c.key.split(".").map(Number);
    byRecord.set(parts[0], [...(byRecord.get(parts[0]) ?? []), { path: parts.slice(1), text: c.text.trim() }]);
  }
  return records.map((rec, r) => {
    const mine = byRecord.get(r);
    if (!mine) return rec;
    const edit = (node: GedNode, path: number[]): GedNode => {
      const here = mine.find((p) => p.path.length === path.length && p.path.every((v, i) => v === path[i]));
      if (here && node.tag === "PAGE" && here.text === node.value.trim()) return node;
      if (here && node.tag === "PAGE") return rewritten({ ...node, value: here.text });
      const kids = node.children.map((c, i) => edit(c, [...path, i]));
      return kids.some((k, i) => k !== node.children[i]) ? rewritten(node, kids) : node;
    };
    return edit(rec, []);
  });
}
