/**
 * A basic check of a GEDCOM file: the header and trailer, IDs and the links
 * between people and families, the form of dates, and dates that cannot be true.
 */

import { isoToGedcom, monthOf, validDateValue } from "./date";
import { addLine, mainNameParts } from "./edit";
import { childOf, gedNode, rewritten, type GedNode } from "./gedcom";

export type IssueKind =
  | "noHead" | "noTrlr" | "dupId" | "missingRef" | "oneWay" | "badDate"
  | "deathBeforeBirth" | "beforeParent" | "parentYoung" | "afterMother" | "afterFather" | "spouseSex" | "oddGiven";

export interface Issue {
  kind: IssueKind;
  /** an error breaks the file for other programs; a warning is most likely a mistake in the data */
  level: "error" | "warn";
  /** the person the issue is about, to jump to; families point at a spouse or child */
  person: string | null;
  /** values for the message: id, tag, value, other (another person's ID) */
  args: Record<string, string>;
  /** `fixIssue` can repair it */
  fixable: boolean;
}

/** A date to compare: year, month and day (0 when unknown); `rough` for about-dates. Null for vague ones. */
interface When { y: number; m: number; d: number; rough: boolean }

function when(value: string): When | null {
  const s = value.trim().toUpperCase();
  if (!validDateValue(s) || /^(BEF|AFT|BET|FROM|TO|INT|\(|@#D)/.test(s)) return null;
  const rough = /^(ABT|CAL|EST) /.test(s);
  const m = /(?:(\d{1,2}) )?(?:([A-Z]{3}) )?(\d{3,4})$/.exec(s.replace(/^(ABT|CAL|EST) /, ""));
  if (!m) return null;
  return { y: +m[3], m: m[2] ? monthOf(m[2]) : 0, d: m[1] ? +m[1] : 0, rough };
}

/** a surely before b; rough dates count only when they are years apart */
function before(a: When, b: When): boolean {
  if (a.rough || b.rough) return a.y + 2 < b.y;
  if (a.y !== b.y) return a.y < b.y;
  if (!a.m || !b.m || a.m !== b.m) return a.m > 0 && b.m > 0 && a.m < b.m;
  return a.d > 0 && b.d > 0 && a.d < b.d;
}

const eventDate = (rec: GedNode, tag: string) => {
  const d = childOf(rec, tag) && childOf(childOf(rec, tag)!, "DATE");
  return d ? when(d.value) : null;
};

const plusYears = (w: When, n: number): When => ({ ...w, y: w.y + n });

/** All dates in a record and its sub-records, with the tag of the event they belong to. */
function dates(node: GedNode, parent: string, out: [string, string][] = []): [string, string][] {
  for (const c of node.children) {
    if (c.tag === "DATE") out.push([parent, c.value]);
    else dates(c, c.tag, out);
  }
  return out;
}

export function checkGedcom(records: GedNode[]): Issue[] {
  const issues: Issue[] = [];
  const add = (kind: IssueKind, level: Issue["level"], person: string | null, args: Record<string, string> = {}) =>
    issues.push({ kind, level, person, args, fixable: false });

  if (records[0]?.tag !== "HEAD") add("noHead", "error", null);
  if (records[records.length - 1]?.tag !== "TRLR") add("noTrlr", "error", null);

  const byId = new Map<string, GedNode>();
  for (const r of records) {
    if (!r.xref) continue;
    if (byId.has(r.xref)) add("dupId", "error", r.tag === "INDI" ? r.xref : null, { id: r.xref });
    else byId.set(r.xref, r);
  }
  const people = records.filter((r) => r.tag === "INDI" && r.xref && byId.get(r.xref) === r);
  const families = records.filter((r) => r.tag === "FAM" && r.xref && byId.get(r.xref) === r);
  const isA = (id: string, tag: string) => byId.get(id)?.tag === tag;
  const links = (r: GedNode, tag: string) => r.children.filter((c) => c.tag === tag).map((c) => c.value);
  const familyPerson = (f: GedNode) => links(f, "HUSB")[0] || links(f, "WIFE")[0] || links(f, "CHIL")[0] || null;

  // links that point nowhere, and links the other side does not know about
  for (const p of people) {
    for (const tag of ["FAMC", "FAMS"]) {
      for (const fid of links(p, tag)) {
        if (!isA(fid, "FAM")) { add("missingRef", "error", p.xref, { id: p.xref!, tag, value: fid }); continue; }
        const back = tag === "FAMC" ? links(byId.get(fid)!, "CHIL") : [...links(byId.get(fid)!, "HUSB"),
                                                                         ...links(byId.get(fid)!, "WIFE")];
        if (!back.includes(p.xref!)) add("oneWay", "warn", p.xref, { id: p.xref!, tag, value: fid });
      }
    }
  }
  for (const f of families) {
    for (const tag of ["HUSB", "WIFE", "CHIL"]) {
      for (const pid of links(f, tag)) {
        if (!isA(pid, "INDI")) { add("missingRef", "error", familyPerson(f), { id: f.xref!, tag, value: pid }); continue; }
        if (!links(byId.get(pid)!, tag === "CHIL" ? "FAMC" : "FAMS").includes(f.xref!)) {
          add("oneWay", "warn", pid, { id: f.xref!, tag, value: pid });
        }
      }
    }
    for (const [tag, sex] of [["HUSB", "F"], ["WIFE", "M"]]) {
      const pid = links(f, tag)[0];
      const s = pid && isA(pid, "INDI") ? childOf(byId.get(pid)!, "SEX")?.value.toUpperCase() : "";
      if (s === sex) add("spouseSex", "warn", pid, { id: pid, tag, value: f.xref! });
    }
  }

  // given names with digits, unusual characters or a lowercase start
  for (const p of people) {
    const { given } = mainNameParts(p);
    if (given && (/[^\p{L}\p{M} '’.,()?-]/u.test(given) || /^\p{Ll}/u.test(given))) {
      add("oddGiven", "warn", p.xref, { id: p.xref!, value: given });
    }
  }

  // dates GEDCOM does not understand
  for (const r of [...people, ...families]) {
    for (const [tag, value] of dates(r, r.tag)) {
      if (!validDateValue(value)) {
        add("badDate", "warn", r.tag === "INDI" ? r.xref : familyPerson(r), { id: r.xref!, tag, value });
      }
    }
  }

  // dates that cannot be true
  const birth = (id: string | undefined) => (id && isA(id, "INDI") ? eventDate(byId.get(id)!, "BIRT") : null);
  const death = (id: string | undefined) => (id && isA(id, "INDI") ? eventDate(byId.get(id)!, "DEAT") : null);
  for (const p of people) {
    const b = birth(p.xref!), d = death(p.xref!);
    if (b && d && before(d, b)) add("deathBeforeBirth", "warn", p.xref, { id: p.xref! });
  }
  for (const f of families) {
    const father = links(f, "HUSB")[0], mother = links(f, "WIFE")[0];
    for (const c of links(f, "CHIL")) {
      const cb = birth(c);
      if (!cb) continue;
      for (const parent of [father, mother]) {
        const pb = birth(parent);
        if (!pb) continue;
        if (before(cb, pb)) add("beforeParent", "warn", c, { id: c, other: parent });
        else if (before(cb, plusYears(pb, 12))) add("parentYoung", "warn", c, { id: c, other: parent });
      }
      const md = death(mother), fd = death(father);
      if (md && before(md, cb)) add("afterMother", "warn", c, { id: c, other: mother });
      if (fd && before(plusYears(fd, 1), cb)) add("afterFather", "warn", c, { id: c, other: father });
    }
  }
  // whether each one can be fixed, without building the fixed file for each
  const at = indexOf(records);
  for (const i of issues) i.fixable = changes(records, repair(records, i, at));
  return issues;
}

const without = (rec: GedNode, drop: (c: GedNode) => boolean): GedNode =>
  rewritten(rec, rec.children.filter((c) => !drop(c)));

/** dates in the record (any depth) under events with the tag, set from `from` to `to` */
function setDates(node: GedNode, tag: string, from: string, to: string): GedNode {
  let changed = false;
  const children = node.children.map((c) => {
    if (c.tag === "DATE" && node.tag === tag && c.value === from) { changed = true; return { ...c, value: to }; }
    const next = c.children.length ? setDates(c, tag, from, to) : c;
    if (next !== c) changed = true;
    return next;
  });
  return changed ? rewritten(node, children) : node;
}

/** One repair: a record replaced at an index, or a new one at the start or the end. */
type Repair = { at: number; rec: GedNode } | { add: "start" | "end"; rec: GedNode };

/** Index of the (first) record with each ID. */
function indexOf(records: GedNode[]): (id: string) => number {
  const index = new Map<string, number>();
  records.forEach((r, i) => { if (r.xref && !index.has(r.xref)) index.set(r.xref, i); });
  return (id) => index.get(id) ?? -1;
}

/** How to repair one issue, or null when it cannot be done safely. */
function repair(records: GedNode[], issue: Issue, at: (id: string) => number): Repair | null {
  const a = issue.args;
  switch (issue.kind) {
    case "noHead":
      return { add: "start", rec: gedNode("HEAD", "", [
        gedNode("GEDC", "", [gedNode("VERS", "5.5.1"), gedNode("FORM", "LINEAGE-LINKED")]), gedNode("CHAR", "UTF-8")]) };
    case "noTrlr":
      return { add: "end", rec: gedNode("TRLR") };
    case "missingRef": {
      const i = at(a.id);
      return i < 0 ? null : { at: i, rec: without(records[i], (c) => c.tag === a.tag && c.value === a.value) };
    }
    case "oneWay": {
      // a person's FAMC/FAMS: the family gets CHIL, HUSB or WIFE
      if (a.tag === "FAMC" || a.tag === "FAMS") {
        const i = at(a.value), p = records[at(a.id)];
        if (i < 0 || !p) return null;
        const sex = p.children.find((c) => c.tag === "SEX")?.value.toUpperCase();
        const role = a.tag === "FAMC" ? "CHIL" : sex === "M" ? "HUSB" : sex === "F" ? "WIFE" : "";
        if (!role || role !== "CHIL" && records[i].children.some((c) => c.tag === role)) return null;
        return { at: i, rec: addLine(records[i], role, a.id) };
      }
      // a family's HUSB/WIFE/CHIL: the person gets FAMS or FAMC
      const i = at(a.value);
      return i < 0 ? null : { at: i, rec: addLine(records[i], a.tag === "CHIL" ? "FAMC" : "FAMS", a.id) };
    }
    case "badDate": {
      const fixed = isoToGedcom(a.value);
      const i = at(a.id);
      if (fixed === a.value || !validDateValue(fixed) || i < 0) return null;
      return { at: i, rec: setDates(records[i], a.tag, a.value, fixed.toUpperCase()) };
    }
    default:
      return null;
  }
}

/** A repair that changes nothing is no repair. */
const changes = (records: GedNode[], r: Repair | null): r is Repair => !!r && !("at" in r && r.rec === records[r.at]);

/**
 * The records with one issue repaired, or the same array when it cannot be done
 * safely: a missing header or trailer is added, a link to nothing removed, a missing
 * link back added, and a date like 1885-12-12 rewritten as 12 DEC 1885.
 */
export function fixIssue(records: GedNode[], issue: Issue): GedNode[] {
  const r = repair(records, issue, indexOf(records));
  if (!changes(records, r)) return records;
  if ("add" in r) return r.add === "start" ? [r.rec, ...records] : [...records, r.rec];
  return records.map((rec, j) => (j === r.at ? r.rec : rec));
}
