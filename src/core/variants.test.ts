import { describe, expect, test } from "vitest";
import { parseGedcom, renameVariants, similar, spellingKey, variantGroups, writeGedcom } from "./index";

const GED = `0 HEAD
0 @I1@ INDI
1 NAME Ján /Pavlovský/
1 BIRT
2 PLAC Lieskovice, Senica, Slovensko
0 @I2@ INDI
1 NAME Michal /Pavlovszký/
2 SURN Pavlovszký
1 BIRT
2 PLAC Lieszkovicz, Nyitra, Hungary
0 @I3@ INDI
1 NAME Anna /Pavlovská/
1 DEAT
2 PLAC Lieskovice 12
0 @I4@ INDI
1 NAME Mária /Kováčiková/
0 @I5@ INDI
1 NAME Jozef /Kováčik/
0 @I6@ INDI
1 NAME Peter /Novák/
0 @I7@ INDI
1 NAME Pavol /Nosák/
0 @F1@ FAM
1 HUSB @I1@
1 MARR
2 PLAC Lieszkovicz
0 TRLR
`;

describe("bulk fix of spellings", () => {
  test("old spellings and accents give the same key", () => {
    expect(spellingKey("Pavlovszký")).toBe(spellingKey("Pavlovský"));
    expect(spellingKey("Lieszkovicz")).toBe("lieskovic");
    expect(spellingKey("Kubíček")).toBe(spellingKey("Kubiček"));
  });

  test("men's and women's forms and short different names are not variants", () => {
    expect(similar("Kováčik", "Kováčiková", "surname")).toBe(false);
    expect(similar("Pavlovský", "Pavlovská", "surname")).toBe(false);
    expect(similar("Novák", "Nosák", "surname")).toBe(false);
    expect(similar("Gaňová", "Galová", "surname")).toBe(false);
    expect(similar("Kubíčeková", "Kubičeková", "surname")).toBe(true);
    expect(similar("Dolniany", "Dolnany", "place")).toBe(true);
  });

  test("groups with the records that use each spelling", () => {
    const records = parseGedcom(GED);
    expect(variantGroups(records, "surname").map((g) => g.variants)).toEqual([
      [{ value: "Pavlovský", records: ["@I1@"] }, { value: "Pavlovszký", records: ["@I2@"] }],
    ]);
    expect(variantGroups(records, "place").map((g) => g.variants)).toEqual([
      [{ value: "Lieskovice", records: ["@I1@", "@I3@"] }, { value: "Lieszkovicz", records: ["@I2@", "@F1@"] }],
    ]);
  });

  test("renaming changes only the surname or the town", () => {
    let records = parseGedcom(GED);
    records = renameVariants(records, "surname", ["Pavlovszký"], "Pavlovský");
    records = renameVariants(records, "place", ["Lieszkovicz", "Lieskovice"], "Lieskovice");
    const text = writeGedcom(records);
    expect(text).toContain("1 NAME Michal /Pavlovský/\n2 SURN Pavlovský\n");
    expect(text).toContain("2 PLAC Lieskovice, Nyitra, Hungary\n");
    expect(text).toContain("1 MARR\n2 PLAC Lieskovice\n");
    expect(text).toContain("2 PLAC Lieskovice 12\n");
    expect(text).not.toMatch(/szký|Kollár/);
    expect(variantGroups(records, "surname")).toEqual([]);
  });

  test("nothing to rename keeps the same records", () => {
    const records = parseGedcom(GED);
    expect(renameVariants(records, "surname", ["Kováč"], "Kováč")).toBe(records);
    expect(renameVariants(records, "surname", ["Nikto"], "Novák")).toBe(records);
    // unchanged records keep their original lines
    expect(renameVariants(records, "surname", ["Nosák"], "Novák")[1]).toBe(records[1]);
  });

  test("the old surname can stay as a name with TYPE aka", () => {
    let records = parseGedcom(GED);
    records = renameVariants(records, "surname", ["Pavlovszký"], "Pavlovský", true);
    const text = writeGedcom(records);
    expect(text).toContain("1 NAME Michal /Pavlovský/\n2 SURN Pavlovský\n1 NAME Michal /Pavlovszký/\n2 SURN Pavlovszký\n2 TYPE aka\n");
    // the aka name does not make a new group; renaming back and forth keeps each spelling once per person
    expect(variantGroups(records, "surname")).toEqual([]);
    const back = renameVariants(records, "surname", ["Pavlovský"], "Pavlovszký", true);
    const again = renameVariants(back, "surname", ["Pavlovszký"], "Pavlovský", true);
    const names = writeGedcom(again).match(/^1 NAME .*$/gm)!;
    expect(names.filter((n) => n.includes("Pavlov"))).toEqual([
      "1 NAME Ján /Pavlovský/", "1 NAME Ján /Pavlovszký/",
      "1 NAME Michal /Pavlovský/", "1 NAME Michal /Pavlovszký/", "1 NAME Anna /Pavlovská/"]);
  });
});
