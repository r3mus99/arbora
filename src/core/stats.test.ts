import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { decode, overview, parseGedcom, readRecords, surnameOf, yearOf } from "./index";

const of = (ged: string) => { const r = parseGedcom(ged); return overview(r, readRecords(r)); };

describe("overview", () => {
  test("years of GEDCOM dates", () => {
    expect(["12 MAY 1891", "ABT 1890", "BET 1700 AND 1710", "1699/00", "@#DJULIAN@ 1 JAN 1600", "(neznámy)", ""]
      .map(yearOf)).toEqual([1891, 1890, 1700, 1699, 1600, null, null]);
  });

  test("surnames between slashes, from SURN, or the last word", () => {
    const name = (ged: string) => surnameOf(parseGedcom(`0 @I1@ INDI\n${ged}`)[0].children[0]);
    expect(name("1 NAME Ján /Novák/")).toBe("Novák");
    expect(name("1 NAME Ján\n2 SURN Kováč")).toBe("Kováč");
    expect(name("1 NAME Otto František Habsburský")).toBe("Habsburský");
    expect(name("1 NAME Karol I.")).toBe("");
    expect(name("1 NAME Mária")).toBe("");
  });

  test("counts, generations, oldest person, surnames and places", () => {
    const o = of("0 HEAD\n" +
      "0 @I1@ INDI\n1 NAME Ján /Novák/\n1 SEX M\n1 BIRT\n2 DATE 1850\n2 PLAC Trnava, Slovensko\n1 FAMS @F1@\n" +
      "0 @I2@ INDI\n1 NAME Anna /Malá/\n1 SEX F\n1 BIRT\n2 DATE ABT 1855\n2 PLAC Trnava\n1 FAMS @F1@\n" +
      "0 @I3@ INDI\n1 NAME Peter /Novák/\n1 SEX M\n1 BIRT\n2 DATE 1880\n2 PLAC Trnava\n1 DEAT\n2 DATE 1950\n2 PLAC Nitra\n" +
      "1 FAMC @F1@\n1 FAMS @F2@\n" +
      "0 @I4@ INDI\n1 NAME Eva /Novák/\n1 FAMC @F2@\n" +
      "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n1 CHIL @I3@\n0 @F2@ FAM\n1 HUSB @I3@\n1 CHIL @I4@\n0 TRLR\n");
    expect(o).toMatchObject({ people: 4, men: 2, women: 1, families: 2, generations: 3,
                              firstYear: 1850, lastYear: 1950, oldest: { id: "@I1@", year: 1850 } });
    expect(o.surnames).toEqual([{ value: "Novák", count: 3 }, { value: "Malá", count: 1 }]);
    expect(o.places).toEqual([{ value: "Trnava", count: 3 }, { value: "Nitra", count: 1 }]);
  });

  test("a loop in the links ends", () => {
    const o = of("0 @I1@ INDI\n1 FAMS @F1@\n1 FAMC @F2@\n0 @I2@ INDI\n1 FAMC @F1@\n1 FAMS @F2@\n" +
                 "0 @F1@ FAM\n1 HUSB @I1@\n1 CHIL @I2@\n0 @F2@ FAM\n1 HUSB @I2@\n1 CHIL @I1@\n");
    expect(o.generations).toBe(0);
  });

  test("the sample", () => {
    const r = parseGedcom(decode(readFileSync(new URL("../../public/sample.ged", import.meta.url))));
    const o = overview(r, readRecords(r));
    expect(o.people).toBe(1714);
    expect(o.generations).toBeGreaterThan(10);
    expect(o.surnames[0].value).toMatch(/Habsbur/);
  });
});
