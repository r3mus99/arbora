import { describe, expect, test } from "vitest";
import { addCitationAddresses, citationLinkLines, setCitationLinks } from "./citationLinks";
import { decode, parseGedcom, writeGedcom } from "./index";

const A = "https://example.org/entry/AB12-XY3";
const B = "https://example.org/entry/AB12-XY4";
const FILE = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Maria /Example/
1 BIRT
2 DATE 1717
2 SOUR @S1@
3 PAGE Entry for Maria, ${A}
1 SOUR @S1@
2 NOTE ${B}
0 @I2@ INDI
1 NAME Karl /Example/
1 SOUR @S1@
2 PAGE Page 4
2 NOTE @N1@
1 SOUR @S2@
2 PAGE ${A}
0 @F1@ FAM
1 HUSB @I2@
1 MARR
2 SOUR @S1@
3 DATA
4 TEXT Married (${B}), witnesses unknown
0 @S1@ SOUR
1 TITL Example register
0 @S2@ SOUR
1 TITL Other register
0 @N1@ NOTE See https://example.org/pointer
0 TRLR
`;
const records = parseGedcom(decode(FILE));
const text = (list = records) => writeGedcom(list);

describe("web addresses in the citations of a source", () => {
  test("every address in a PAGE, NOTE or TEXT line of its citations is found, with where it sits", () => {
    const lines = citationLinkLines(records, "@S1@");
    expect(lines.map((l) => [l.holder, l.event, l.url])).toEqual([
      ["@I1@", "BIRT", A], ["@I1@", "", B], ["@F1@", "MARR", B],
    ]);
  });

  test("another source's citations and note records are not listed", () => {
    expect(citationLinkLines(records, "@S2@").map((l) => l.url)).toEqual([A]);
    expect(citationLinkLines(records, "@S9@")).toEqual([]);
  });

  test("editing one address changes only that address, and the rest of the file is the same", () => {
    const [first] = citationLinkLines(records, "@S1@");
    const out = setCitationLinks(records, [{ key: first.key, url: "https://example.org/entry/NEW" }]);
    expect(text(out)).toBe(text().replace(`Entry for Maria, ${A}`, "Entry for Maria, https://example.org/entry/NEW"));
    expect(out.filter((r, i) => r !== records[i]).map((r) => r.xref)).toEqual(["@I1@"]);
    expect(citationLinkLines(out, "@S1@").map((l) => l.url)).toEqual(["https://example.org/entry/NEW", B, B]);
  });

  test("taking an address out keeps the text around it, and a line that held only the address goes away", () => {
    const lines = citationLinkLines(records, "@S1@");
    const out = setCitationLinks(records, [{ key: lines[0].key, url: "" }, { key: lines[1].key, url: "" }, { key: lines[2].key, url: "" }]);
    const written = text(out);
    expect(written).toContain("3 PAGE Entry for Maria\n");
    expect(written).not.toContain(B);
    expect(written).not.toContain("2 NOTE \n");
    expect(written).toContain("4 TEXT Married, witnesses unknown");
    expect(citationLinkLines(out, "@S1@")).toEqual([]);
    expect(citationLinkLines(out, "@S2@").map((l) => l.url)).toEqual([A]);
  });

  test("something that is not a whole web address is ignored", () => {
    const [first] = citationLinkLines(records, "@S1@");
    expect(setCitationLinks(records, [{ key: first.key, url: "not a link" }])).toBe(records);
  });

  test("the edited file survives a write and a read", () => {
    const [first] = citationLinkLines(records, "@S1@");
    const out = parseGedcom(writeGedcom(setCitationLinks(records, [{ key: first.key, url: "https://example.org/x" }])));
    expect(citationLinkLines(out, "@S1@")[0].url).toBe("https://example.org/x");
  });
});

describe("writing an address into a citation that has none", () => {
  const NEWURL = "https://example.org/entry/NEW-9";
  test("a citation without a page line gets one, under the right person and event", () => {
    const out = addCitationAddresses(records, "@S1@", [{ cite: { event: "", person: "@I2@", family: "" }, url: NEWURL }]);
    expect(text(out)).toContain(`1 SOUR @S1@\n2 PAGE Page 4\n2 NOTE @N1@\n`.replace("2 PAGE Page 4", `2 PAGE Page 4 ${NEWURL}`));
    expect(out.filter((r, i) => r !== records[i]).map((r) => r.xref)).toEqual(["@I2@"]);
    const bare = parseGedcom(decode("0 HEAD\n0 @I1@ INDI\n1 BIRT\n2 SOUR @S1@\n0 @S1@ SOUR\n1 TITL T\n0 TRLR\n"));
    const done = addCitationAddresses(bare, "@S1@", [{ cite: { event: "BIRT", person: "@I1@", family: "" }, url: NEWURL }]);
    expect(text(done)).toContain(`2 SOUR @S1@\n3 PAGE ${NEWURL}`);
    expect(citationLinkLines(done, "@S1@").map((l) => [l.holder, l.event, l.url])).toEqual([["@I1@", "BIRT", NEWURL]]);
  });

  test("a marriage citation of a family gets its address", () => {
    const out = addCitationAddresses(records, "@S1@", [{ cite: { event: "MARR", person: "", family: "@F1@" }, url: NEWURL }]);
    expect(citationLinkLines(out, "@S1@").some((l) => l.holder === "@F1@" && l.url === NEWURL)).toBe(true);
  });

  test("a place that does not cite the source, or something that is not an address, changes nothing", () => {
    expect(addCitationAddresses(records, "@S1@", [{ cite: { event: "DEAT", person: "@I1@", family: "" }, url: NEWURL }])).toEqual(records);
    expect(addCitationAddresses(records, "@S1@", [{ cite: { event: "", person: "@I2@", family: "" }, url: "no" }])).toEqual(records);
  });
});
