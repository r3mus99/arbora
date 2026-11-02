import { describe, expect, test } from "vitest";
import { dateParts, parseGedcom, personFields, readRecords, timeline, ageBetween, formatAge, weddingAges, yearsBetween } from "./index";

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

  test.each([
    ["7 APR 1939", "27 DEC 2021", { n: 82, unit: "y" }],
    ["7 APR 1939", "6 APR 1940", { n: 11, unit: "m" }],
    ["7 APR 1939", "7 JUN 1939", { n: 2, unit: "m" }],
    ["28 JAN 1939", "3 FEB 1939", { n: 6, unit: "d" }],
    ["28 FEB 1940", "1 MAR 1940", { n: 2, unit: "d" }], // leap year
    ["28 FEB 1939", "1 MAR 1939", { n: 1, unit: "d" }],
    ["12 MAR 1939", "12 MAR 1939", { n: 0, unit: "d" }],
    ["30 DEC 1938", "2 JAN 1939", { n: 3, unit: "d" }],
    ["APR 1939", "JUN 1939", { n: 2, unit: "m" }],
    ["APR 1939", "APR 1939", null], // same month, no days: cannot tell
    ["1939", "1939", null],
    ["12 MAR 1939", "1939", null],
    ["ABT 7 APR 1939", "9 APR 1939", null],
    ["7 APR 1939", "BEF 9 APR 1939", null],
    ["7 APR 1939", "6 APR 1939", null], // baptism before birth
    ["7 APR 1939", "7 MAR 1939", null],
    ["", "1939", null],
  ])("age %s → %s", (from, to, age) => {
    expect(ageBetween(from, to)).toEqual(age);
  });

  test("an age is written with the short units of a language", () => {
    const sk = { y: "r.", m: "mes.", d: "d." };
    expect(formatAge({ n: 79, unit: "y" }, sk)).toBe("79 r.");
    expect(formatAge({ n: 5, unit: "m" }, sk)).toBe("5 mes.");
    expect(formatAge({ n: 12, unit: "d" }, sk)).toBe("12 d.");
  });

  test("date parts", () => {
    expect(dateParts("14 MAY 1891")).toEqual({ y: 1891, m: 5, d: 14 });
    expect(dateParts("BET 1700 AND 1710")).toEqual({ y: 1700, m: 0, d: 0 });
    expect(dateParts("1891-05")).toEqual({ y: 1891, m: 5, d: 0 });
  });
});

test("wedding ages skip people without a known birth or name", () => {
  expect(weddingAges("OCT 1922", [{ name: "Adam", born: "7 APR 1900" }, { name: "Berta", born: "" }, { name: "", born: "1900" }]))
    .toEqual([{ name: "Adam", age: 22 }]);
  expect(weddingAges(undefined, [{ name: "Adam", born: "1900" }])).toEqual([]);
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
    ["marriage", "OCT 1922", { n: 22, unit: "y" }, "@I2@"],
    ["child", "1925", { n: 25, unit: "y" }, "@I3@"],
    ["child", "", null, "@I4@"],
    ["marriage", "1930", { n: 30, unit: "y" }, "@I5@"],
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

describe("residences", () => {
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

  test("are listed in date order with their detail and place; custom events are not", () => {
    expect(items.map((i) => [i.kind, i.date, i.place, i.detail || ""])).toEqual([
      ["birth", "1900", "", ""],
      ["residence", "1930", "Springfield, Ohio", ""],
      ["residence", "", "Greenfield", "Mill Road 4"],
      ["residence", "", "", ""],
    ]);
    expect(items[1].age).toEqual({ n: 30, unit: "y" });
  });

  test("keep their line, so its notes can be read; empty lines are skipped", () => {
    expect(items[1].node?.tag).toBe("RESI");
    expect(items.filter((i) => i.node).length).toBe(3);
  });

  test("without the record, nothing but the usual events", () => {
    expect(timeline(data, "@I1@", personFields(rec)).map((i) => i.kind)).toEqual(["birth"]);
  });
});

describe("details of the life events; other events and facts", () => {
  const ged = `0 HEAD
0 @I1@ INDI
1 NAME Ota /Brandt/
1 BIRT
2 DATE 1900
2 AGE 0
2 NOTE Born at home
1 DEAT
2 DATE 1980
2 CAUS Old age
2 NOTE @N1@
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

  test("events other than the life events and residences are not on the timeline", () => {
    expect(items.map((i) => [i.kind, i.date])).toEqual([["birth", "1900"], ["death", "1980"]]);
  });

  test("birth shows no age, cause or agency; death still shows cause and address", () => {
    expect(items[0].details).toBeUndefined();
    expect(items[1].details).toEqual([{ key: "cause", value: "Old age" },
                                      { key: "address", value: "Hill Street 2, Second floor, Greenfield" }]);
  });

  test("the text note of the birth is on the timeline; death, with a pointer to a NOTE record, has none", () => {
    expect(items[0].note).toBe("Born at home");
    expect(items[1].note).toBeUndefined();
  });
});

describe("family events", () => {
  const ged = `0 HEAD
0 @I1@ INDI
1 NAME Ota /Brandt/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Mia /Lind/
1 FAMS @F1@
0 @I3@ INDI
1 NAME Wit /One/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 ENGA
2 DATE 1920
1 MARR
2 DATE 1921
2 AGNC Town hall
1 _WITN @I3@
1 _WITN @I9@
1 DIV Y
1 EVEN
2 TYPE Separation
2 DATE 1930
2 NOTE A made-up note.
1 EVEN
0 TRLR
`;
  const records = parseGedcom(ged);
  const data = readRecords(records);
  const rec = records.find((r) => r.xref === "@I1@")!;
  const family = (x: string) => records.find((r) => r.xref === x);
  const items = timeline(data, "@I1@", personFields(rec), rec, family);

  test("engagement, marriage and other family events, with the spouse", () => {
    expect(items.map((i) => [i.kind, i.tag || i.title || "", i.date, i.other])).toEqual([
      ["famEvent", "ENGA", "1920", "@I2@"], ["marriage", "", "1921", "@I2@"],
      ["famEvent", "Separation", "1930", "@I2@"],
    ]);
  });

  test("witnesses that are people in the file, and marriage details", () => {
    expect(items[1].witnesses).toEqual(["@I3@"]);
    expect(items[1].details).toEqual([{ key: "agency", value: "Town hall" }]);
  });

  test("without family records, only the marriage", () => {
    expect(timeline(data, "@I1@", personFields(rec), rec).map((i) => i.kind)).toEqual(["marriage"]);
  });
});
