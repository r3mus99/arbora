import { describe, expect, test } from "vitest";
import { countryOf, keptByDefault, parseGedcom, renameVariants, similar, spellings, spellingKey, variantGroups, writeGedcom } from "./index";

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
    // places are compared by town and house number and listed as a whole, in the order of use
    expect(variantGroups(records, "place").map((g) => g.variants.map((v) => [v.value, v.records]))).toEqual([[
      ["Lieskovice, Senica, Slovensko", ["@I1@"]],
      ["Lieszkovicz", ["@F1@"]], ["Lieszkovicz, Nyitra, Hungary", ["@I2@"]],
    ]]);
  });

  test("renaming changes only the surname or the town", () => {
    let records = parseGedcom(GED);
    records = renameVariants(records, "surname", ["Pavlovszký"], "Pavlovský");
    records = renameVariants(records, "place", ["Lieszkovicz", "Lieszkovicz, Nyitra, Hungary", "Lieskovice 12"],
                             "Lieskovice, Senica, Slovensko");
    const text = writeGedcom(records);
    expect(text).toContain("1 NAME Michal /Pavlovský/\n2 SURN Pavlovský\n");
    expect(text.match(/PLAC Lieskovice, Senica, Slovensko\n/g)).toHaveLength(4);
    expect(text).not.toMatch(/Lieszkovicz|Nyitra|Lieskovice 12/);
    expect(variantGroups(records, "place")).toEqual([]);
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

describe("other names of a person", () => {
  const OTHER = `0 HEAD
0 @I1@ INDI
1 NAME Alberta /Mondová/
1 NAME Albertina /Mondova/
1 NAME Berta /Mondová/
2 TYPE aka
1 SEX F
0 @I2@ INDI
1 NAME Karol /Tester/
0 TRLR
`;

  test("only the main name takes part in the variants, other names are not offered", () => {
    const records = parseGedcom(OTHER);
    expect([...spellings(records, "given").keys()].sort()).toEqual(["Alberta", "Karol"]);
    expect([...spellings(records, "surname").keys()]).toEqual(["Mondová", "Tester"]);
    expect(variantGroups(records, "given")).toEqual([]);
    expect(variantGroups(records, "surname")).toEqual([]);
  });

  test("renaming leaves the other names of the person alone", () => {
    const records = parseGedcom(OTHER);
    const text = writeGedcom(renameVariants(records, "surname", ["Mondová"], "Mondova"));
    expect(text).toContain("1 NAME Alberta /Mondova/\n1 NAME Albertina /Mondova/\n1 NAME Berta /Mondová/\n2 TYPE aka\n");
    const given = writeGedcom(renameVariants(records, "given", ["Alberta"], "Albertína"));
    expect(given).toContain("1 NAME Albertína /Mondová/\n1 NAME Albertina /Mondova/\n1 NAME Berta /Mondová/");
  });
});

describe("places as a whole", () => {
  const PLACES = `0 HEAD
0 @I1@ INDI
1 BIRT
2 PLAC Ostbach, Nordkreis, Region of Nordland, Westmark
0 @I2@ INDI
1 BIRT
2 PLAC Ostbach, Nordkreis, Region of Nordland, Westmark
0 @I3@ INDI
1 BIRT
2 PLAC Ostbach
0 @I4@ INDI
1 BIRT
2 PLAC Ostbach 19
0 @I5@ INDI
1 BIRT
2 PLAC Ostbach, Nordkreis, Nordland-Region, Westmarken
0 @I6@ INDI
1 BIRT
2 PLAC Ostbach, Nordkreis, Altmark
0 @I7@ INDI
1 BIRT
2 PLAC Weststadt
0 TRLR
`;

  test("the town address and each house number are separate groups", () => {
    const more = `0 @I8@ INDI
1 BIRT
2 PLAC Ostbach 19, Nordkreis, Westmark
0 @I9@ INDI
1 BIRT
2 PLAC Ostbach 22
0 @I10@ INDI
1 BIRT
2 PLAC Ostbach 22, Nordkreis
0 TRLR
`;
    const groups = variantGroups(parseGedcom(PLACES.replace("0 TRLR\n", "") + more), "place");
    const sets = groups.map((g) => g.variants.map((v) => v.value).sort()).sort((a, b) => a[0].localeCompare(b[0]));
    expect(sets).toEqual([
      ["Ostbach", "Ostbach, Nordkreis, Altmark", "Ostbach, Nordkreis, Nordland-Region, Westmarken",
        "Ostbach, Nordkreis, Region of Nordland, Westmark"],
      ["Ostbach 19", "Ostbach 19, Nordkreis, Westmark"],
      ["Ostbach 22", "Ostbach 22, Nordkreis"],
    ]);
    expect(groups.flatMap((g) => g.variants).find((v) => v.value === "Ostbach 19")?.number).toBe("19");
  });

  test("a lone house number is no group and only other countries are kept", () => {
    const group = variantGroups(parseGedcom(PLACES), "place")[0];
    expect(group.variants.map((v) => v.value)).not.toContain("Ostbach 19");
    expect([...keptByDefault(group, group.variants[0].value)]).toEqual([]);
    expect(countryOf("Lieskovice, Senica, Slovakia")).toBe("slovakia");
    expect(countryOf("Lieskovice, Senica, Slovensko")).toBe("slovakia");
    expect(countryOf("Lieskovice, Senica, Československo")).toBe("czechoslovakia");
    expect(countryOf("Lieskovice, Senica, Region of Žilina")).toBeUndefined();
    expect(countryOf("Slovensko")).toBeUndefined();
    const mixed = parseGedcom(`0 HEAD
0 @I1@ INDI
1 BIRT
2 PLAC Lieskovice, Senica, Slovensko
0 @I2@ INDI
1 BIRT
2 PLAC Lieskovice, Senica, Slovakia
0 @I3@ INDI
1 BIRT
2 PLAC Lieskovice, Senica, Czechoslovakia
0 @I4@ INDI
1 BIRT
2 PLAC Lieskovice
0 TRLR
`);
    const g = variantGroups(mixed, "place")[0];
    expect([...keptByDefault(g, "Lieskovice, Senica, Slovensko")]).toEqual(["Lieskovice, Senica, Czechoslovakia"]);
  });

  test("unifying replaces whole places and leaves the others alone", () => {
    const records = parseGedcom(PLACES);
    const out = renameVariants(records, "place", ["Ostbach", "Ostbach, Nordkreis, Altmark"],
                               "Ostbach, Nordkreis, Region of Nordland, Westmark");
    expect(out.filter((r, i) => r !== records[i]).map((r) => r.xref)).toEqual(["@I3@", "@I6@"]);
    expect(writeGedcom(out)).toContain("0 @I4@ INDI\n1 BIRT\n2 PLAC Ostbach 19\n");
  });
});

describe("given names", () => {
  const GIVEN = `0 HEAD
0 @I1@ INDI
1 NAME Katarína Mária /Horák/
0 @I2@ INDI
1 NAME Katerína /Novák/
2 GIVN Katerína
0 @I3@ INDI
1 NAME Alexander /Kolar/
0 @I4@ INDI
1 NAME Alexandra /Kolarová/
0 @I5@ INDI
1 NAME Jan /Lenz/
0 @I6@ INDI
1 NAME Ján /Lenz/
0 @I7@ INDI
1 NAME J. /Lenz/
0 TRLR
`;

  test("spelling variants are grouped, different names are not", () => {
    const groups = variantGroups(parseGedcom(GIVEN), "given");
    expect(groups.map((g) => g.variants.map((v) => v.value).sort())).toEqual([["Jan", "Ján"], ["Katarína", "Katerína"]]);
    expect(similar("Alexander", "Alexandra", "given")).toBe(false);
  });

  test("renaming changes the words of the given name only", () => {
    const records = parseGedcom(GIVEN);
    const out = writeGedcom(renameVariants(records, "given", ["Katerína"], "Katarína"));
    expect(out).toContain("1 NAME Katarína /Novák/\n2 GIVN Katarína");
    expect(out).toContain("1 NAME Katarína Mária /Horák/");
    const jan = writeGedcom(renameVariants(records, "given", ["Jan"], "Ján"));
    expect(jan).toContain("1 NAME Ján /Lenz/");
    expect(jan).toContain("1 NAME J. /Lenz/");
  });
});
