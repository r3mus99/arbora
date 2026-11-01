import { describe, expect, test } from "vitest";
import { parseGedcom, surnameOf, yearOf } from "./index";

describe("years and surnames", () => {
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
});
