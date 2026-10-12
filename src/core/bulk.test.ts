/** Bulk fixes and the file check must change only the lines they are meant to change. */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { checkGedcom, decode, fixIssue, parseGedcom, renameVariants, variantGroups, writeGedcom } from "./index";

/** the lines only in `a` and only in `b` (each line counted), in file order */
function lineDiff(a: string, b: string) {
  const count = (lines: string[]) => lines.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map<string, number>());
  const ca = count(a.split("\n")), cb = count(b.split("\n"));
  const only = (x: Map<string, number>, y: Map<string, number>) =>
    [...x].flatMap(([l, n]) => Array<string>(Math.max(0, n - (y.get(l) || 0))).fill(l));
  return { removed: only(ca, cb), added: only(cb, ca) };
}

describe("unifying spellings", () => {
  // the same words in places where they must not be touched: notes, sources, other tags, an unknown tag
  const GED = `0 HEAD
0 @I1@ INDI
1 NAME Karl /Weidenbaum/
1 BIRT
2 PLAC Ostbach, Nordkreis
2 NOTE Born in Ostbach, Nordkreis, says the family.
1 _HOME Ostbach, Nordkreis
1 SOUR @S1@
2 PAGE Ostbach, Nordkreis
0 @I2@ INDI
1 NAME Paul /Weydenbaum/
2 TYPE aka
1 NAME Paul /Weidenbaum/
1 BIRT
2 PLAC Osttbach, Nordkreis
1 EVEN
2 TYPE Weydenbaum family gathering
0 @I3@ INDI
1 NAME Anna /Weydenbaum/
0 @S1@ SOUR
1 TITL Weydenbaum chronicle
0 TRLR
`;
  const records = parseGedcom(GED);

  test("a place is renamed only in PLAC lines", () => {
    const [group] = variantGroups(records, "place");
    const [keep, ...rest] = group.variants.map((v) => v.value);
    const out = writeGedcom(renameVariants(records, "place", rest, keep));
    const { removed, added } = lineDiff(GED, out);
    expect(removed).toHaveLength(1);
    expect(removed[0]).toMatch(/^2 PLAC /);
    expect(added).toHaveLength(1);
    expect(added[0]).toBe(`2 PLAC ${keep}`);
  });

  test("a surname is renamed only in NAME lines, aka names and other text stay", () => {
    const groups = variantGroups(records, "surname");
    expect(groups.length).toBeGreaterThan(0);
    const out = writeGedcom(renameVariants(records, "surname", ["Weydenbaum"], "Weidenbaum"));
    const { removed, added } = lineDiff(GED, out);
    for (const l of [...removed, ...added]) expect(l).toMatch(/^1 NAME /);
    expect(out).toContain("1 NAME Anna /Weidenbaum/");
    expect(out).toContain("1 NAME Paul /Weydenbaum/\n2 TYPE aka");
    expect(out).toContain("1 EVEN\n2 TYPE Weydenbaum family gathering");
    expect(out).toContain("1 TITL Weydenbaum chronicle");
  });
});

describe("fixing the file", () => {
  const BROKEN = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Emil /Ferber/
1 BIRT
2 DATE 1885-12-12
2 _KEEP unknown
1 FAMS @F1@
1 FAMS @F9@
1 _OTHER also unknown
0 @I2@ INDI
1 NAME Greta /Holm/
0 @I3@ INDI
1 NAME Ida /Ferber/
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I8@
1 NOTE a note that stays
`;
  const records = parseGedcom(BROKEN);
  const issues = checkGedcom(records).filter((i) => i.fixable);

  test("each fix changes at most one line, or two when it rewrites one", () => {
    expect(issues.length).toBeGreaterThan(3);
    for (const issue of issues) {
      const { removed, added } = lineDiff(BROKEN, writeGedcom(fixIssue(records, issue)));
      expect(removed.length, `${issue.kind} removes`).toBeLessThanOrEqual(1);
      expect(added.length, `${issue.kind} adds`).toBeLessThanOrEqual(2);
    }
  });

  test("unknown tags and notes survive every fix", () => {
    let current = records;
    for (const issue of issues) current = fixIssue(current, checkGedcom(current).find((i) => i.fixable && i.kind === issue.kind) || issue);
    const out = writeGedcom(current);
    for (const keep of ["2 _KEEP unknown", "1 _OTHER also unknown", "1 NOTE a note that stays"]) expect(out).toContain(keep);
  });

  test("checking the file changes nothing", () => {
    checkGedcom(records);
    expect(writeGedcom(records)).toBe(BROKEN);
  });
});

describe("the sample", () => {
  const sample = parseGedcom(decode(readFileSync(new URL("../../public/sample.ged", import.meta.url))));
  const text = writeGedcom(sample);

  test("checking and looking for variants change nothing", () => {
    checkGedcom(sample);
    variantGroups(sample, "surname");
    variantGroups(sample, "place");
    expect(writeGedcom(sample)).toBe(text);
  });

  test("every fix of the sample changes at most a line or two", () => {
    for (const issue of checkGedcom(sample).filter((i) => i.fixable).slice(0, 30)) {
      const { removed, added } = lineDiff(text, writeGedcom(fixIssue(sample, issue)));
      expect(removed.length).toBeLessThanOrEqual(1);
      expect(added.length).toBeLessThanOrEqual(2);
    }
  });
});
