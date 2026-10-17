/** Adding and removing whole people and families, with the pointers between the records kept consistent. */
import { gedNode, rewritten, type GedNode } from "./gedcom";
import { addLine, applyPerson, personFields } from "./edit";

/**
 * The xref of a new record of type `tag` (INDI, FAM): the prefix most used by records of that type in the file (`fallback`
 * when none has a numbered xref), and a number above every number in any xref of the file, so a number is never reused,
 * not even one left free by a deleted record. Existing xrefs are never changed.
 */
export function freeXref(records: GedNode[], tag: string, fallback: string, taken: string[] = []): string {
  const uses = new Map<string, number>();
  let top = 0;
  for (const x of taken) top = Math.max(top, +(/(\d+)@$/.exec(x)?.[1] ?? 0));
  for (const r of records) {
    const found = r.xref && /^@(\D*)(\d+)@$/.exec(r.xref);
    if (!found) continue;
    top = Math.max(top, +found[2]);
    if (r.tag === tag) uses.set(found[1], (uses.get(found[1]) ?? 0) + 1);
  }
  const prefix = [...uses].sort((x, y) => y[1] - x[1])[0]?.[0] ?? fallback;
  return `@${prefix}${top + 1}@`;
}

/** what the form of a new child asks for; the dates are GEDCOM dates ("" when not known) */
export interface NewPerson { given: string; surname: string; sex: string; birth: string; deceased: boolean; death: string }

/** The record of a new person (not yet in any list) with the name, sex, birth and, when deceased, death; `famc` is the family they are a child of (`famc`) and the one they are a spouse in (`fams`). */
export function personRecord(xref: string, p: NewPerson, links: { famc?: string; fams?: string } = {}): GedNode {
  const blank: GedNode = { ...gedNode("INDI", "", [gedNode("NAME", "//")]), xref };
  const before = personFields(blank);
  const dated = (date: string) => ({ date, place: "" });
  const rec = applyPerson(blank, before, {
    ...before, given: p.given.trim(), surname: p.surname.trim(), sex: p.sex,
    birth: dated(p.birth), deceased: p.deceased, death: dated(p.deceased ? p.death : ""),
  });
  const withFamc = links.famc ? addLine(rec, "FAMC", links.famc) : rec;
  return links.fams ? addLine(withFamc, "FAMS", links.fams) : withFamc;
}

/** The record of a new family (not yet in any list) of the given spouses ("" for none) and children; the pointers in their records are the caller's. */
export function familyRecord(xref: string, husb: string, wife: string, children: string[] = []): GedNode {
  const lines = [husb && gedNode("HUSB", husb), wife && gedNode("WIFE", wife), ...children.map((c) => gedNode("CHIL", c))].filter((n): n is GedNode => !!n);
  return { ...gedNode("FAM", "", lines), xref };
}

/** the record list with `record` put before the trailer (or last, when the file has none) */
export function appended(records: GedNode[], record: GedNode): GedNode[] {
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
  const id = freeXref(records, "INDI", "I");
  const children = [gedNode("NAME", "//")];
  if (sex) children.push(gedNode("SEX", sex));
  return { records: appended(records, { ...gedNode("INDI", "", children), xref: id }), id };
}

/**
 * A new family of `person` (as husband or wife by their sex; a person of unknown sex becomes the husband). The person gets
 * the FAMS line, the family the HUSB or WIFE line; `spouse` and `children` are put in the same way when given.
 */
export function addFamily(records: GedNode[], person: string, extra: { spouse?: string; children?: string[] } = {}): { records: GedNode[]; id: string } {
  const id = freeXref(records, "FAM", "F");
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
