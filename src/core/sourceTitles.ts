/** Renaming a source: only the title line changes, and the old title is kept as a note of the source. */

import { addLine } from "./edit";
import { gedNode, rewritten, type GedNode } from "./gedcom";

/** one source to rename */
export interface SourceRename {
  xref: string;
  from: string;
  to: string;
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
