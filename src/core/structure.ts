/** Adding and removing whole people and families, with the pointers between the records kept consistent. */
import { gedNode, rewritten, type GedNode } from "./gedcom";
import { addLine } from "./edit";

/** the next free number for xrefs with the prefix: "I" gives @I8@ when @I7@ is the highest one */
function freeXref(records: GedNode[], prefix: string): string {
  const used = new Set(records.map((r) => r.xref));
  let n = records.reduce((m, r) => {
    const found = r.xref && new RegExp(`^@${prefix}(\\d+)@$`).exec(r.xref);
    return found ? Math.max(m, +found[1]) : m;
  }, 0);
  while (used.has(`@${prefix}${++n}@`));
  return `@${prefix}${n}@`;
}

/** the record list with `record` put before the trailer (or last, when the file has none) */
function appended(records: GedNode[], record: GedNode): GedNode[] {
  const at = records.findIndex((r) => r.tag === "TRLR");
  return at < 0 ? [...records, record] : [...records.slice(0, at), record, ...records.slice(at)];
}

const withoutPointer = (rec: GedNode, tags: string[], xref: string): GedNode => {
  const children = rec.children.filter((c) => !(tags.includes(c.tag) && c.value.trim() === xref));
  return children.length === rec.children.length ? rec : rewritten(rec, children);
};

const pointsTo = (rec: GedNode, tag: string, xref: string) => rec.children.some((c) => c.tag === tag && c.value.trim() === xref);

/** A new person without a name: `sex` is "M", "F" or "" (unknown). */
export function addPerson(records: GedNode[], sex = ""): { records: GedNode[]; id: string } {
  const id = freeXref(records, "I");
  const children = [gedNode("NAME", "//")];
  if (sex) children.push(gedNode("SEX", sex));
  return { records: appended(records, { ...gedNode("INDI", "", children), xref: id }), id };
}

/**
 * A new family of `person` (as husband or wife by their sex; a person of unknown sex becomes the husband). The person gets
 * the FAMS line, the family the HUSB or WIFE line; `spouse` and `children` are put in the same way when given.
 */
export function addFamily(records: GedNode[], person: string, extra: { spouse?: string; children?: string[] } = {}): { records: GedNode[]; id: string } {
  const id = freeXref(records, "F");
  const sexOf = (x: string) => records.find((r) => r.xref === x)?.children.find((c) => c.tag === "SEX")?.value.trim().toUpperCase();
  const wife = sexOf(person) === "F";
  const members: Array<[string, string]> = [];
  members.push([wife ? "WIFE" : "HUSB", person]);
  if (extra.spouse) members.push([wife ? "HUSB" : "WIFE", extra.spouse]);
  members.sort((a, b) => (a[0] === "HUSB" ? -1 : b[0] === "HUSB" ? 1 : 0));
  const fam: GedNode = { ...gedNode("FAM", "", [...members.map(([tag, x]) => gedNode(tag, x)), ...(extra.children ?? []).map((c) => gedNode("CHIL", c))]), xref: id };
  const spouses = members.map(([, x]) => x);
  const kids = extra.children ?? [];
  const out = appended(records, fam).map((r) => {
    if (!r.xref) return r;
    if (spouses.includes(r.xref) && !pointsTo(r, "FAMS", id)) return addLine(r, "FAMS", id);
    if (kids.includes(r.xref) && !pointsTo(r, "FAMC", id)) return addLine(r, "FAMC", id);
    return r;
  });
  return { records: out, id };
}

/** The family removed; the people in it lose their FAMS and FAMC lines for it, and nothing else changes. */
export function deleteFamily(records: GedNode[], id: string): GedNode[] {
  return records.filter((r) => r.xref !== id).map((r) => (r.tag === "INDI" ? withoutPointer(r, ["FAMS", "FAMC"], id) : r));
}

/**
 * The person removed with every pointer to them: the HUSB, WIFE and CHIL lines of their families, the ASSO and ALIA lines
 * of other people. A family left with nobody in it is removed too (its other members have no pointer to it any more).
 */
export function deletePerson(records: GedNode[], id: string): GedNode[] {
  let out = records.filter((r) => r.xref !== id).map((r) => {
    if (r.tag === "FAM") return withoutPointer(r, ["HUSB", "WIFE", "CHIL"], id);
    if (r.tag === "INDI") return withoutPointer(r, ["ASSO", "ALIA"], id);
    return r;
  });
  const empty = out.filter((r) => r.tag === "FAM" && !r.children.some((c) => ["HUSB", "WIFE", "CHIL"].includes(c.tag)) && records.find((o) => o.xref === r.xref) !== r);
  for (const fam of empty) out = deleteFamily(out, fam.xref!);
  return out;
}
