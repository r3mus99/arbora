/** Test files made up by a program: a deterministic random generator, a file of families, and random edits of it. */
import { addFamily, addPerson, deleteFamily, deletePerson, mergeBlocker, mergePeople, personFields, applyPerson } from "./index";
import type { GedNode } from "./gedcom";

/** a small deterministic random generator, so a failure can be repeated */
export function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export const LONG_NOTE = `${"Lorem ipsum dolor sit amet, ".repeat(9)}\n  indented line, trailing blanks   `;
const GIVEN = ["Adam", "Eva", "Karel", "Jana", "Petr", "Marie", "Jan", "Anna"];

/** A made-up file: families of up to three children, a note that is split over CONC lines, one person nobody touches. */
export function generated(rand: () => number, eol: string): string {
  const lines: string[] = ["0 HEAD", "1 CHAR UTF-8"];
  const people = 60;
  const parentsOf = (n: number) => (n < 6 ? null : Math.floor((n - 6) / 3));
  for (let i = 1; i <= people; i++) {
    lines.push(`0 @I${i}@ INDI`, `1 NAME ${GIVEN[Math.floor(rand() * GIVEN.length)]} /Test${i % 7}/`, `1 SEX ${i % 2 ? "M" : "F"}`);
    lines.push("1 BIRT", `2 DATE ${1800 + i}`);
    const fam = parentsOf(i - 1);
    if (fam !== null && fam < 18) lines.push(`1 FAMC @F${fam + 1}@`);
    if (i <= 36) lines.push(`1 FAMS @F${Math.ceil(i / 2)}@`);
  }
  lines.push("0 @I61@ INDI", "1 NAME Untouched /Sentinel/", "1 NOTE " + LONG_NOTE.slice(0, 90), "2 CONC " + LONG_NOTE.slice(90, 180), "2 CONT " + LONG_NOTE.split("\n")[1]);
  for (let f = 1; f <= 18; f++) {
    lines.push(`0 @F${f}@ FAM`, `1 HUSB @I${2 * f - 1}@`, `1 WIFE @I${2 * f}@`);
    for (let c = 0; c < 3; c++) if (f * 3 + 3 + c <= people) lines.push(`1 CHIL @I${f * 3 + 3 + c + 0}@`);
  }
  lines.push("0 TRLR");
  return lines.join(eol) + eol;
}


/** One random edit of the file (any person but the untouched @I61@): the records after it and a label saying what was done. */
export function randomEdit(records: GedNode[], rand: () => number, step: number): { records: GedNode[]; label: string } {
  const ids = records.filter((r) => r.tag === "INDI" && r.xref !== "@I61@").map((r) => r.xref!);
  const families = records.filter((r) => r.tag === "FAM").map((r) => r.xref!);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const op = Math.floor(rand() * 7);
  const a = pick(ids), b = pick(ids);
  if (op === 0) return { records: addPerson(records, pick(["M", "F", ""])).records, label: "addPerson" };
  if (op === 1) return { records: addFamily(records, a, { spouse: b !== a ? b : undefined, children: [pick(ids)].filter((c) => c !== a && c !== b) }).records, label: `addFamily ${a} ${b}` };
  if (op === 2 && families.length) { const f = pick(families); return { records: deleteFamily(records, f), label: `deleteFamily ${f}` }; }
  if (op === 3 && ids.length > 20) return { records: deletePerson(records, a), label: `deletePerson ${a}` };
  if (op === 4 && a !== b && !mergeBlocker(records, a, b)) return { records: mergePeople(records, a, b), label: `merge ${a} ${b}` };
  const rec = records.find((r) => r.xref === a)!;
  const f = personFields(rec);
  const next = applyPerson(rec, f, { ...f, given: `${pick(GIVEN)}${step}`, note: step % 2 ? "x".repeat(300) : "a\nb" });
  return { records: records.map((r) => (r === rec ? next : r)), label: `edit ${a}` };
}
