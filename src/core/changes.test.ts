import { describe, expect, test } from "vitest";
import { readableFields, recordChanges } from "./changes";
import { parseGedcom } from "./gedcom";

const recs = (s: string) => parseGedcom(s);
const A = recs("0 HEAD\n0 @I1@ INDI\n1 NAME Anna /Test/\n1 BIRT\n2 DATE 1 JAN 1900\n0 @I2@ INDI\n1 NAME Bob /Test/\n0 TRLR\n");

describe("record changes", () => {
  test("the same records have no changes", () => {
    expect(recordChanges(A, [...A])).toEqual([]);
  });

  test("a changed line shows old and new value, other records are left out", () => {
    const b = [...A];
    b[1] = recs("0 @I1@ INDI\n1 NAME Anna /Test/\n1 BIRT\n2 DATE 2 JAN 1900\n")[0];
    expect(recordChanges(A, b)).toEqual([
      { xref: "@I1@", tag: "INDI", title: "Anna Test", kind: "changed",
        fields: [{ path: "BIRT/DATE", before: "1 JAN 1900", after: "2 JAN 1900" }] },
    ]);
  });

  test("added and removed lines and records", () => {
    const b = [A[0], recs("0 @I1@ INDI\n1 NAME Anna /Test/\n1 SEX F\n")[0], A[3]];
    const changes = recordChanges(A, b);
    expect(changes).toHaveLength(2);
    expect(changes[0].fields).toEqual(expect.arrayContaining([
      { path: "SEX", before: null, after: "F" }, { path: "BIRT", before: "", after: null }, { path: "BIRT/DATE", before: "1 JAN 1900", after: null }]));
    expect(changes[1]).toMatchObject({ xref: "@I2@", kind: "removed" });
    const added = recordChanges(A, [...A.slice(0, 3), recs("0 @I9@ INDI\n1 NAME New /One/\n")[0], A[3]]);
    expect(added).toMatchObject([{ xref: "@I9@", kind: "added", fields: [{ path: "NAME", before: null, after: "New /One/" }] }]);
  });

  test("an edit that was changed back shows nothing", () => {
    const b = [...A];
    b[1] = recs("0 @I1@ INDI\n1 NAME Anna /Test/\n1 BIRT\n2 DATE 1 JAN 1900\n")[0];
    expect(recordChanges(A, b)).toEqual([]);
  });

  test("repeated lines are compared in order", () => {
    const x = recs("0 @I1@ INDI\n1 NAME A\n1 NAME B\n"), y = recs("0 @I1@ INDI\n1 NAME A\n1 NAME C\n");
    expect(recordChanges(x, y)[0].fields).toEqual([{ path: "NAME", before: "B", after: "C" }]);
  });

  test("readable lines leave out the name of an added person and empty lines whose sub-lines changed", () => {
    const [c] = recordChanges(A, [...A.slice(0, 3), recs("0 @I9@ INDI\n1 NAME New /One/\n1 BIRT\n2 DATE 1997\n")[0], A[3]]);
    expect(readableFields(c).map((f) => f.path)).toEqual(["BIRT/DATE"]);
  });
});
