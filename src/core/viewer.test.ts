/** Showing a file must never change it: every line, known tag or not, is written back as it was. */

import { describe, expect, test } from "vitest";
import {
  applyFamily, applyPerson, associationsOf, familyFields, inboundAssociations, nameDetails, parseGedcom,
  personAttributes, personFields, readRecords, recordInfo, timeline, writeGedcom,
} from "./index";

// a made-up file with every tag the detail shows, and lines Arbora does not know
const FILE = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Ota /Brandt/
2 NPFX Dr.
2 NICK Otty
2 _RUFNAME Ota
2 _SPECIAL kept as it is
1 NAME Ota /Lake/
2 TYPE married
1 SEX M
1 BIRT
2 DATE 7 APR 1900
2 PLAC Greenfield
3 MAP
4 LATI N48.5
4 LONG E16.25
2 SOUR Parish register
3 PAGE p. 12
1 CHR
2 DATE 15 APR 1900
1 CONF
2 DATE 1912
2 _FUTURE tag
1 RESI
2 DATE 1921
2 PLAC Springfield
1 IMMI
2 DATE 1925
2 AGNC Port office
1 EVEN
2 TYPE Medal of merit
2 DATE 1950
2 NOTE Invented demo note.
1 EDUC Teacher training
2 DATE 1920
1 NATI Fictionian
1 TITL Professor
1 ASSO @I3@
2 RELA godparent
1 _CUSTOM value with  inner spaces
2 CONT second line
1 FAMS @F1@
1 DEAT
2 DATE 1978
2 CAUS Old age
1 OBJE
2 FILE photo.jpg
3 TITL Portrait
1 REFN 42
2 TYPE own
1 RIN 7
1 _UID ABC-123
1 CHAN
2 DATE 2 JAN 2020
3 TIME 10:20:30
0 @I2@ INDI
1 NAME Mia /Lind/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Pia /Moss/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 ENGA
2 DATE 1925
1 MARR
2 DATE 1926
1 _WITN @I3@
1 DIV Y
2 DATE 1935
1 _FAMCUSTOM x
0 TRLR
`;

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
