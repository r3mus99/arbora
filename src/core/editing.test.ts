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
