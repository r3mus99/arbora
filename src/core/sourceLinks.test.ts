import { describe, expect, test } from "vitest";
import { addSourceLink, isWebAddress, removeSourceLink } from "./sourceLinks";
import { decode, lookupOf, parseGedcom, sourceOverview, annotations, citationLinks, writeGedcom } from "./index";
import { SOURCES_GED } from "./fixtures/sources";

const records = parseGedcom(decode(SOURCES_GED));
const rec = (list: typeof records, xref: string) => list.find((r) => r.xref === xref)!;
const NEW = "https://example.org/new-scan";

describe("links of a source record", () => {
  test("only web addresses are accepted", () => {
    expect(isWebAddress(NEW)).toBe(true);
    expect(isWebAddress("ftp://example.org")).toBe(false);
    expect(isWebAddress("see https://example.org")).toBe(false);
    expect(addSourceLink(records, "@S1@", "not a link")).toBe(records);
  });

  test("adding a link writes one NOTE line on that source and leaves every other record as it was", () => {
    const out = addSourceLink(records, "@S1@", NEW);
    expect(rec(out, "@S1@").children.filter((c) => c.tag === "NOTE").map((c) => c.value)).toEqual([NEW]);
    expect(rec(out, "@S1@").children.find((c) => c.tag === "WWW")?.value).toBe("https://example.org/register");
    records.forEach((r, i) => { if (r.xref !== "@S1@") expect(out[i]).toBe(r); });
  });

  test("adding the same address twice changes nothing", () => {
    const once = addSourceLink(records, "@S1@", NEW);
    expect(addSourceLink(once, "@S1@", NEW)).toBe(once);
  });

  test("removing a link takes out only that NOTE line", () => {
    const added = addSourceLink(records, "@S1@", NEW);
    const out = removeSourceLink(added, "@S1@", NEW);
    expect(rec(out, "@S1@").children.some((c) => c.tag === "NOTE")).toBe(false);
    expect(rec(out, "@S1@").children.some((c) => c.tag === "WWW")).toBe(true);
  });

  test("a link the file has as WWW or in PUBL cannot be removed from the panel", () => {
    expect(removeSourceLink(records, "@S1@", "https://example.org/register")).toBe(records);
  });

  test("an added link shows on the timeline citation of every event that cites the source", () => {
    const out = addSourceLink(records, "@S1@", NEW);
    const overview = sourceOverview(out);
    const entry = overview.sources.find((s) => s.key === "@S1@")!;
    expect(entry.ownLinks).toEqual([NEW]);
    // the event under the person's birth (the file's own citation of @S1@)
    const birth = rec(out, "@I1@").children.find((c) => c.tag === "BIRT")!;
    const cited = annotations(birth, lookupOf(out)).sources.find((c) => c.xref === "@S1@")!;
    expect(citationLinks(cited).map((l) => l.href)).toContain(NEW);
    // and the same after writing and reading the file again
    const reread = parseGedcom(writeGedcom(out));
    expect(sourceOverview(reread).sources.find((s) => s.key === "@S1@")!.ownLinks).toEqual([NEW]);
  });
});
