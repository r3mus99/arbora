import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyFamily, applyPerson, findPeople, matchedAka, suggestions, dateInput, decode, familyFields, lineEnding, parseDate, parseGedcom, personFields,
  LANGS, readRecords, writeGedcom, type GedNode, type PersonFields,
} from "./index";

// sample data shipped with the site: Habsburgs from Wikidata
const sampleText = decode(readFileSync(new URL("../../public/sample.ged", import.meta.url)));

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
    const out = edit(PERSON, "@I1@", (f) => ({
      death: { date: "1901", place: "" }, note: "prvý riadok\ndruhý",
      occupations: [f.occupations[0], { origin: -1, value: "kováč", date: "", place: "" }],
      sex: "",
    }));
    expect(out).not.toContain("1 SEX");
    expect(out).toContain("1 _UID 1234\n1 DEAT\n2 DATE 1901\n1 OCCU roľník\n1 OCCU kováč\n" +
                          "1 NOTE prvý riadok\n2 CONT druhý\n1 FAMS @F1@");
    const p = readRecords(parseGedcom(out)).people["@I1@"];
    expect(p).toMatchObject({ occupation: "roľník, kováč", death: { date: "1901", place: "" } });
  });

  test("clearing an event removes only what is empty", () => {
    const out = edit(PERSON, "@I1@", () => ({ birth: { date: "", place: "" }, occupations: [] }));
    expect(out).toContain("1 BIRT\n2 SOUR @S1@");
    expect(out).not.toContain("OCCU");
    const bare = edit("0 @I2@ INDI\n1 DEAT\n2 DATE 1900\n", "@I2@",
                      () => ({ death: { date: "", place: "" }, deceased: false }));
    expect(bare).toBe("0 @I2@ INDI\n");
  });

  test("deceased without details is DEAT Y; still ticked, a cleared death keeps it", () => {
    expect(personFields(parseGedcom("0 @I1@ INDI\n1 BURI\n2 PLAC Brezno\n")[0]).deceased).toBe(true);
    expect(personFields(parseGedcom("0 @I1@ INDI\n1 NAME Ján\n")[0]).deceased).toBe(false);
    const ticked = edit("0 @I1@ INDI\n1 NAME Ján\n1 FAMS @F1@\n", "@I1@", () => ({ deceased: true }));
    expect(ticked).toBe("0 @I1@ INDI\n1 NAME Ján\n1 DEAT Y\n1 FAMS @F1@\n");
    expect(edit(ticked, "@I1@", () => ({ deceased: false }))).toBe("0 @I1@ INDI\n1 NAME Ján\n1 FAMS @F1@\n");
    expect(edit("0 @I1@ INDI\n1 DEAT\n2 DATE 1900\n", "@I1@", () => ({ death: { date: "", place: "" } })))
      .toBe("0 @I1@ INDI\n1 DEAT Y\n");
    const dated = edit("0 @I1@ INDI\n", "@I1@", () => ({ deceased: true, death: { date: "1900", place: "" } }));
    expect(dated).toBe("0 @I1@ INDI\n1 DEAT\n2 DATE 1900\n");
  });

  test("occupations keep their own lines; removing one keeps the others' sources", () => {
    const ged = "0 @I1@ INDI\n1 OCCU roľník\n2 DATE 1900\n1 OCCU kováč, podkúvač\n2 SOUR @S1@\n1 OCCU mlynár\n";
    const rec = parseGedcom(ged)[0];
    const f = personFields(rec);
    expect(f.occupations.map((o) => o.value)).toEqual(["roľník", "kováč, podkúvač", "mlynár"]);
    const after = applyPerson(rec, f, { ...f, occupations: [
      f.occupations[1], { ...f.occupations[2], date: "1920", place: "Brezno" },
      { origin: -1, value: "richtár", date: "1930", place: "" },
    ] });
    expect(writeGedcom([after])).toBe("0 @I1@ INDI\n1 OCCU kováč, podkúvač\n2 SOUR @S1@\n1 OCCU mlynár\n2 DATE 1920\n" +
                                      "2 PLAC Brezno\n1 OCCU richtár\n2 DATE 1930\n");
  });

  test("religion is one RELI line", () => {
    const out = edit(PERSON, "@I1@", () => ({ religion: "rímskokatolícke" }));
    expect(out).toContain("1 OCCU roľník\n1 RELI rímskokatolícke\n1 FAMS @F1@");
    expect(readRecords(parseGedcom(out)).people["@I1@"].religion).toBe("rímskokatolícke");
    expect(edit(out, "@I1@", () => ({ religion: "" }))).not.toContain("RELI");
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
    const rec = record(records, "@I52@");
    const f = personFields(rec);
    expect(f).toMatchObject({ given: "František I.", surname: "", sex: "M" });
    const changed = applyPerson(rec, f, { ...f, surname: "Lotrinský" });
    expect(readRecords(records.map((r) => (r === rec ? changed : r))).people["@I52@"].name).toBe("František I. Lotrinský");
  });
});

test("surnames and places for suggestions", () => {
  const ged = "0 @I1@ INDI\n1 NAME Ján /Kováč/\n1 BIRT\n2 PLAC Brezno\n0 @I2@ INDI\n1 NAME Eva\n2 SURN Malá\n" +
              "1 DEAT\n2 PLAC Brezno\n0 @F1@ FAM\n1 MARR\n2 PLAC Ábelová\n";
  expect(suggestions(parseGedcom(ged))).toEqual({ surnames: ["Kováč", "Malá"], places: ["Ábelová", "Brezno"], religions: [] });
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

  test("month names of the language, as the page shows them", () => {
    expect(parseDate("Okt. 1961", "sk").value).toBe("OCT 1961");
    expect(parseDate("okt 1961", "sk").value).toBe("OCT 1961");
    expect(parseDate("pred Máj 1890", "sk").value).toBe("BEF MAY 1890");
    expect(parseDate("14 mai 1891", "fr").value).toBe("14 MAY 1891");
    expect(parseDate("1961. okt.", "hu").value).toBe("OCT 1961");
    for (const lang of LANGS) {
      for (const value of ["OCT 1961", "ABT MAY 1890", "14 DEC 1891"]) {
        expect(parseDate(dateInput(value, lang), lang).value, `${lang} ${value}`).toBe(value);
      }
    }
  });

  test("anything else becomes a date phrase", () => {
    expect(parseDate("na Vianoce 1890", "sk")).toEqual({ value: "(na Vianoce 1890)", ok: false });
    expect(parseDate("31.13.1890", "sk").ok).toBe(false);
    expect(parseDate("14 maj 1891", "fr").ok).toBe(false);
  });

  test("days a month does not have and INT without its phrase are not dates", () => {
    for (const input of ["31.2.1890", "30 FEB 1890", "31.4.1890", "INT 1890", "ABT 31 FEB 1890", "1890–31.2.1891"]) {
      expect(parseDate(input, "sk"), input).toMatchObject({ ok: false });
    }
    expect(parseDate("29.2.1888", "sk").value).toBe("29 FEB 1888");
    expect(parseDate("INT 1890 (podľa kroniky)", "sk")).toEqual({ value: "INT 1890 (podľa kroniky)", ok: true });
  });

  test("stored dates show as the page writes them when they read back the same", () => {
    expect(dateInput("14 MAY 1891", "sk")).toBe("14.5.1891");
    expect(dateInput("ABT 1890", "sk")).toBe("cca 1890");
    expect(dateInput("EST 1890", "sk")).toBe("EST 1890");
    expect(dateInput("FROM 1890 TO 1895", "sk")).toBe("FROM 1890 TO 1895");
    expect(dateInput("14 MAY 1891", "fr")).toBe("14 mai 1891");
  });

  test("a file saved by Arbora says so in its header", () => {
    const writer = { version: "1.0.0", date: new Date(2026, 9, 11, 13, 5, 9) };
    const old = "0 HEAD\n1 SOUR FTM\n2 VERS 9\n1 DEST ANY\n1 DATE 1 JAN 2000\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 TRLR\n";
    expect(writeGedcom(parseGedcom(old), "\n", writer)).toBe("0 HEAD\n1 SOUR ARBORA\n2 VERS 1.0.0\n2 NAME Arbora\n" +
      "1 DEST ANY\n1 DATE 11 OCT 2026\n2 TIME 13:05:09\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n0 TRLR\n");
    expect(writeGedcom(parseGedcom("0 HEAD\n1 CHAR UTF-8\n0 TRLR\n"), "\n", writer)).toBe("0 HEAD\n1 SOUR ARBORA\n" +
      "2 VERS 1.0.0\n2 NAME Arbora\n1 DATE 11 OCT 2026\n2 TIME 13:05:09\n1 CHAR UTF-8\n0 TRLR\n");
  });

  test("other forms of the name (NAME with TYPE aka)", () => {
    const ged = "0 @I1@ INDI\n1 NAME Ján /Pavlovský/\n1 NAME Ján /Pavlovszký/\n2 TYPE aka\n1 SEX M\n0 TRLR\n";
    const f = personFields(parseGedcom(ged)[0]);
    expect([f.given, f.surname]).toEqual(["Ján", "Pavlovský"]);
    expect(f.aliases).toEqual([{ origin: 0, given: "Ján", surname: "Pavlovszký" }]);
    // the main name stays the first NAME that is not an aka
    expect(readRecords(parseGedcom("0 @I1@ INDI\n1 NAME Jan /Pavlovszky/\n2 TYPE aka\n1 NAME Ján /Pavlovský/\n0 TRLR\n"))
      .people["@I1@"].name).toBe("Ján Pavlovský");
    expect(edit(ged, "@I1@", (b) => ({ aliases: [{ ...b.aliases[0], surname: "Paulovszky" },
                                                { origin: -1, given: "Johannes", surname: "Pavlovsky" }] })))
      .toContain("1 NAME Ján /Paulovszky/\n2 TYPE aka\n1 NAME Johannes /Pavlovsky/\n2 TYPE aka\n1 SEX M\n");
    expect(edit(ged, "@I1@", () => ({ aliases: [] }))).toBe("0 @I1@ INDI\n1 NAME Ján /Pavlovský/\n1 SEX M\n0 TRLR\n");
    expect(edit(ged, "@I1@", () => ({ surname: "Pavlovszký" })))
      .toContain("1 NAME Ján /Pavlovszký/\n1 NAME Ján /Pavlovszký/\n2 TYPE aka\n");
  });

  test("search finds people by other forms of the name too", () => {
    const people = readRecords(parseGedcom("0 @I1@ INDI\n1 NAME Ján /Pavlovský/\n1 NAME Johannes /Pavlovszky/\n2 TYPE aka\n" +
                                           "0 @I2@ INDI\n1 NAME Peter /Novák/\n0 TRLR\n")).people;
    expect(people["@I1@"].aka).toEqual(["Johannes Pavlovszky"]);
    expect(findPeople("pavlovszky", people).map((p) => p.id)).toEqual(["@I1@"]);
    expect(findPeople("johannes", people).map((p) => p.id)).toEqual(["@I1@"]);
    expect(matchedAka("johannes", people["@I1@"])).toBe("Johannes Pavlovszky");
    expect(matchedAka("ján", people["@I1@"])).toBeNull();
  });
});
