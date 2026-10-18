import { describe, expect, test } from "vitest";
import { applyPerson, checkGedcom, chartRows, lineEnding, parseGedcom, personFields, readRecords, writeGedcom, type GedNode } from "./index";
import { LONG_NOTE, generated, random, randomEdit } from "./generatedFile";

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

      const log: string[] = [];
      const unstable: number[] = [];

      for (let step = 0; step < 250; step++) {
        const made = randomEdit(records, rand, step);
        records = made.records;
        log.push(made.label);
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
