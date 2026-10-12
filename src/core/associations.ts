/** Associations (ASSO): a person pointing at another one, e.g. a godparent or a witness. */

import { childOf, type GedNode } from "./gedcom";

export interface Association {
  /** the xref of the other person: the one named by the ASSO line, or the one whose line names this person */
  id: string;
  /** RELA as written ("godparent"), lower-case and trimmed; "" when there is none */
  role: string;
}

const role = (node: GedNode) => (childOf(node, "RELA")?.value || "").trim().toLowerCase();
const isLink = (v: string) => /^@[^@]+@$/.test(v);

/** The people a record names with ASSO: for `ASSO @X@` with `RELA godparent`, X is the godparent. */
export function associationsOf(rec: GedNode): Association[] {
  return rec.children.filter((c) => c.tag === "ASSO" && isLink(c.value)).map((c) => ({ id: c.value, role: role(c) }));
}

/** For each person, the people whose ASSO lines name them (the godchildren of a godparent, …). */
export function inboundAssociations(records: GedNode[]): Map<string, Association[]> {
  const map = new Map<string, Association[]>();
  for (const rec of records) {
    if (rec.tag !== "INDI" || !rec.xref) continue;
    for (const c of rec.children) {
      if (c.tag !== "ASSO" || !isLink(c.value)) continue;
      const list = map.get(c.value) || [];
      list.push({ id: rec.xref, role: role(c) });
      map.set(c.value, list);
    }
  }
  return map;
}
