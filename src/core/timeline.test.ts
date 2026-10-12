import { describe, expect, test } from "vitest";
import { dateParts, parseGedcom, personAttributes, personFields, readRecords, timeline, yearsBetween } from "./index";

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

test("undated death goes after dated events, even when children are listed out of order", () => {
  const ged = `0 HEAD
0 @I1@ INDI
1 NAME Hugo /Brandt/
1 BIRT
2 DATE 1820
1 DEAT Y
1 FAMS @F1@
0 @I2@ INDI
1 NAME Ida /Fox/
1 FAMS @F1@
${[1862, 1849, 1888, 1855].map((y, n) => `0 @C${n}@ INDI\n1 NAME Kid${n} /Brandt/\n1 BIRT\n2 DATE ${y}\n1 FAMC @F1@`).join("\n")}
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 1845
${[0, 1, 2, 3].map((n) => `1 CHIL @C${n}@`).join("\n")}
0 TRLR
`;
  const records = parseGedcom(ged);
  const data = readRecords(records);
  const fields = personFields(records.find((r) => r.xref === "@I1@")!);
  const kinds = timeline(data, "@I1@", fields).map((i) => i.kind);
  expect(kinds).toEqual(["birth", "marriage", "child", "child", "child", "child", "death"]);
  // undated burial after an undated death, dated burial after both
  fields.burial = { ...fields.burial, place: "Greenfield" };
  expect(timeline(data, "@I1@", fields).map((i) => i.kind).slice(-2)).toEqual(["death", "burial"]);
});

describe("residences and custom events", () => {
  const ged = `0 HEAD
0 @I1@ INDI
1 NAME Ota /Brandt/
1 BIRT
2 DATE 1900
1 RESI
2 DATE 1930
2 PLAC Springfield, Ohio
1 RESI Mill Road 4
2 PLAC Greenfield
1 EVEN
2 TYPE Immigration
2 DATE 1925
2 PLAC Harbor
2 NOTE Arrived by ship.
1 EVEN military
1 RESI
2 NOTE Nothing but a note.
1 EVEN
0 TRLR
`;
  const records = parseGedcom(ged);
  const data = readRecords(records);
  const rec = records.find((r) => r.xref === "@I1@")!;
  const items = timeline(data, "@I1@", personFields(rec), rec);

  test("are listed in date order with their title, detail and place", () => {
    expect(items.map((i) => [i.kind, i.date, i.place, i.title || "", i.detail || ""])).toEqual([
      ["birth", "1900", "", "", ""],
      ["event", "1925", "Harbor", "Immigration", ""],
      ["residence", "1930", "Springfield, Ohio", "", ""],
      ["residence", "", "Greenfield", "", "Mill Road 4"],
      ["event", "", "", "military", ""],
      ["residence", "", "", "", ""],
    ]);
    expect(items[1].age).toBe(25);
  });

  test("keep their line, so its notes can be read; empty lines are skipped", () => {
    expect(items[1].node?.tag).toBe("EVEN");
    expect(items.filter((i) => i.node).length).toBe(5);
  });

  test("without the record, nothing but the usual events", () => {
    expect(timeline(data, "@I1@", personFields(rec)).map((i) => i.kind)).toEqual(["birth"]);
  });
});

describe("more events and attributes", () => {
  const ged = `0 HEAD
0 @I1@ INDI
1 NAME Ota /Brandt/
1 BIRT
2 DATE 1900
2 AGE 0
1 DEAT
2 DATE 1980
2 CAUS Old age
2 ADDR Hill Street 2
3 CONT Second floor
3 CITY Greenfield
1 IMMI
2 DATE 1925
2 PLAC Harbor
2 AGENCY ignored
2 AGNC Port office
1 CONF
1 EDUC Teacher training
2 DATE 1920
1 NATI
1 TITL Dr.
1 NCHI 3
1 TITL
0 TRLR
`;
  const records = parseGedcom(ged);
  const data = readRecords(records);
  const rec = records.find((r) => r.xref === "@I1@")!;
  const items = timeline(data, "@I1@", personFields(rec), rec);

  test("standard events are listed with their tag and details", () => {
    expect(items.map((i) => [i.kind, i.tag || "", i.date])).toEqual([
      ["birth", "", "1900"], ["event", "IMMI", "1925"], ["event", "CONF", ""], ["death", "", "1980"],
    ]);
    expect(items[1].details).toEqual([{ key: "agency", value: "Port office" }]);
  });

  test("age, cause and address are read from birth and death too", () => {
    expect(items[0].details).toEqual([{ key: "age", value: "0" }]);
    expect(items[3].details).toEqual([{ key: "cause", value: "Old age" },
                                      { key: "address", value: "Hill Street 2, Second floor, Greenfield" }]);
  });

  test("attributes with a value, date or place", () => {
    expect(personAttributes(rec).map((a) => [a.tag, a.value, a.date])).toEqual([
      ["EDUC", "Teacher training", "1920"], ["TITL", "Dr.", ""], ["NCHI", "3", ""],
    ]);
  });
});
