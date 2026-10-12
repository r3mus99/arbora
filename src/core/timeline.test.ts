import { describe, expect, test } from "vitest";
import { dateParts, parseGedcom, personFields, readRecords, timeline, yearsBetween } from "./index";

describe("ages", () => {
  test.each([
    ["7 APR 1939", "OCT 1961", 22],
    ["7 APR 1939", "27 DEC 2021", 82],
    ["7 APR 1939", "6 APR 1960", 20],
    ["7 APR 1939", "APR 1960", 21],
    ["ABT 1900", "1950", 50],
    ["1939", "1938", null],
    ["(unknown)", "1950", null],
    ["", "1950", null],
  ])("%s → %s", (from, to, age) => {
    expect(yearsBetween(from, to)).toBe(age);
  });

  test("date parts", () => {
    expect(dateParts("14 MAY 1891")).toEqual({ y: 1891, m: 5, d: 14 });
    expect(dateParts("BET 1700 AND 1710")).toEqual({ y: 1700, m: 0, d: 0 });
    expect(dateParts("1891-05")).toEqual({ y: 1891, m: 5, d: 0 });
  });
});

// a made-up family
const GED = `0 HEAD
0 @I1@ INDI
1 NAME Adam /Novak/
1 SEX M
1 BIRT
2 DATE 7 APR 1900
2 PLAC Greenfield
1 DEAT
1 FAMS @F1@
1 FAMS @F2@
0 @I2@ INDI
1 NAME Berta /Lind/
1 FAMS @F1@
0 @I3@ INDI
1 NAME Cyril /Novak/
1 BIRT
2 DATE 1925
1 FAMC @F1@
0 @I4@ INDI
1 NAME Dora /Novak/
1 FAMC @F1@
0 @I5@ INDI
1 NAME Eva /Moss/
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE OCT 1922
1 DIV Y
1 CHIL @I3@
1 CHIL @I4@
0 @F2@ FAM
1 HUSB @I1@
1 WIFE @I5@
1 MARR
2 DATE 1930
0 TRLR
`;

test("a life in date order, undated events after the one before them", () => {
  const records = parseGedcom(GED);
  const data = readRecords(records);
  const rec = records.find((r) => r.xref === "@I1@")!;
  const items = timeline(data, "@I1@", personFields(rec));
  expect(items.map((i) => [i.kind, i.date, i.age, i.other])).toEqual([
    ["birth", "7 APR 1900", null, null],
    ["marriage", "OCT 1922", 22, "@I2@"],
    ["child", "1925", 25, "@I3@"],
    ["child", "", null, "@I4@"],
    ["marriage", "1930", 30, "@I5@"],
    ["death", "", null, null],
  ]);
  expect(items[0].place).toBe("Greenfield");
  expect(items[1].divorced).toBe(true);
  expect(timeline(data, "@I3@", null).map((i) => i.kind)).toEqual(["birth"]);
});
