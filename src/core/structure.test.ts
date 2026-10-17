import { describe, expect, test } from "vitest";
import { addFamily, addPerson, deleteFamily, deletePerson, parseGedcom, writeGedcom } from "./index";

const FILE = [
  "0 HEAD", "1 CHAR UTF-8",
  "0 @I1@ INDI", "1 NAME Adam /Test/", "1 SEX M", "1 FAMS @F1@",
  "0 @I2@ INDI", "1 NAME Eve /Test/", "1 SEX F", "1 FAMS @F1@",
  "0 @I3@ INDI", "1 NAME Cain /Test/", "1 SEX M", "1 FAMC @F1@", "1 ASSO @I1@", "2 RELA godfather",
  "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@",
  "0 TRLR",
].join("\n") + "\n";
const text = (records: ReturnType<typeof parseGedcom>) => writeGedcom(records);

describe("adding and removing people and families", () => {
  test("a new person gets the next free ID and goes before the trailer", () => {
    const { records, id } = addPerson(parseGedcom(FILE), "F");
    expect(id).toBe("@I4@");
    expect(text(records)).toBe(FILE.replace("0 TRLR", "0 @I4@ INDI\n1 NAME //\n1 SEX F\n0 TRLR"));
  });

  test("a new family links the husband, wife and children in both directions", () => {
    const base = addPerson(addPerson(parseGedcom(FILE), "F").records, "M");
    const { records, id } = addFamily(base.records, "@I4@", { spouse: "@I5@", children: ["@I3@"] });
    expect(id).toBe("@F6@");
    const out = text(records);
    expect(out).toContain("0 @F6@ FAM\n1 HUSB @I5@\n1 WIFE @I4@\n1 CHIL @I3@\n");
    expect(out).toMatch(/0 @I4@ INDI\n1 NAME \/\/\n1 SEX F\n1 FAMS @F6@\n/);
    expect(out).toMatch(/0 @I3@ INDI[\s\S]*1 FAMC @F1@\n1 FAMC @F6@\n/);
    // unrelated records are written back unchanged
    expect(out.startsWith(FILE.split("0 @I1@")[0])).toBe(true);
  });

  test("deleting a family removes the pointers to it and nothing else", () => {
    const out = text(deleteFamily(parseGedcom(FILE), "@F1@"));
    expect(out).not.toContain("@F1@");
    expect(out).toContain("0 @I1@ INDI\n1 NAME Adam /Test/\n1 SEX M\n0 @I2@ INDI");
  });

  test("deleting a person cleans every pointer to them", () => {
    const out = text(deletePerson(parseGedcom(FILE), "@I3@"));
    expect(out).not.toContain("@I3@");
    expect(out).toContain("0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@\n0 TRLR");
    const noAsso = text(deletePerson(parseGedcom(FILE), "@I1@"));
    expect(noAsso).not.toContain("@I1@");
    expect(noAsso).not.toContain("godfather");
    expect(noAsso).toContain("1 WIFE @I2@\n1 CHIL @I3@");
  });

  test("a family left with nobody is removed and its members lose the pointer", () => {
    let records = deletePerson(parseGedcom(FILE), "@I3@");
    records = deletePerson(records, "@I1@");
    records = deletePerson(records, "@I2@");
    const out = text(records);
    expect(out).not.toContain("FAM");
    expect(out).not.toContain("@F1@");
  });

  test("the whole group is one record list, ready for one undo step", () => {
    const records = parseGedcom(FILE);
    const added = addPerson(records).records;
    expect(added).not.toBe(records);
    expect(records.length).toBe(6);
  });

  test("the new ID takes the most used prefix of its record type and a number above every number in the file", () => {
    const mixed = parseGedcom("0 HEAD\n0 @P3@ INDI\n0 @P9@ INDI\n0 @X20@ INDI\n0 @R7@ FAM\n0 @S40@ SOUR\n0 TRLR\n");
    expect(addPerson(mixed).id).toBe("@P41@");
    expect(addFamily(mixed, "@P3@").id).toBe("@R41@");
    expect(addPerson(parseGedcom("0 HEAD\n0 TRLR\n")).id).toBe("@I1@");
  });
});

describe("a new person from a form", () => {
  test("is written with name, sex, birth and death, and the family they are a child of", async () => {
    const { personRecord } = await import("./index");
    const rec = personRecord("@I9@", { given: "Eva", surname: "Test", sex: "F", birth: "5 MAY 1900", deceased: true, death: "" }, "@F1@");
    expect(writeGedcom([rec])).toBe("0 @I9@ INDI\n1 NAME Eva /Test/\n1 SEX F\n1 BIRT\n2 DATE 5 MAY 1900\n1 DEAT Y\n1 FAMC @F1@\n");
    const alive = personRecord("@I10@", { given: "Adam", surname: "", sex: "", birth: "", deceased: false, death: "1 JAN 1950" });
    expect(writeGedcom([alive])).toBe("0 @I10@ INDI\n1 NAME Adam //\n");
  });
});
