import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { checkGedcom, decode, parseGedcom, validDateValue } from "./index";

const kinds = (ged: string) => checkGedcom(parseGedcom(ged)).map((i) => i.kind);
const wrap = (body: string) => `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n${body}0 TRLR\n`;

describe("checkGedcom", () => {
  test("a sound family has no issues", () => {
    expect(kinds(wrap("0 @I1@ INDI\n1 SEX M\n1 BIRT\n2 DATE 1 JAN 1900\n1 FAMS @F1@\n" +
      "0 @I2@ INDI\n1 SEX F\n1 FAMS @F1@\n0 @I3@ INDI\n1 BIRT\n2 DATE ABT 1925\n1 FAMC @F1@\n" +
      "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n"))).toEqual([]);
  });

  test("header, trailer and duplicate IDs", () => {
    expect(kinds("0 @I1@ INDI\n0 @I1@ INDI\n")).toEqual(["noHead", "noTrlr", "dupId"]);
  });

  test("links to nothing and links one way only", () => {
    const issues = checkGedcom(parseGedcom(wrap("0 @I1@ INDI\n1 FAMS @F9@\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I7@\n")));
    expect(issues.map((i) => [i.kind, i.args.tag, i.args.value])).toEqual([
      ["oneWay", "FAMC", "@F1@"], ["missingRef", "FAMS", "@F9@"], ["oneWay", "HUSB", "@I1@"], ["missingRef", "WIFE", "@I7@"],
    ]);
    expect(issues[1]).toMatchObject({ level: "error", person: "@I1@" });
  });

  test("dates in a form GEDCOM does not allow", () => {
    for (const ok of ["1900", "MAR 1900", "29 FEB 1900", "ABT 1900", "BET 1900 AND 1910", "FROM 1900 TO 1910",
                      "BEF 2 JAN 1900", "(neznámy)", "INT 1900 (asi)", "1699/00", "@#DJULIAN@ 1 JAN 1600", ""]) {
      expect(validDateValue(ok), ok).toBe(true);
    }
    for (const bad of ["1885-12-12", "1922-03", "PRED ROKOM 1841", "32 JAN 1900", "1.2.1900", "8 1743", "ABT"]) {
      expect(validDateValue(bad), bad).toBe(false);
    }
    expect(checkGedcom(parseGedcom(wrap("0 @I1@ INDI\n1 BIRT\n2 DATE 1885-12-12\n")))[0])
      .toMatchObject({ kind: "badDate", person: "@I1@", args: { tag: "BIRT", value: "1885-12-12" } });
  });

  test("dates that cannot be true", () => {
    const fam = (child: string, father: string, mother: string) => wrap(
      `0 @I1@ INDI\n1 SEX M\n${father}1 FAMS @F1@\n0 @I2@ INDI\n1 SEX F\n${mother}1 FAMS @F1@\n` +
      `0 @I3@ INDI\n${child}1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n`);
    const birt = (d: string) => `1 BIRT\n2 DATE ${d}\n`, deat = (d: string) => `1 DEAT\n2 DATE ${d}\n`;
    expect(kinds(fam(birt("1900") + deat("1890"), "", ""))).toEqual(["deathBeforeBirth"]);
    expect(kinds(fam(birt("1900"), birt("1901"), birt("1895")))).toEqual(["beforeParent", "parentYoung"]);
    expect(kinds(fam(birt("10 MAY 1900"), deat("1 SEP 1899"), deat("9 MAY 1900")))).toEqual(["afterMother"]);
    expect(kinds(fam(birt("10 MAY 1900"), deat("1 MAR 1899"), ""))).toEqual(["afterFather"]);
    // died at the birth, or the father months before it: possible
    expect(kinds(fam(birt("10 MAY 1900"), deat("1 SEP 1899"), deat("10 MAY 1900")))).toEqual([]);
    // about-dates only count when years apart
    expect(kinds(fam(birt("ABT 1900") + deat("1899"), "", ""))).toEqual([]);
  });

  test("a wife who is a man", () => {
    expect(kinds(wrap("0 @I1@ INDI\n1 SEX M\n1 FAMS @F1@\n0 @F1@ FAM\n1 WIFE @I1@\n"))).toEqual(["spouseSex"]);
  });

  test("the sample file has no broken links", () => {
    const issues = checkGedcom(parseGedcom(decode(readFileSync("public/ukazka.ged"))));
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });
});
