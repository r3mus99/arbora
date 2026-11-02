import { describe, expect, test } from "vitest";
import { addCite, citeKey, deleteSource, removeCite, saveSource, sourceCites, isWebAddress, setSourceFields, type SourceCite } from "./sourceLinks";
import { childOf, decode, lookupOf, parseGedcom, sourceOverview, annotations, citationLinks, writeGedcom, type GedNode } from "./index";
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

const fam = () => records.find((r) => r.tag === "FAM")!.xref!;
const whole = (person: string): SourceCite => ({ event: "", person, family: "" });
const at = (event: SourceCite["event"], person: string): SourceCite => ({ event, person, family: "" });
const marriage = (): SourceCite => ({ event: "MARR", person: "", family: fam() });

describe("where a source is cited", () => {
  test("the places are listed: the person, their events and a marriage", () => {
    const keys = sourceCites(records, "@S1@").map(citeKey);
    expect(keys).toContain(citeKey(at("BIRT", "@I1@")));
    expect(keys).toContain(citeKey(marriage()));
  });

  test("citing the whole person and a birth event that is added when missing", () => {
    const out = addCite(addCite(records, "@S2@", whole("@I2@")), "@S2@", at("BIRT", "@I2@"));
    const ev = rec(out, "@I2@").children.find((c) => c.tag === "BIRT")!;
    expect(ev.children.map((c) => c.value)).toEqual(["@S2@"]);
    expect(annotations(ev, lookupOf(out)).sources[0].title).toBe("Census 1869");
    expect(sourceCites(out, "@S2@").map(citeKey)).toEqual(expect.arrayContaining([citeKey(whole("@I2@")), citeKey(at("BIRT", "@I2@"))]));
  });

  test("citing twice, or for a person, family or source that is not in the file, changes nothing", () => {
    const once = addCite(records, "@S1@", at("BIRT", "@I2@"));
    expect(addCite(once, "@S1@", at("BIRT", "@I2@"))).toBe(once);
    expect(addCite(records, "@S1@", whole("@I99@"))).toBe(records);
    expect(addCite(records, "@S99@", whole("@I1@"))).toBe(records);
  });

  test("a marriage is cited on the family record and keeps the citation it had", () => {
    const out = addCite(records, "@S2@", marriage());
    const values = childOf(out.find((r) => r.xref === fam())!, "MARR")!.children.map((c) => c.value);
    expect(values).toEqual(expect.arrayContaining(["@S1@", "@S2@"]));
  });

  test("a citation directly under a family is listed and can be removed", () => {
    const fam = parseGedcom(decode("0 HEAD\n0 @F1@ FAM\n1 SOUR @S1@\n2 PAGE https://example.org/a\n1 NOTE keep\n0 @S1@ SOUR\n1 TITL Book\n0 TRLR"));
    const cites = sourceCites(fam, "@S1@");
    expect(cites).toEqual([{ event: "", person: "", family: "@F1@" }]);
    const out = removeCite(fam, "@S1@", cites[0]);
    expect(sourceCites(out, "@S1@")).toEqual([]);
    expect(rec(out, "@F1@").children.map((c) => c.tag)).toEqual(["NOTE"]);
  });

  test("a residence is added to the person", () => {
    const out = addCite(records, "@S2@", at("RESI", "@I2@"));
    expect(childOf(rec(out, "@I2@"), "RESI")!.children.map((c) => c.value)).toEqual(["@S2@"]);
  });

  test("removing a citation drops only that source; an event line left empty goes, one with a date stays", () => {
    const added = addCite(records, "@S2@", at("RESI", "@I2@"));
    expect(childOf(rec(removeCite(added, "@S2@", at("RESI", "@I2@")), "@I2@"), "RESI")).toBeNull();
    const out = removeCite(records, "@S1@", at("BIRT", "@I1@"));
    const birth = childOf(rec(out, "@I1@"), "BIRT")!;
    expect(birth.children.some((c) => c.tag === "SOUR")).toBe(false);
    expect(birth.children.some((c) => c.tag === "DATE")).toBe(true);
    expect(removeCite(records, "@S2@", at("BIRT", "@I1@"))).toBe(records);
  });
});

describe("saving and deleting a source", () => {
  test("a new source gets a free xref and its fields and citations", () => {
    const fields = { title: "Census 1880", author: "", publication: "", notes: ["From the town hall"], links: [NEW] };
    const { records: out, xref } = saveSource(records, null, fields, [], [at("BIRT", "@I2@")]);
    expect(records.some((r) => r.xref === xref)).toBe(false);
    expect(fieldsOf(xref, out)).toEqual(fields);
    expect(sourceCites(out, xref).map(citeKey)).toEqual([citeKey(at("BIRT", "@I2@"))]);
    expect(out.at(-1)!.tag).toBe("TRLR");
  });

  test("saving changes the fields and moves the citations from before to after in one go", () => {
    const before = sourceCites(records, "@S1@");
    const after = [at("BIRT", "@I2@")];
    const { records: out } = saveSource(records, "@S1@", { ...fieldsOf("@S1@"), title: "Renamed" }, before, after);
    expect(fieldsOf("@S1@", out).title).toBe("Renamed");
    expect(sourceCites(out, "@S1@").map(citeKey)).toEqual([citeKey(at("BIRT", "@I2@"))]);
  });

  test("deleting a source removes the record and every citation of it, and nothing else", () => {
    const out = deleteSource(records, "@S1@");
    expect(out.some((r) => r.xref === "@S1@")).toBe(false);
    expect(JSON.stringify(out)).not.toContain('"@S1@"');
    expect(childOf(rec(out, "@I1@"), "BIRT")!.children.some((c) => c.tag === "DATE")).toBe(true);
    expect(rec(out, "@S2@")).toBe(rec(records, "@S2@"));
    expect(deleteSource(out, "@S1@")).toEqual(out);
  });
});
