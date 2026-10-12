/** Showing a file must never change it: every line, known tag or not, is written back as it was. */

import { describe, expect, test } from "vitest";
import { RICH_GED } from "./fixtures/rich";
import {
  applyFamily, applyPerson, associationsOf, familyFields, inboundAssociations, nameDetails, parseGedcom,
  personAttributes, personFields, readRecords, recordInfo, timeline, writeGedcom,
} from "./index";

const FILE = RICH_GED;

describe("showing a file", () => {
  const records = parseGedcom(FILE);
  const rec = records[1];
  const lookup = (x: string) => records.find((r) => r.xref === x);

  test("the file is written back as it was", () => {
    expect(writeGedcom(records)).toBe(FILE);
  });

  test("reading everything the detail shows does not change a record", () => {
    const data = readRecords(records);
    for (const r of records.filter((x) => x.tag === "INDI")) {
      const fields = personFields(r);
      timeline(data, r.xref!, fields, r, lookup);
      personAttributes(r); nameDetails(r); associationsOf(r); recordInfo(r);
    }
    inboundAssociations(records);
    expect(writeGedcom(records)).toBe(FILE);
  });

  test("changing a person changes only the lines of what was changed", () => {
    const before = personFields(rec);
    const changed = applyPerson(rec, before, { ...before, birth: { date: "8 APR 1900", place: "Greenfield" } });
    const after = writeGedcom(records.map((r) => (r === rec ? changed : r))).split("\n");
    const original = FILE.split("\n");
    const lost = original.filter((l) => !after.includes(l));
    expect(lost).toEqual(["2 DATE 7 APR 1900"]);
    expect(after.length).toBe(original.length);
  });

  test("renaming a person keeps their other lines, and changing back restores the file", () => {
    const before = personFields(rec);
    const changed = applyPerson(rec, before, { ...before, given: "Otto", surname: "Brant" });
    const lines = writeGedcom([changed]);
    for (const keep of ["2 NPFX Dr.", "2 _SPECIAL kept as it is", "1 ASSO @I3@", "1 _CUSTOM value with  inner spaces",
                        "2 CONT second line", "1 OBJE", "2 FILE photo.jpg", "3 TITL Portrait", "1 CHAN", "1 _UID ABC-123"]) {
      expect(lines).toContain(keep);
    }
    const back = applyPerson(changed, personFields(changed), before);
    expect(writeGedcom(records.map((r) => (r === rec ? back : r)))).toBe(FILE);
  });

  test("changing a family keeps the witnesses, the engagement and unknown lines", () => {
    const fam = records.find((r) => r.xref === "@F1@")!;
    const before = familyFields(fam);
    const changed = applyFamily(fam, before, { ...before, marriage: { date: "1927", place: "" } });
    const lines = writeGedcom([changed]);
    for (const keep of ["1 ENGA", "2 DATE 1925", "1 _WITN @I3@", "1 DIV Y", "2 DATE 1935", "1 _FAMCUSTOM x"]) {
      expect(lines).toContain(keep);
    }
    const back = applyFamily(changed, familyFields(changed), before);
    expect(writeGedcom(records.map((r) => (r === fam ? back : r)))).toBe(FILE);
  });
});

describe("technical lines", () => {
  test("changed, reference, record id, unique id and media", () => {
    expect(recordInfo(parseGedcom(FILE)[1])).toEqual([
      { key: "media", value: "photo.jpg (Portrait)" },
      { key: "reference", value: "42 (own)" },
      { key: "recordId", value: "7" },
      { key: "uid", value: "ABC-123" },
      { key: "changed", value: "2 JAN 2020 10:20:30" },
    ]);
  });

  test("a record without them has none", () => {
    expect(recordInfo(parseGedcom(FILE)[2])).toEqual([]);
  });
});
