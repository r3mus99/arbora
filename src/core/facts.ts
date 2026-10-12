/** Facts about a person that are not events: education, nationality, title, property, … */

import { childOf, type GedNode } from "./gedcom";

/** Attribute tags of a person shown as facts of their own (occupation and religion have their own places). */
export const ATTRIBUTE_TAGS = ["EDUC", "NATI", "TITL", "PROP", "CAST", "DSCR", "NCHI", "IDNO", "FACT"];

export interface Attribute {
  tag: string;
  value: string;
  date: string;
  place: string;
  /** the GEDCOM line, to read its sources and notes from */
  node: GedNode;
}

/** The attribute lines of a person record in file order; one with neither value, date nor place is left out. */
export function personAttributes(rec: GedNode): Attribute[] {
  return rec.children.filter((c) => ATTRIBUTE_TAGS.includes(c.tag))
    .map((node) => ({ tag: node.tag, value: node.value === "Y" ? "" : node.value,
                      date: childOf(node, "DATE")?.value || "", place: childOf(node, "PLAC")?.value || "", node }))
    .filter((a) => a.value || a.date || a.place);
}
