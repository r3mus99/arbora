import { describe, expect, test } from "vitest";
import { addSourceCitation, isWebAddress, setSourceFields } from "./sourceLinks";
import { decode, lookupOf, parseGedcom, sourceOverview, annotations, citationLinks, writeGedcom, type GedNode } from "./index";
import { SOURCES_GED } from "./fixtures/sources";

const records = parseGedcom(decode(SOURCES_GED));
const rec = (list: GedNode[], xref: string) => list.find((r) => r.xref === xref)!;
const NEW = "https://example.org/new-scan";
const fieldsOf = (xref: string, list = records) => sourceOverview(list).sources.find((s) => s.key === xref)!.fields;

describe("editing a source record", () => {
  test("only web addresses count as addresses", () => {
    expect(isWebAddress(NEW)).toBe(true);
    expect(isWebAddress("ftp://example.org")).toBe(false);
    expect(isWebAddress("see https://example.org")).toBe(false);
  });

  test("the panel shows the record's own title, author, publication, notes and addresses", () => {
    expect(fieldsOf("@S1@")).toEqual({
      title: "Parish register of Sampletown", author: "Example Parish Office", publication: "Handwritten, 1840-1900, Example Index",
      notes: [], links: [],
    });
  });

  test("saving the fields changes the record, and the timeline shows the new text", () => {
    const f = { ...fieldsOf("@S1@"), title: "Baptism register", author: "Parish office", publication: "Register, vol. 4", notes: ["Entry for Anna, 11 May 1753"], links: [NEW] };
    const out = setSourceFields(records, "@S1@", f);
    expect(fieldsOf("@S1@", out)).toEqual(f);
    const birth = rec(out, "@I1@").children.find((c) => c.tag === "BIRT")!;
    const cited = annotations(birth, lookupOf(out)).sources.find((c) => c.xref === "@S1@")!;
    expect(cited.title).toBe("Baptism register");
    expect(citationLinks(cited).map((l) => l.href)).toContain(NEW);
  });

  test("the other records stay as they were, and the saved record survives a write and read", () => {
    const out = setSourceFields(records, "@S1@", { ...fieldsOf("@S1@"), links: [NEW] });
    expect(out.every((r, i) => r.xref === "@S1@" || r === records[i])).toBe(true);
    expect(fieldsOf("@S1@", parseGedcom(writeGedcom(out))).links).toEqual([NEW]);
  });

  test("references, dates and the note pointer of the record are kept", () => {
    const out = setSourceFields(records, "@S1@", { ...fieldsOf("@S1@"), title: "Renamed" });
    const kept = rec(out, "@S1@").children.map((c) => c.tag);
    expect(kept).toContain("REPO");
    expect(kept).toContain("WWW");
    expect(rec(out, "@S1@").children.find((c) => c.tag === "TITL")?.value).toBe("Renamed");
  });

  test("an empty title keeps the old one; an address that is not one is dropped", () => {
    const out = setSourceFields(records, "@S1@", { ...fieldsOf("@S1@"), title: " ", links: ["nonsense", NEW] });
    expect(rec(out, "@S1@").children.find((c) => c.tag === "TITL")?.value).toBe("Parish register of Sampletown");
    expect(fieldsOf("@S1@", out).links).toEqual([NEW]);
  });

  test("a source that is not in the file changes nothing", () => {
    expect(setSourceFields(records, "@S9@", fieldsOf("@S1@"))).toBe(records);
  });
});

describe("citing a source for a person", () => {
  const I2 = "@I2@";
  test("the whole person, then a birth event that is added when missing", () => {
    const whole = addSourceCitation(records, "@S2@", I2, "");
    expect(rec(whole, I2).children.filter((c) => c.tag === "SOUR").map((c) => c.value)).toContain("@S2@");
    const birth = addSourceCitation(whole, "@S2@", I2, "BIRT");
    const ev = rec(birth, I2).children.find((c) => c.tag === "BIRT")!;
    expect(ev.children.map((c) => c.value)).toEqual(["@S2@"]);
    const cited = annotations(ev, lookupOf(birth)).sources[0];
    expect(cited.title).toBe("Census 1869");
  });

  test("citing the same source twice changes nothing, and an unknown person or source changes nothing", () => {
    const once = addSourceCitation(records, "@S1@", "@I1@", "BIRT");
    expect(addSourceCitation(once, "@S1@", "@I1@", "BIRT")).toBe(once);
    expect(addSourceCitation(records, "@S1@", "@I99@", "")).toBe(records);
    expect(addSourceCitation(records, "@S99@", "@I1@", "")).toBe(records);
  });
});
