/** Technical lines of a record: when it was last changed, its reference numbers, linked media. */

import { childOf, type GedNode } from "./gedcom";

export interface InfoLine { key: "changed" | "reference" | "recordId" | "uid" | "media"; value: string }

const text = (node: GedNode) => node.value.trim();

/** CHAN (date and time), REFN (with its TYPE), RIN, _UID and OBJE lines, in that order; none when empty. */
export function recordInfo(rec: GedNode): InfoLine[] {
  const out: InfoLine[] = [];
  for (const c of rec.children) {
    if (c.verbatim !== undefined) continue;
    if (c.tag === "CHAN") {
      const date = childOf(c, "DATE");
      const time = date && childOf(date, "TIME");
      const value = [date && text(date), time && text(time)].filter(Boolean).join(" ");
      if (value) out.push({ key: "changed", value });
    } else if (c.tag === "REFN" && text(c)) {
      const type = childOf(c, "TYPE")?.value.trim();
      out.push({ key: "reference", value: type ? `${text(c)} (${type})` : text(c) });
    } else if (c.tag === "RIN" && text(c)) out.push({ key: "recordId", value: text(c) });
    else if ((c.tag === "_UID" || c.tag === "_UUID") && text(c)) out.push({ key: "uid", value: text(c) });
    else if (c.tag === "OBJE") {
      const file = childOf(c, "FILE")?.value.trim() || (/^@[^@]+@$/.test(c.value) ? "" : text(c));
      const title = childOf(c, "TITL")?.value.trim() || (childOf(c, "FILE") && childOf(childOf(c, "FILE")!, "TITL")?.value.trim());
      const value = [file, title && `(${title})`].filter(Boolean).join(" ");
      if (value) out.push({ key: "media", value });
    }
  }
  return out;
}
