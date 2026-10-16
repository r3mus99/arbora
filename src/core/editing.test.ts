/**
 * Editing must touch only what was edited: after any change in the form, every other line of the record
 * is the same as before, and changing back gives the file as it was.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyFamily, applyPerson, decode, familyFields, parseGedcom, personFields, writeGedcom, type FamilyFields, type GedNode,
  type PersonFields,
} from "./index";
import { RICH_GED } from "./fixtures/rich";

const strip = (n: GedNode): unknown => ({ tag: n.tag, value: n.value, xref: n.xref, verbatim: n.verbatim, children: n.children.map(strip) });

/** the lines under the record that are not of these tags, as comparable trees */
const rest = (rec: GedNode, touched: string[]) => rec.children.filter((c) => !touched.includes(c.tag)).map(strip);

const records = parseGedcom(RICH_GED);
const person = records[1];
const family = records.find((r) => r.xref === "@F1@")!;
const whole = (changed: GedNode, original: GedNode) => writeGedcom(records.map((r) => (r === original ? changed : r)));

// each change in the person form, with the lines of the record it may change
const PERSON_CHANGES: [string, string[], (f: PersonFields) => Partial<PersonFields>][] = [
  ["given name", ["NAME"], () => ({ given: "Otto" })],
  ["surname", ["NAME"], () => ({ surname: "Brant" })],
  ["sex", ["SEX"], () => ({ sex: "F" })],
  ["birth date", ["BIRT"], (f) => ({ birth: { ...f.birth, date: "1901" } })],
  ["birth place", ["BIRT"], (f) => ({ birth: { ...f.birth, place: "Elsewhere" } })],
  ["christening", ["CHR"], (f) => ({ christening: { ...f.christening, place: "Elsewhere" } })],
  ["death", ["DEAT"], (f) => ({ death: { ...f.death, date: "1979" } })],
  ["burial", ["BURI"], () => ({ burial: { date: "1979", place: "Hill" } })],
  ["occupation", ["OCCU"], () => ({ occupations: [{ origin: -1, value: "teacher", date: "", place: "" }] })],
  ["religion", ["RELI"], () => ({ religion: "Lutheran" })],
  ["note", ["NOTE"], () => ({ note: "A new note" })],
  ["aka name", ["NAME"], () => ({ aliases: [{ origin: -1, given: "Ottie", surname: "" }] })],
];

describe("changing a person", () => {
  test.each(PERSON_CHANGES)("%s changes only its own lines, and changing back restores the file", (_, touched, change) => {
    const before = personFields(person);
    const changed = applyPerson(person, before, { ...before, ...change(before) });
    expect(changed).not.toBe(person);
    expect(rest(changed, touched)).toEqual(rest(person, touched));
    const back = applyPerson(changed, personFields(changed), before);
    expect(whole(back, person)).toBe(RICH_GED);
  });
});

describe("changing a family", () => {
  const CHANGES: [string, string[], (f: FamilyFields) => FamilyFields][] = [
    ["marriage date", ["MARR"], (f) => ({ ...f, marriage: { ...f.marriage, date: "1927" } })],
    ["marriage place", ["MARR"], (f) => ({ ...f, marriage: { ...f.marriage, place: "Elsewhere" } })],
    ["divorce removed", ["DIV"], (f) => ({ ...f, divorced: false })],
  ];
  test.each(CHANGES)("%s changes only its own lines", (_, touched, change) => {
    const before = familyFields(family);
    const changed = applyFamily(family, before, change(before));
    expect(changed).not.toBe(family);
    expect(rest(changed, touched)).toEqual(rest(family, touched));
    expect(writeGedcom([changed])).toContain("1 _WITN @I3@");
  });
});

describe("the sample", () => {
  const sample = parseGedcom(decode(readFileSync(new URL("../../public/sample.ged", import.meta.url))));
  const text = writeGedcom(sample);

  test("every person, changed and changed back, gives the file as it was", () => {
    const all = sample.map((r) => {
      if (r.tag !== "INDI") return r;
      const before = personFields(r);
      const changed = applyPerson(r, before, { ...before, given: before.given + "x", religion: "Test",
                                               birth: { ...before.birth, place: "Nowhere" },
                                               death: { ...before.death, date: "1999" }, deceased: true });
      return applyPerson(changed, personFields(changed), before);
    });
    expect(writeGedcom(all)).toBe(text);
  });

  test("every family, changed and changed back, gives the file as it was", () => {
    const all = sample.map((r) => {
      if (r.tag !== "FAM") return r;
      const before = familyFields(r);
      const changed = applyFamily(r, before, { marriage: { date: "1999", place: "Nowhere" }, divorced: !before.divorced });
      return applyFamily(changed, familyFields(changed), before);
    });
    expect(writeGedcom(all)).toBe(text);
  });
});

describe("names without slashes", () => {
  const rec = parseGedcom("0 @I1@ INDI\n1 NAME Karol I.\n1 SEX M\n")[0];
  const before = personFields(rec);
  const edited = (given: string, surname = "") => writeGedcom([applyPerson(rec, before, { ...before, given, surname })]);

  test("stay without slashes while there is no surname", () => {
    expect(edited("Karol II.")).toContain("1 NAME Karol II.\n");
  });

  test("get slashes when a surname is added", () => {
    expect(edited("Karol", "Habsburg")).toContain("1 NAME Karol /Habsburg/\n");
  });

  test("an empty surname already written as // stays so", () => {
    const withSlashes = parseGedcom("0 @I1@ INDI\n1 NAME Karol //\n")[0];
    const f = personFields(withSlashes);
    expect(writeGedcom([applyPerson(withSlashes, f, { ...f, given: "Karel" })])).toContain("1 NAME Karel //\n");
  });
});

describe("a rewritten record keeps how unchanged values were written", () => {
  const GED = `0 HEAD
0 @I1@ INDI
1 NAME Jan /Tester/
1 NOTE A long note split   
2 CONC  at odd places, with
2 CONT a second line and
2 CONC  more
1 _CUSTOM   padded value  
1 OCCU Smith
0 TRLR
`;
  test("CONC/CONT breaks and edge spaces survive when another line is edited", () => {
    const rec = parseGedcom(GED)[1];
    const before = personFields(rec);
    const out = writeGedcom([applyPerson(rec, before, { ...before, religion: "Lutheran" })]);
    expect(out).toContain(GED.split("\n").slice(3, 8).join("\n"));
    expect(out).toContain("1 RELI Lutheran");
  });

  test("a changed value is written anew", () => {
    const rec = parseGedcom(GED)[1];
    rec.children.find((c) => c.tag === "NOTE")!.value = "short";
    expect(writeGedcom([{ ...rec, raw: undefined }])).toContain("1 NOTE short\n");
  });
});

describe("saving the file", () => {
  const writer = { version: "9.9.9", date: new Date(2026, 9, 12, 8, 30, 0) };

  test("saving with the program stamp changes only the header, other records stay byte for byte", () => {
    const records = parseGedcom(RICH_GED);
    const out = writeGedcom(records, "\n", writer);
    const rest = (t: string) => t.slice(t.indexOf("\n0 ", 1));
    expect(rest(out)).toBe(rest(writeGedcom(records)));
    expect(out).toContain("1 SOUR ARBORA\n2 VERS 9.9.9");
  });

  test("a file with Windows line endings is written back with them", () => {
    const crlf = RICH_GED.replace(/\n/g, "\r\n");
    expect(writeGedcom(parseGedcom(crlf), "\r\n")).toBe(crlf);
  });
});

describe("the parts of a name", () => {
  const GED = `0 HEAD
0 @I1@ INDI
1 NAME Jan /Novak/
2 GIVN Jan
2 SURN Novak
2 SOUR @S1@
1 SEX M
0 TRLR
`;
  const rec = parseGedcom(GED)[1];
  const before = personFields(rec);
  const edit = (patch: Partial<PersonFields["nameParts"]>) =>
    applyPerson(rec, before, { ...before, nameParts: { ...before.nameParts, ...patch } });

  test("are read from the lines under the main name", () => {
    const rich = personFields(person);
    expect(rich.nameParts.prefix).toBe("Dr.");
    expect(rich.nameParts.nickname).toBe("Otty");
    expect(before.nameParts).toEqual({ prefix: "", nickname: "", surnamePrefix: "", suffix: "" });
  });

  test("new ones are written in the usual order, before lines such as SOUR", () => {
    const out = writeGedcom([edit({ prefix: "Ing.", nickname: "Honza", surnamePrefix: "van", suffix: "ml." })]);
    expect(out).toContain("1 NAME Jan /Novak/\n2 NPFX Ing.\n2 GIVN Jan\n2 NICK Honza\n2 SPFX van\n2 SURN Novak\n2 NSFX ml.\n2 SOUR @S1@\n");
  });

  test("an emptied one is removed, and changing back gives the record as it was", () => {
    const changed = edit({ nickname: "Honza" });
    const personChanged = applyPerson(person, personFields(person), { ...personFields(person), nameParts: { ...personFields(person).nameParts, nickname: "" } });
    expect(writeGedcom([personChanged])).not.toContain("NICK");
    const back = applyPerson(changed, personFields(changed), before);
    expect(writeGedcom([back])).toBe(writeGedcom([rec]));
  });

  test("a person without a name gets one when a part is set", () => {
    const bare = parseGedcom("0 @I1@ INDI\n1 SEX F\n")[0];
    const f = personFields(bare);
    expect(writeGedcom([applyPerson(bare, f, { ...f, nameParts: { ...f.nameParts, nickname: "Ann" } })])).toContain("1 NAME\n2 NICK Ann\n");
  });

  test("only the changed line is touched", () => {
    const changed = edit({ nickname: "Honza" });
    expect(rest(changed, ["NAME"])).toEqual(rest(rec, ["NAME"]));
  });
});

describe("attributes of a person", () => {
  const GED = `0 HEAD
0 @I1@ INDI
1 NAME Jan /Novak/
1 SEX M
1 OCCU smith
1 EDUC primary school
2 DATE 1890
1 NATI
2 PLAC Brno
1 FACT Y
1 RELI Catholic
1 NOTE x
0 TRLR
`;
  const rec = parseGedcom(GED)[1];
  const before = personFields(rec);
  const change = (fn: (f: PersonFields) => Partial<PersonFields>) => applyPerson(rec, before, { ...before, ...fn(before) });

  test("are listed with the index of their line, empty ones left out", () => {
    expect(before.attributes.map((a) => [a.origin, a.tag, a.value, a.date, a.place])).toEqual([
      [0, "EDUC", "primary school", "1890", ""], [1, "NATI", "", "", "Brno"],
    ]);
  });

  test("a changed value touches only its line", () => {
    const changed = change((f) => ({ attributes: f.attributes.map((a) => (a.origin === 0 ? { ...a, value: "grammar school" } : a)) }));
    const out = writeGedcom([changed]);
    expect(out).toContain("1 EDUC grammar school\n2 DATE 1890\n1 NATI\n2 PLAC Brno\n1 FACT Y\n");
    expect(rest(changed, ["EDUC"])).toEqual(rest(rec, ["EDUC"]));
  });

  test("a removed one is deleted and the unlisted empty line stays", () => {
    const out = writeGedcom([change((f) => ({ attributes: f.attributes.filter((a) => a.origin !== 0) }))]);
    expect(out).not.toContain("EDUC");
    expect(out).toContain("1 NATI\n2 PLAC Brno\n1 FACT Y\n");
  });

  test("a new one is written with its date and place, among the other attributes", () => {
    const out = writeGedcom([change((f) => ({ attributes: [...f.attributes,
      { origin: -1, tag: "PROP", value: "a mill", date: "1900", place: "Brno" }] }))]);
    expect(out).toContain("1 NATI\n2 PLAC Brno\n1 PROP a mill\n2 DATE 1900\n2 PLAC Brno\n1 FACT Y\n");
  });

  test("changing back gives the record as it was", () => {
    const changed = change((f) => ({ attributes: [...f.attributes.map((a) => ({ ...a, place: "Prague" })),
      { origin: -1, tag: "PROP", value: "a mill", date: "", place: "" }] }));
    const back = applyPerson(changed, personFields(changed), before);
    expect(writeGedcom([back])).toBe(writeGedcom([rec]));
  });
});

describe("events of a person", () => {
  const ged = (extra: string) => `0 HEAD\n0 @I1@ INDI\n1 NAME Anna /Test/\n1 SEX F\n1 BIRT\n2 DATE 1 JAN 1900\n${extra}1 NOTE n\n0 TRLR\n`;
  const load = (text: string) => parseGedcom(text).find((c) => c.tag === "INDI")!;
  const none = { age: "", cause: "", agency: "" };

  test("adds details to a birth in the usual order and removes them again", () => {
    const rec = load(ged(""));
    const f = personFields(rec);
    const withD = applyPerson(rec, f, { ...f, details: { ...f.details, birth: { age: "0", cause: "", agency: "Parish" } } });
    expect(withD.children[2].children.map((c) => `${c.tag} ${c.value}`)).toEqual(["DATE 1 JAN 1900", "AGE 0", "AGNC Parish"]);
    const back = applyPerson(withD, personFields(withD), { ...personFields(withD), details: { ...f.details, birth: none } });
    expect(rest(back, [])).toEqual(rest(rec, []));
  });

  test("adds, edits and removes other events", () => {
    const rec = load(ged("1 RESI Main St\n2 DATE 1920\n"));
    const f = personFields(rec);
    expect(f.events).toHaveLength(1);
    expect(f.events[0]).toMatchObject({ tag: "RESI", value: "Main St", date: "1920" });
    const added = applyPerson(rec, f, { ...f, events: [...f.events, { origin: -1, tag: "EVEN", title: "Fair", value: "won", date: "", place: "Town", ...none, cause: "x" }] });
    const ev = added.children.find((c) => c.tag === "EVEN")!;
    expect(ev.children.map((c) => c.tag)).toEqual(["TYPE", "PLAC", "CAUS"]);
    expect(added.children.findIndex((c) => c.tag === "EVEN")).toBeLessThan(added.children.findIndex((c) => c.tag === "NOTE"));
    const g = personFields(added);
    const edited = applyPerson(added, g, { ...g, events: g.events.map((e) => (e.tag === "RESI" ? { ...e, place: "Elsewhere" } : e)) });
    expect(edited.children.find((c) => c.tag === "RESI")!.children.map((c) => c.tag)).toEqual(["DATE", "PLAC"]);
    const h = personFields(edited);
    const gone = applyPerson(edited, h, { ...h, events: [] });
    expect(gone.children.some((c) => c.tag === "RESI" || c.tag === "EVEN")).toBe(false);
  });

  test("leaves the record alone when nothing changed", () => {
    const rec = load(ged("1 RESI x\n"));
    const f = personFields(rec);
    expect(applyPerson(rec, f, { ...f, events: f.events.map((e) => ({ ...e })) })).toBe(rec);
  });
});
