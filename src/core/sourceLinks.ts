/**
 * Web addresses of a source record, added and removed from the Sources panel. A new address is written as a NOTE line
 * of the source record, which is how the file already keeps links; only the source record that is edited is rewritten,
 * every other record stays as it was read.
 */

import { addLine } from "./edit";
import { rewritten, type GedNode } from "./gedcom";
import { ownLinksOf } from "./sources";

/** True for a whole web address (http or https) with no spaces around it. */
export const isWebAddress = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

/** The records with `url` added as a NOTE line of the source `xref`; nothing changes when the address is not one or is already there. */
export function addSourceLink(records: GedNode[], xref: string, url: string): GedNode[] {
  const link = url.trim();
  const target = records.find((rec) => rec.xref === xref && rec.tag === "SOUR");
  if (!isWebAddress(link) || !target || ownLinksOf(target).includes(link)) return records;
  return records.map((rec) => rec === target ? addLine(rec, "NOTE", link) : rec);
}

/** The records with the address `url` taken out of the NOTE lines of the source `xref`; the other lines stay. */
export function removeSourceLink(records: GedNode[], xref: string, url: string): GedNode[] {
  const link = url.trim();
  const target = records.find((rec) => rec.xref === xref && rec.tag === "SOUR" && ownLinksOf(rec).includes(link));
  if (!target) return records;
  return records.map((rec) => rec === target ? rewritten(rec, rec.children.filter((c) => !(c.tag === "NOTE" && c.value.trim() === link))) : rec);
}
