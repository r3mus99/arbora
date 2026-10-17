/**
 * Editing must touch only what was edited: after any change in the form, every other line of the record
 * is the same as before, and changing back gives the file as it was.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyFamily, applyPerson, decode, familyFields, parseGedcom, personFields, relinkFamily, relinkParents, rewritten, sourceChoices, writeGedcom, type FamilyFields, type GedNode,
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
      const changed = applyFamily(r, before, { ...before, marriage: { date: "1999", place: "Nowhere" }, divorced: !before.divorced });
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

describe("source citations of a person", () => {
  const text = "0 HEAD\n0 @S1@ SOUR\n1 TITL Parish book\n0 @I1@ INDI\n1 NAME Anna /Test/\n1 NOTE n\n1 SOUR @S1@\n2 PAGE 12\n2 QUAY 2\n2 NOTE c\n1 FAMS @F1@\n0 TRLR\n";
  const rec = () => parseGedcom(text).find((c) => c.tag === "INDI")!;
  const tags = (r: GedNode) => r.children.map((c) => `${c.tag} ${c.value}`.trim());

  test("reads the citations and sourceChoices lists the source records", () => {
    expect(personFields(rec()).citations).toEqual([{ origin: 0, source: "@S1@", page: "12", quality: "2" }]);
    expect(sourceChoices(parseGedcom(text))).toEqual([{ xref: "@S1@", title: "Parish book" }]);
  });

  test("changes page and quality, keeping the lines the form does not show", () => {
    const r = rec(), f = personFields(r);
    const out = applyPerson(r, f, { ...f, citations: [{ ...f.citations[0], page: "13", quality: "" }] });
    expect(out.children[2].children.map((c) => `${c.tag} ${c.value}`)).toEqual(["PAGE 13", "NOTE c"]);
  });

  test("adds a citation before the family links, and removes one", () => {
    const r = rec(), f = personFields(r);
    const added = applyPerson(r, f, { ...f, citations: [...f.citations, { origin: -1, source: "@S1@", page: "7", quality: "3" }, { origin: -1, source: "", page: "x", quality: "" }] });
    expect(tags(added)).toEqual(["NAME Anna /Test/", "NOTE n", "SOUR @S1@", "SOUR @S1@", "FAMS @F1@"]);
    expect(added.children[3].children.map((c) => `${c.tag} ${c.value}`)).toEqual(["PAGE 7", "QUAY 3"]);
    const g = personFields(added);
    const back = applyPerson(added, g, { ...g, citations: g.citations.slice(0, 1) });
    expect(tags(back)).toEqual(tags(r));
    expect(applyPerson(r, f, { ...f, citations: [] }).children.some((c) => c.tag === "SOUR")).toBe(false);
  });

  test("a changed pointer or a text citation is written as typed", () => {
    const r = rec(), f = personFields(r);
    const out = applyPerson(r, f, { ...f, citations: [{ ...f.citations[0], source: "Family Bible" }] });
    expect(out.children[2].value).toBe("Family Bible");
    expect(applyPerson(r, f, { ...f, citations: f.citations.map((c) => ({ ...c })) })).toBe(r);
  });
});

describe("marriage and divorce details of a family", () => {
  const text = "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 1900\n1 DIV Y\n1 CHIL @I3@\n";
  const rec = () => parseGedcom(text)[0];

  test("sets the date, place and details of the divorce under DIV Y", () => {
    const r = rec(), f = familyFields(r);
    const out = applyFamily(r, f, { ...f, divorce: { date: "1910", place: "Town" }, details: { ...f.details, divorce: { age: "", cause: "x", agency: "" } } });
    expect(writeGedcom([out])).toBe("0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 1900\n1 DIV Y\n2 DATE 1910\n2 PLAC Town\n2 CAUS x\n1 CHIL @I3@\n");
    expect(writeGedcom([applyFamily(out, familyFields(out), f)])).toBe(text);
  });

  test("marking a marriage as divorced adds DIV Y with the typed date; unticking removes it all", () => {
    const r = parseGedcom("0 @F1@ FAM\n1 HUSB @I1@\n1 MARR\n2 DATE 1900\n")[0], f = familyFields(r);
    const out = applyFamily(r, f, { ...f, divorced: true, divorce: { date: "1920", place: "" } });
    expect(writeGedcom([out])).toBe("0 @F1@ FAM\n1 HUSB @I1@\n1 MARR\n2 DATE 1900\n1 DIV Y\n2 DATE 1920\n");
    expect(writeGedcom([applyFamily(out, familyFields(out), f)])).toBe(writeGedcom([rewritten(r)]));
  });

  test("age, cause and agency of the marriage", () => {
    const r = rec(), f = familyFields(r);
    const out = applyFamily(r, f, { ...f, details: { ...f.details, marriage: { age: "", cause: "", agency: "Parish" } } });
    expect(out.children[2].children.map((c) => `${c.tag} ${c.value}`)).toEqual(["DATE 1900", "AGNC Parish"]);
    expect(applyFamily(r, f, { ...f, divorce: { ...f.divorce } })).toBe(r);
  });
});

describe("spouses and children of a family", () => {
  const text = [
    "0 @I1@ INDI\n1 NAME A /X/\n1 FAMS @F1@", "0 @I2@ INDI\n1 NAME B /X/\n1 FAMS @F1@",
    "0 @I3@ INDI\n1 NAME C /X/\n1 FAMC @F1@", "0 @I4@ INDI\n1 NAME D /X/", "0 @I5@ INDI\n1 NAME E /X/",
    "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 MARR\n2 DATE 1900\n1 CHIL @I3@\n1 SOUR @S1@", "",
  ].join("\n");
  const recs = () => parseGedcom(text);
  const by = (list: GedNode[], id: string) => list.find((r) => r.xref === id)!;
  /** the file after the family change, links included */
  const run = (change: (f: FamilyFields) => Partial<FamilyFields>) => {
    const all = recs(), fam = by(all, "@F1@"), before = familyFields(fam);
    const after = { ...before, ...change(before) };
    const next = applyFamily(fam, before, after);
    const others = relinkFamily("@F1@", before, after, (id) => by(all, id));
    return writeGedcom(all.map((r) => (r === fam ? next : others.find((o) => o.xref === r.xref) || r)));
  };

  test("reads the spouses and the children", () => {
    expect(familyFields(by(recs(), "@F1@"))).toMatchObject({ husb: "@I1@", wife: "@I2@", children: ["@I3@"] });
  });

  test("adds a child to the family and gives the child the FAMC link", () => {
    const out = run((f) => ({ children: [...f.children, "@I4@"] }));
    expect(out).toContain("1 CHIL @I3@\n1 CHIL @I4@\n1 SOUR @S1@");
    expect(out).toContain("0 @I4@ INDI\n1 NAME D /X/\n1 FAMC @F1@\n");
  });

  test("takes a child out and removes its FAMC link", () => {
    const out = run(() => ({ children: [] }));
    expect(out).not.toContain("CHIL");
    expect(out).toContain("0 @I3@ INDI\n1 NAME C /X/\n0 ");
  });

  test("replaces a spouse and moves the FAMS link", () => {
    const out = run(() => ({ wife: "@I5@" }));
    expect(out).toContain("1 HUSB @I1@\n1 WIFE @I5@\n");
    expect(out).toContain("0 @I2@ INDI\n1 NAME B /X/\n0 ");
    expect(out).toContain("0 @I5@ INDI\n1 NAME E /X/\n1 FAMS @F1@\n");
  });

  test("removes a spouse; the same file comes back after changing back", () => {
    expect(run(() => ({ husb: "" }))).not.toContain("HUSB");
    const all = recs(), fam = by(all, "@F1@"), before = familyFields(fam);
    const gone = { ...before, husb: "", children: [] };
    const next = applyFamily(fam, before, gone);
    const back = applyFamily(next, gone, before);
    expect(back.children.map((c) => `${c.tag} ${c.value}`.trim())).toEqual(fam.children.map((c) => `${c.tag} ${c.value}`.trim()));
    expect(run(() => ({}))).toBe(writeGedcom(recs()));
  });
});

describe("parents and associations of a person", () => {
  const text = [
    "0 @I1@ INDI\n1 NAME A /X/\n1 FAMC @F1@\n2 PEDI adopted\n1 ASSO @I2@\n2 RELA godparent\n1 NOTE n",
    "0 @I2@ INDI\n1 NAME B /X/", "0 @I3@ INDI\n1 NAME C /X/",
    "0 @F1@ FAM\n1 HUSB @I2@\n1 CHIL @I1@", "0 @F2@ FAM\n1 HUSB @I3@\n1 CHIL @I2@", "",
  ].join("\n");
  const recs = () => parseGedcom(text);
  const by = (list: GedNode[], id: string) => list.find((r) => r.xref === id)!;
  const lines = (r: GedNode) => r.children.map((c) => `${c.tag} ${c.value}`.trim());

  test("reads the parent families and the associations", () => {
    const f = personFields(by(recs(), "@I1@"));
    expect(f.parents).toEqual([{ origin: 0, fam: "@F1@", pedigree: "adopted" }]);
    expect(f.associations).toEqual([{ origin: 0, id: "@I2@", role: "godparent" }]);
  });

  test("changes the kind of descent and the role, keeping the rest", () => {
    const r = by(recs(), "@I1@"), f = personFields(r);
    const out = applyPerson(r, f, { ...f, parents: [{ ...f.parents[0], pedigree: "foster" }], associations: [{ ...f.associations[0], role: "witness" }] });
    expect(out.children[1].children.map((c) => c.value)).toEqual(["foster"]);
    expect(out.children[2].children.map((c) => c.value)).toEqual(["witness"]);
    expect(applyPerson(r, f, { ...f, parents: f.parents.map((p) => ({ ...p })) })).toBe(r);
  });

  test("adds a family and an association after the other links, before the note stays put", () => {
    const r = by(recs(), "@I1@"), f = personFields(r);
    const out = applyPerson(r, f, {
      ...f, parents: [...f.parents, { origin: -1, fam: "@F2@", pedigree: "birth" }],
      associations: [...f.associations, { origin: -1, id: "@I3@", role: "" }],
    });
    expect(lines(out)).toEqual(["NAME A /X/", "FAMC @F1@", "FAMC @F2@", "ASSO @I2@", "ASSO @I3@", "NOTE n"]);
    expect(out.children[2].children.map((c) => `${c.tag} ${c.value}`)).toEqual(["PEDI birth"]);
    const g = personFields(out);
    const back = applyPerson(out, g, { ...g, parents: g.parents.slice(0, 1), associations: g.associations.slice(0, 1) });
    expect(lines(back)).toEqual(lines(r));
  });

  test("relinkParents moves the CHIL line between families", () => {
    const all = recs(), f = personFields(by(all, "@I1@"));
    const after = [{ origin: -1, fam: "@F2@", pedigree: "" }];
    const changed = relinkParents("@I1@", f.parents, after, (id) => by(all, id));
    expect(changed.map((c) => c.xref).sort()).toEqual(["@F1@", "@F2@"]);
    expect(lines(by(changed, "@F1@"))).toEqual(["HUSB @I2@"]);
    expect(lines(by(changed, "@F2@"))).toEqual(["HUSB @I3@", "CHIL @I2@", "CHIL @I1@"]);
    expect(relinkParents("@I1@", f.parents, f.parents, (id) => by(all, id))).toEqual([]);
  });
});

describe("restriction, contacts and reference numbers of a person", () => {
  const text = [
    "0 @I1@ INDI\n1 NAME A /X/\n1 SEX M\n1 ADDR 1 Main St\n2 CITY Testville\n1 PHON 111\n1 EMAIL a@example.org\n1 FAMS @F1@\n1 REFN 7\n2 TYPE old\n1 CHAN\n2 DATE 1 JAN 2000",
    "0 @F1@ FAM\n1 HUSB @I1@", "",
  ].join("\n");
  const rec = () => parseGedcom(text)[0];
  const lines = (r: GedNode) => r.children.map((c) => `${c.tag} ${c.value}`.trim());

  test("reads the lines", () => {
    const f = personFields(rec());
    expect(f.address).toBe("1 Main St");
    expect(f.contacts).toEqual([{ origin: 0, tag: "PHON", value: "111" }, { origin: 1, tag: "EMAIL", value: "a@example.org" }]);
    expect(f.references).toEqual([{ origin: 0, value: "7", type: "old" }]);
    expect([f.restriction, f.afn, f.rfn]).toEqual(["", "", ""]);
  });

  test("changing and removing keeps the lines under ADDR and the rest", () => {
    const r = rec(), f = personFields(r);
    const out = applyPerson(r, f, {
      ...f, address: "2 Side St", contacts: [{ ...f.contacts[0], value: "222" }], references: [{ ...f.references[0], type: "new" }],
    });
    expect(lines(out)).toEqual(["NAME A /X/", "SEX M", "ADDR 2 Side St", "PHON 222", "FAMS @F1@", "REFN 7", "CHAN"]);
    expect(out.children[2].children.map((c) => c.tag)).toEqual(["CITY"]);
    expect(out.children[5].children.map((c) => c.value)).toEqual(["new"]);
    expect(applyPerson(r, f, { ...f, contacts: f.contacts.map((c) => ({ ...c })) })).toBe(r);
  });

  test("an emptied ADDR with parts under it stays, a plain one goes", () => {
    const r = rec(), f = personFields(r);
    expect(lines(applyPerson(r, f, { ...f, address: "" }))).toContain("ADDR");
    const plain = parseGedcom("0 @I1@ INDI\n1 NAME A /X/\n1 ADDR x\n")[0], g = personFields(plain);
    expect(lines(applyPerson(plain, g, { ...g, address: "" }))).toEqual(["NAME A /X/"]);
  });

  test("new lines go where GEDCOM has them, and adding then removing gives the record back", () => {
    const r = rec(), f = personFields(r);
    const out = applyPerson(r, f, {
      ...f, restriction: "Privacy", afn: "AF1", rfn: "RF1",
      contacts: [...f.contacts, { origin: -1, tag: "WWW", value: "https://example.org" }],
      references: [...f.references, { origin: -1, value: "8", type: "" }],
    });
    expect(lines(out)).toEqual(["RESN privacy", "NAME A /X/", "SEX M", "ADDR 1 Main St", "PHON 111", "EMAIL a@example.org", "WWW https://example.org",
                                "FAMS @F1@", "RFN RF1", "AFN AF1", "REFN 7", "REFN 8", "CHAN"]);
    const g = personFields(out);
    const back = applyPerson(out, g, { ...g, restriction: "", afn: "", rfn: "", contacts: g.contacts.slice(0, 2), references: g.references.slice(0, 1) });
    expect(lines(back)).toEqual(lines(r));
  });
});
