/** Merging two records of the same person: the second person is folded into the first and removed. */
import { addChild, addLine, addUnlisted, applyPerson, personFields, type EventFields, type PersonFields } from "./edit";
import { rewritten, type GedNode } from "./gedcom";

/** the single values that can differ between the two people; a conflict is shown to the user, who keeps one side */
export const MERGE_FIELDS = ["name", "sex", "birth", "christening", "death", "burial", "religion", "note", "restriction"] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
export type MergePick = Partial<Record<MergeField, "keep" | "drop">>;

/** the value of a field as text, "" when the person has none */
export function mergeValue(f: PersonFields, field: MergeField): string {
  const event = (e: EventFields) => [e.date, e.place].filter(Boolean).join(", ");
  switch (field) {
    case "name": return [f.given, f.surname].filter(Boolean).join(" ");
    case "birth": case "christening": case "death": case "burial": return event(f[field]);
    default: return f[field];
  }
}

/** the fields where both people have a value and the values differ */
export function mergeConflicts(a: PersonFields, b: PersonFields): MergeField[] {
  return MERGE_FIELDS.filter((f) => mergeValue(a, f) && mergeValue(b, f) && mergeValue(a, f) !== mergeValue(b, f));
}

/**
 * Event and fact lines the editor and the detail view do not handle (other events such as census or custom events,
 * and facts such as education or title): they stay in the file, and a merge carries over those of the removed person.
 */
const UNMANAGED_TAGS = ["BAPM", "BLES", "CREM", "ADOP", "CONF", "FCOM", "ORDN", "CENS", "EMIG", "IMMI", "NATU", "GRAD",
                        "RETI", "PROB", "WILL", "EVEN", "EDUC", "NATI", "TITL", "PROP", "CAST", "DSCR", "NCHI", "IDNO", "FACT"];

const pointers = (rec: GedNode, tags: string[]) => rec.children.filter((c) => tags.includes(c.tag)).map((c) => c.value.trim());

/**
 * Why two people cannot be merged, or null: they are the same record, spouses of one family, or a parent and a child of
 * one family (merging them would make a person their own spouse or parent). Two children of a family can be merged:
 * that is how a child entered twice looks.
 */
export function mergeBlocker(records: GedNode[], a: string, b: string): "same" | "related" | null {
  if (a === b) return "same";
  return records.some((r) => {
    if (r.tag !== "FAM") return false;
    const spouses = pointers(r, ["HUSB", "WIFE"]), children = pointers(r, ["CHIL"]);
    return (spouses.includes(a) && (spouses.includes(b) || children.includes(b))) || (spouses.includes(b) && children.includes(a));
  }) ? "related" : null;
}

/** a row of a list without its position, to find out whether the other person has the same row */
const same = (x: unknown, y: unknown) => {
  const strip = (v: unknown) => JSON.stringify(v, (k, val) => (k === "origin" ? undefined : val));
  return strip(x) === strip(y);
};

/** the rows of `extra` that `rows` do not have yet, as new rows */
const union = <T extends { origin: number }>(rows: T[], extra: T[]): T[] =>
  [...rows, ...extra.filter((e) => !rows.some((r) => same(r, e))).map((e) => ({ ...e, origin: -1 }))];

/** contact and reference lines the editor does not show, but a merge must not lose */
const CARRIED = ["PHON", "EMAIL", "FAX", "WWW", "REFN", ...UNMANAGED_TAGS];
/** lines a person has once: the kept person's own wins */
const CARRIED_ONCE = ["AFN", "RFN"];

/** the line without its position in the file, to tell whether the kept person has the same line */
const lineKey = (n: GedNode): string => JSON.stringify([n.tag, n.value.trim(), n.children.map(lineKey)]);

/** the kept person with the contact lines, reference numbers, AFN and RFN of the removed one that it does not have yet */
function carryLines(kept: GedNode, removed: GedNode): GedNode {
  let out = kept;
  for (const c of removed.children) {
    const once = CARRIED_ONCE.includes(c.tag);
    if (!once && !CARRIED.includes(c.tag)) continue;
    if (once ? out.children.some((k) => k.tag === c.tag) : out.children.some((k) => lineKey(k) === lineKey(c))) continue;
    out = UNMANAGED_TAGS.includes(c.tag) ? addUnlisted(out, { ...c, src: undefined }) : addChild(out, { ...c, src: undefined });
  }
  return out;
}

/** the fields of the kept person after the merge: the picked values, the rows of both people */
export function mergedFields(a: PersonFields, b: PersonFields, pick: MergePick): PersonFields {
  const out: PersonFields = { ...a, details: { ...a.details } };
  // a value only one person has is taken; a conflict follows the pick (the kept person's value by default)
  const takes = (field: MergeField) => (mergeValue(a, field) ? pick[field] === "drop" && !!mergeValue(b, field) : !!mergeValue(b, field));
  for (const field of MERGE_FIELDS) {
    if (!takes(field)) continue;
    if (field === "name") { out.given = b.given; out.surname = b.surname; out.nameParts = b.nameParts; }
    else if (field === "birth" || field === "christening" || field === "death" || field === "burial") {
      out[field] = { ...b[field] };
      out.details[field] = b.details[field];
    } else out[field] = b[field];
  }
  out.deceased = a.deceased || b.deceased;
  out.occupations = union(a.occupations, b.occupations);
  out.aliases = union(a.aliases, b.aliases);
  out.events = union(a.events, b.events);
  out.citations = union(a.citations, b.citations);
  // the other person's parents (families they are a child of) and associations, except one that is the kept person
  out.parents = union(a.parents, b.parents);
  out.associations = union(a.associations, b.associations);
  out.address = a.address || b.address;
  // the name the other person had is not lost: it stays as another form of the name when it was not picked
  if (mergeValue(a, "name") && mergeValue(b, "name") && mergeValue(a, "name") !== mergeValue(b, "name")) {
    const lost = takes("name") ? { given: a.given, surname: a.surname } : { given: b.given, surname: b.surname };
    if (!out.aliases.some((x) => x.given === lost.given && x.surname === lost.surname)) out.aliases = [...out.aliases, { origin: -1, ...lost }];
  }
  return out;
}

const repoint = (rec: GedNode, tags: string[], from: string, to: string): GedNode => {
  if (!rec.children.some((c) => tags.includes(c.tag) && c.value.trim() === from)) return rec;
  const seen = new Set<string>();
  const children = rec.children.map((c) => (tags.includes(c.tag) && c.value.trim() === from ? { ...c, value: to, src: undefined } : c))
    .filter((c) => {
      // the same CHIL line twice (both people were children of the family) is kept once
      if (c.tag !== "CHIL" && c.tag !== "FAMS" && c.tag !== "FAMC") return true;
      const key = `${c.tag} ${c.value.trim()}`;
      return !seen.has(key) && !!seen.add(key);
    });
  return rewritten(rec, children);
};

/**
 * The record list with `drop` merged into `keep`: the kept person gets the picked values and the rows of both,
 * every family and association that pointed to the removed person points to the kept one, and the removed record is gone.
 * Throws when the two cannot be merged (see `mergeBlocker`).
 */
export function mergePeople(records: GedNode[], keep: string, drop: string, pick: MergePick = {}): GedNode[] {
  if (mergeBlocker(records, keep, drop)) throw new Error("these two people cannot be merged");
  const a = records.find((r) => r.xref === keep), b = records.find((r) => r.xref === drop);
  if (!a || !b) throw new Error("person not found");
  const fa = personFields(a);
  const fb = personFields(b);
  fb.associations = fb.associations.filter((x) => x.id !== keep);
  let merged = carryLines(applyPerson(a, fa, mergedFields(fa, fb, pick)), b);
  // the families the removed person was a spouse in
  for (const fam of pointers(b, ["FAMS"])) {
    if (!pointers(merged, ["FAMS"]).includes(fam)) merged = addLine(merged, "FAMS", fam);
  }
  // the kept person's own lines that named the removed person would point to themselves
  merged = rewritten(merged, merged.children.filter((c) => !(["ASSO", "ALIA"].includes(c.tag) && c.value.trim() === drop)));
  return records.filter((r) => r !== b).map((r) => {
    if (r === a) return merged;
    if (r.tag === "FAM") return repoint(r, ["HUSB", "WIFE", "CHIL"], drop, keep);
    if (r.tag === "INDI") {
      return repoint(r, ["ASSO", "ALIA"], drop, keep);
    }
    return r;
  });
}
