import { describe, expect, test } from "vitest";
import {
  addFamily, addPerson, applyPerson, checkGedcom, chartRows, readRecords, deleteFamily, deletePerson, lineEnding, mergeBlocker, mergePeople, parseGedcom, personFields,
  writeGedcom, type GedNode,
} from "./index";

/** a small deterministic random generator, so a failure can be repeated */
function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const LONG_NOTE = `${"Lorem ipsum dolor sit amet, ".repeat(9)}\n  indented line, trailing blanks   `;
const GIVEN = ["Adam", "Eva", "Karel", "Jana", "Petr", "Marie", "Jan", "Anna"];

/** A made-up file: families of up to three children, a note that is split over CONC lines, one person nobody touches. */
function generated(rand: () => number, eol: string): string {
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

/** the errors that break a file for other programs, as text */
const errors = (records: GedNode[]) => checkGedcom(records).filter((i) => i.level === "error").map((i) => `${i.kind} ${JSON.stringify(i.args)}`);

describe("editing keeps the file consistent", () => {
  for (const eol of ["\n", "\r\n"]) {
    test(`a long run of random edits (${JSON.stringify(eol)}) never breaks a pointer and writes back stably`, () => {
      const rand = random(7);
      const text = generated(rand, eol);
      let records = parseGedcom(text);
      expect(errors(records)).toEqual([]);
      expect(writeGedcom(records, lineEnding(text))).toBe(text);
      const sentinel = writeGedcom(records.filter((r) => r.xref === "@I61@"), eol);

      const ids = () => records.filter((r) => r.tag === "INDI" && r.xref !== "@I61@").map((r) => r.xref!);
      const families = () => records.filter((r) => r.tag === "FAM").map((r) => r.xref!);
      const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
      const log: string[] = [];
      const unstable: number[] = [];

      for (let step = 0; step < 250; step++) {
        const people = ids();
        const op = Math.floor(rand() * 7);
        const a = pick(people), b = pick(people);
        if (op === 0) { records = addPerson(records, pick(["M", "F", ""])).records; log.push("addPerson"); }
        else if (op === 1) { records = addFamily(records, a, { spouse: b !== a ? b : undefined, children: [pick(people)].filter((c) => c !== a && c !== b) }).records; log.push(`addFamily ${a} ${b}`); }
        else if (op === 2 && families().length) { const f = pick(families()); records = deleteFamily(records, f); log.push(`deleteFamily ${f}`); }
        else if (op === 3 && people.length > 20) { records = deletePerson(records, a); log.push(`deletePerson ${a}`); }
        else if (op === 4 && a !== b && !mergeBlocker(records, a, b)) { records = mergePeople(records, a, b); log.push(`merge ${a} ${b}`); }
        else if (op >= 5) {
          const rec = records.find((r) => r.xref === a)!;
          const f = personFields(rec);
          const next = applyPerson(rec, f, { ...f, given: `${pick(GIVEN)}${step}`, note: step % 2 ? "x".repeat(300) : "a\nb" });
          records = records.map((r) => (r === rec ? next : r));
          log.push(`edit ${a}`);
        }
        const found = errors(records);
        if (found.length) throw new Error(`step ${step} (${log.at(-1)}) broke the file: ${found.slice(0, 3).join("; ")}`);
        // what is written parses back to the same text
        if (step % 25 === 0) {
          const again = writeGedcom(records, eol);
          if (writeGedcom(parseGedcom(again), eol) !== again) unstable.push(step);
        }
      }
      expect(unstable).toEqual([]);
      const written = writeGedcom(records, eol);
      expect(writeGedcom(parseGedcom(written), eol)).toBe(written);
      // the person nobody touched is byte for byte what it was, long note and spaces included
      expect(writeGedcom(parseGedcom(written).filter((r) => r.xref === "@I61@"), eol)).toBe(sentinel);
      // the run really did all kinds of edits
      for (const kind of ["addPerson", "addFamily", "deleteFamily", "deletePerson", "merge", "edit"]) expect(log.some((l) => l.startsWith(kind))).toBe(true);
    });
  }

  test("a long note is kept as it was written when another field of the person changes", () => {
    const text = ["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/", "1 NOTE " + LONG_NOTE.slice(0, 90), "2 CONC " + LONG_NOTE.slice(90, 180), "2 CONT " + LONG_NOTE.split("\n")[1], "0 TRLR", ""].join("\n");
    const rec = parseGedcom(text)[1];
    const f = personFields(rec);
    const out = writeGedcom([applyPerson(rec, f, { ...f, given: "Karel" })]);
    expect(out).toContain(text.split("\n").slice(3, 6).join("\n"));
    expect(out).toContain("trailing blanks   \n");
  });

  test("a loop made in the form (a person as their own ancestor) does not hang the charts", () => {
    const text = ["0 HEAD", "0 @I1@ INDI", "1 NAME A /X/", "1 FAMS @F1@", "1 FAMC @F2@", "0 @I2@ INDI", "1 NAME B /X/", "1 FAMS @F2@", "1 FAMC @F1@",
      "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I1@", "0 TRLR", ""].join("\n");
    const data = readRecords(parseGedcom(text));
    expect(chartRows(data, "@I1@", { chart: "ancestors", generations: 0 }).length).toBeLessThan(10);
    expect(chartRows(data, "@I1@", { chart: "descendants", generations: 0 }).length).toBeLessThan(10);
  });
});
