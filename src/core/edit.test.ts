import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyFamily, applyPerson, dateInput, decode, familyFields, lineEnding, parseDate, parseGedcom, personFields,
  readRecords, writeGedcom, type GedNode, type PersonFields,
} from "./index";

// fictional sample data shipped with the site
const sampleText = decode(readFileSync(new URL("../../public/ukazka.ged", import.meta.url)));

const record = (records: GedNode[], xref: string) => records.find((r) => r.xref === xref)!;
const edit = (ged: string, xref: string, change: (f: PersonFields) => Partial<PersonFields>) => {
  const records = parseGedcom(ged);
  const rec = record(records, xref);
  const before = personFields(rec);
  const after = applyPerson(rec, before, { ...before, ...change(before) });
  return writeGedcom(records.map((r) => (r === rec ? after : r)));
};

const PERSON = [
  "0 @I1@ INDI",
  "1 NAME Ján /Kováč/ ml.",
  "2 GIVN Ján",
  "2 SURN Kováč",
  "1 SEX M",
  "1 BIRT",
  "2 DATE 3 MAR 1850",
  "2 SOUR @S1@",
  "3 PAGE s. 12",
  "2 NOTE zápis v matrike",
  "1 _UID 1234",
  "1 OCCU roľník",
  "1 FAMS @F1@",
  "0 TRLR",
].join("\n") + "\n";

describe("writing GEDCOM", () => {
  test("an unchanged file is written back byte for byte", () => {
    expect(writeGedcom(parseGedcom(sampleText), lineEnding(sampleText))).toBe(sampleText);
    const crlf = PERSON.replace(/\n/g, "\r\n");
    expect(writeGedcom(parseGedcom(crlf), lineEnding(crlf))).toBe(crlf);
  });

  test("an edited record keeps the tags the app does not know", () => {
    const out = edit(PERSON, "@I1@", () => ({ given: "Jozef", birth: { date: "4 MAR 1850", place: "Lieskovec" } }));
    expect(out).toBe([
      "0 @I1@ INDI",
      "1 NAME Jozef /Kováč/ ml.",
      "2 GIVN Jozef",
      "2 SURN Kováč",
      "1 SEX M",
      "1 BIRT",
      "2 DATE 4 MAR 1850",
      "2 PLAC Lieskovec",
      "2 SOUR @S1@",
      "3 PAGE s. 12",
      "2 NOTE zápis v matrike",
      "1 _UID 1234",
      "1 OCCU roľník",
      "1 FAMS @F1@",
      "0 TRLR",
    ].join("\n") + "\n");
  });

  test("nothing changed, same record", () => {
    const rec = parseGedcom(PERSON)[0];
    expect(applyPerson(rec, personFields(rec), personFields(rec))).toBe(rec);
  });

  test("new events, occupations and a note go to their places", () => {
    const out = edit(PERSON, "@I1@", () => ({
      death: { date: "1901", place: "" }, occupation: "roľník, kováč", note: "prvý riadok\ndruhý",
      sex: "",
    }));
    expect(out).not.toContain("1 SEX");
    expect(out).toContain("1 _UID 1234\n1 DEAT\n2 DATE 1901\n1 OCCU roľník\n1 OCCU kováč\n" +
                          "1 NOTE prvý riadok\n2 CONT druhý\n1 FAMS @F1@");
    const p = readRecords(parseGedcom(out)).people["@I1@"];
    expect(p).toMatchObject({ occupation: "roľník, kováč", death: { date: "1901", place: "" } });
  });

  test("clearing an event removes only what is empty", () => {
    const out = edit(PERSON, "@I1@", () => ({ birth: { date: "", place: "" }, occupation: "" }));
    expect(out).toContain("1 BIRT\n2 SOUR @S1@");
    expect(out).not.toContain("OCCU");
    const bare = edit("0 @I2@ INDI\n1 DEAT\n2 DATE 1900\n", "@I2@", () => ({ death: { date: "", place: "" } }));
    expect(bare).toBe("0 @I2@ INDI\n");
  });

  test("names without slashes and empty names", () => {
    expect(edit("0 @I1@ INDI\n1 NAME Anna //\n", "@I1@", () => ({ surname: "Nová" })))
      .toBe("0 @I1@ INDI\n1 NAME Anna /Nová/\n");
    expect(edit("0 @I1@ INDI\n1 SEX F\n", "@I1@", () => ({ given: "Eva", surname: "Malá" })))
      .toBe("0 @I1@ INDI\n1 NAME Eva /Malá/\n2 GIVN Eva\n2 SURN Malá\n1 SEX F\n");
  });

  test("long notes continue on CONC lines and read back the same", () => {
    const text = "slovo ".repeat(100).trim() + "\nďalší riadok";
    const out = edit(PERSON, "@I1@", () => ({ note: text }));
    expect(out.split("\n").every((l) => l.length <= 255)).toBe(true);
    expect(out).toMatch(/\n2 CONC /);
    expect(personFields(parseGedcom(out)[0]).note).toBe(text);
  });

  test("the header says UTF-8 after a Windows-1250 file", () => {
    const out = writeGedcom(parseGedcom("0 HEAD\n1 CHAR ANSI\n0 TRLR\n"));
    expect(out).toBe("0 HEAD\n1 CHAR UTF-8\n0 TRLR\n");
  });

  test("marriage and divorce of a family", () => {
    const rec = parseGedcom("0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n")[0];
    const before = familyFields(rec);
    const after = applyFamily(rec, before, { marriage: { date: "12 MAY 1990", place: "Brezno" }, divorced: true });
    expect(writeGedcom([after])).toBe(
      "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 12 MAY 1990\n2 PLAC Brezno\n1 DIV Y\n1 CHIL @I3@\n");
    expect(readRecords([after]).families["@F1@"]).toMatchObject({ divorced: true });
    const back = applyFamily(after, familyFields(after), { ...familyFields(after), divorced: false });
    expect(writeGedcom([back])).not.toContain("DIV");
  });

  test("edited sample person shows in the people", () => {
    const records = parseGedcom(sampleText);
    const rec = record(records, "@I13@");
    const f = personFields(rec);
    expect(f).toMatchObject({ given: "Juraj", surname: "Sokol", sex: "M" });
    const changed = applyPerson(rec, f, { ...f, surname: "Sokolík" });
    expect(readRecords(records.map((r) => (r === rec ? changed : r))).people["@I13@"].name).toBe("Juraj Sokolík");
  });
});

describe("dates typed in the form", () => {
  test.each([
    ["14.5.1891", "14 MAY 1891"], ["14. 5. 1891", "14 MAY 1891"], ["5/1891", "MAY 1891"], ["1891", "1891"],
    ["1891-05-14", "14 MAY 1891"], ["14 may 1891", "14 MAY 1891"], ["abt 1890", "ABT 1890"],
    ["cca 1890", "ABT 1890"], ["~1890", "ABT 1890"], ["pred 2.1890", "BEF FEB 1890"], ["po 1890", "AFT 1890"],
    ["1890–1895", "BET 1890 AND 1895"], ["1890-1895", "BET 1890 AND 1895"], ["BET 1890 AND 1895", "BET 1890 AND 1895"],
    ["", ""], ["(podľa kroniky)", "(podľa kroniky)"],
  ])("%s → %s", (input, value) => {
    expect(parseDate(input, "sk")).toEqual({ value, ok: true });
  });

  test("qualifiers of other languages", () => {
    expect(parseDate("1890 előtt", "hu").value).toBe("BEF 1890");
    expect(parseDate("1891.05.14", "hu").value).toBe("14 MAY 1891");
    expect(parseDate("vor 1890", "de").value).toBe("BEF 1890");
  });

  test("anything else becomes a date phrase", () => {
    expect(parseDate("na Vianoce 1890", "sk")).toEqual({ value: "(na Vianoce 1890)", ok: false });
    expect(parseDate("31.13.1890", "sk").ok).toBe(false);
    expect(parseDate("14 mai 1891", "fr").ok).toBe(false);
  });

  test("stored dates show as the page writes them when they read back the same", () => {
    expect(dateInput("14 MAY 1891", "sk")).toBe("14.5.1891");
    expect(dateInput("ABT 1890", "sk")).toBe("cca 1890");
    expect(dateInput("EST 1890", "sk")).toBe("EST 1890");
    expect(dateInput("FROM 1890 TO 1895", "sk")).toBe("FROM 1890 TO 1895");
    expect(dateInput("14 MAY 1891", "fr")).toBe("14 MAY 1891");
  });
});
