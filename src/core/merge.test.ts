import { describe, expect, test } from "vitest";
import { mergeBlocker, mergeConflicts, mergePeople, parseGedcom, personFields, writeGedcom } from "./index";

const FILE = [
  "0 HEAD", "1 CHAR UTF-8",
  "0 @I1@ INDI", "1 NAME Jan /Test/", "1 SEX M", "1 BIRT", "2 DATE 1 JAN 1900", "1 FAMC @F1@", "1 FAMS @F2@",
  "0 @I2@ INDI", "1 NAME Johann /Test/", "1 SEX M", "1 BIRT", "2 DATE 2 JAN 1900", "2 PLAC Town", "1 OCCU smith", "1 FAMC @F1@", "1 FAMS @F3@",
  "0 @I3@ INDI", "1 NAME Eva /Test/", "1 SEX F", "1 FAMS @F2@",
  "0 @I4@ INDI", "1 NAME Anna /Test/", "1 SEX F", "1 FAMS @F3@",
  "0 @I5@ INDI", "1 NAME Karel /Test/", "1 FAMC @F3@", "1 ASSO @I2@", "2 RELA godfather",
  "0 @I6@ INDI", "1 NAME Pavol /Test/", "1 SEX M", "1 FAMS @F1@",
  "0 @F1@ FAM", "1 HUSB @I6@", "1 CHIL @I1@", "1 CHIL @I2@",
  "0 @F2@ FAM", "1 HUSB @I1@", "1 WIFE @I3@",
  "0 @F3@ FAM", "1 HUSB @I2@", "1 WIFE @I4@", "1 CHIL @I5@",
  "0 TRLR",
].join("\n") + "\n";
const recs = () => parseGedcom(FILE);

describe("merging two people", () => {
  test("the kept person takes the rows and families of the removed one", () => {
    const out = writeGedcom(mergePeople(recs(), "@I1@", "@I2@", { name: "keep", birth: "drop" }));
    expect(out).not.toContain("@I2@");
    expect(out).toContain("1 OCCU smith");
    expect(out).toMatch(/0 @I1@ INDI\n1 NAME Jan \/Test\/[\s\S]*1 BIRT\n2 DATE 2 JAN 1900\n2 PLAC Town/);
    // the families of the removed person now belong to the kept one; the shared parents are listed once
    expect(out).toContain("0 @F3@ FAM\n1 HUSB @I1@\n1 WIFE @I4@\n1 CHIL @I5@");
    expect(out).toContain("0 @F1@ FAM\n1 HUSB @I6@\n1 CHIL @I1@\n0 @F2@");
    expect(out.match(/1 FAMC @F1@/g)).toHaveLength(1);
    expect(out).toMatch(/0 @I1@ INDI[\s\S]*1 FAMS @F2@\n1 FAMS @F3@/);
    // the association pointing at the removed person points at the kept one
    expect(out).toContain("1 ASSO @I1@\n2 RELA godfather");
    // the other name stays as another form of the name
    expect(out).toContain("2 TYPE aka");
  });

  test("the default for a conflict is the kept person, and conflicts are listed", () => {
    const [a, b] = ["@I1@", "@I2@"].map((x) => personFields(recs().find((r) => r.xref === x)!));
    expect(mergeConflicts(a, b)).toEqual(["name", "birth"]);
    const out = writeGedcom(mergePeople(recs(), "@I1@", "@I2@"));
    expect(out).toContain("2 DATE 1 JAN 1900");
    expect(out).not.toContain("2 DATE 2 JAN 1900");
  });

  test("people who belong to one family cannot be merged", () => {
    expect(mergeBlocker(recs(), "@I1@", "@I3@")).toBe("related");
    expect(mergeBlocker(recs(), "@I1@", "@I1@")).toBe("same");
    expect(mergeBlocker(recs(), "@I5@", "@I4@")).toBe("related");
    expect(mergeBlocker(recs(), "@I1@", "@I4@")).toBeNull();
    expect(() => mergePeople(recs(), "@I1@", "@I3@")).toThrow("cannot be merged");
  });
});
