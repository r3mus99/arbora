import { describe, expect, test } from "vitest";
import { withoutShownSources, citationFields, citationLinks, matchSources, sourceTitle, SOURCE_TITLE_LANGS, withoutLinks, type Citation } from "./sources";
import {
  applyPerson, decode, eventAnnotations, sourceOverview, sourceKind, lineEnding, linkParts, lookupOf, marriageAnnotations, parseGedcom, personAnnotations,
  personFields, writeGedcom, type GedNode,
} from "./index";
import { SOURCES_GED } from "./fixtures/sources";

// fictional file with sources and notes on a person, its names, events and family
const text = decode(SOURCES_GED);
const records = parseGedcom(text);
const lookup = lookupOf(records);
const annotationsOfFact = (r: GedNode, tag: string) => eventAnnotations(r, tag, lookup);
const rec = (xref: string) => records.find((r) => r.xref === xref)!;

describe("sources and notes", () => {
  test("a cited source record is resolved to its title, author, publication and repository", () => {
    const [c] = eventAnnotations(rec("@I1@"), "BIRT", lookup).sources;
    expect(c).toMatchObject({
      title: "Parish register of Sampletown", author: "Example Parish Office",
      publication: "Handwritten, 1840-1900, Example Index", repository: "Sampletown Regional Archive",
      page: "p. 12, no. 7", text: "Born at home, baptised the same week.", notes: ["Handwriting hard to read, see https://example.org/scan/12."],
    });
  });

  test("an event note can be inline or a pointer to a NOTE record", () => {
    expect(eventAnnotations(rec("@I1@"), "BIRT", lookup).notes)
      .toEqual(["Shared note about the baptism\nin the parish."]);
  });

  test("a person's own annotations gather the record and names, not the timeline events or facts", () => {
    const a = personAnnotations(rec("@I1@"), lookup);
    expect(a.notes).toEqual(["Remembered in the family chronicle.\nSecond line of the note."]);
    expect(annotationsOfFact(rec("@I1@"), "OCCU").notes).toEqual(["Worked at the mill."]);
    expect(a.sources.map((s) => s.title)).toEqual(["Family tradition", "Census 1869"]);
    expect(a.sources[1].page).toBe("entry 4");
  });

  test("a marriage shows the notes and sources of the family and of its MARR line", () => {
    const a = marriageAnnotations(rec("@F1@"), lookup);
    expect(a.notes).toEqual(["Witnesses were two neighbours."]);
    expect(a.sources.map((s) => s.page)).toEqual(["p. 88"]);
  });

  test("a missing source record gives the pointer, a person without any gives nothing", () => {
    const lone = parseGedcom("0 @I9@ INDI\n1 SOUR @S9@\n");
    expect(personAnnotations(lone[0], lookupOf(lone)).sources[0].title).toBe("@S9@");
    expect(personAnnotations(rec("@I2@"), lookup)).toEqual({ sources: [], notes: [] });
  });

  test("web addresses in a text are split out, without the punctuation after them", () => {
    expect(linkParts("see https://example.org/a?b=1, and (http://x.org/y).")).toEqual([
      { text: "see " }, { text: "https://example.org/a?b=1", href: "https://example.org/a?b=1" }, { text: ", and (" },
      { text: "http://x.org/y", href: "http://x.org/y" }, { text: ")." }]);
    expect(linkParts("no address")).toEqual([{ text: "no address" }]);
    expect(linkParts("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
  });

  test("the file is written back unchanged", () => {
    expect(writeGedcom(records, lineEnding(text))).toBe(text);
  });

  test("editing a person keeps every source and note line", () => {
    const person = rec("@I1@");
    const before = personFields(person);
    const after = applyPerson(person, before, {
      ...before, given: "Anne", birth: { date: "4 MAR 1850", place: "Othertown" }, occupations: [], religion: "Lutheran",
    });
    expect(after).not.toBe(person);
    const out = writeGedcom(records.map((r: GedNode) => (r === person ? after : r)), lineEnding(text));
    const kept = (s: string) => s.split("\n").filter((l) => /SOUR|NOTE|PAGE|CONT|DATA/.test(l));
    // only the note under the removed occupation goes with it
    expect(kept(out)).toEqual(kept(text).filter((l) => l !== "2 NOTE Worked at the mill."));
    // a rewritten record keeps the continued line (CONC) as it was
    expect(out).toContain("4 TEXT Born at home, baptised\n5 CONC  the same week.");
    expect(out).toContain("1 NAME Anne /Example/");
  });
});

describe("sources overview", () => {
  const ov = sourceOverview(records, lookup);

  test("each source once with its citations and people, including one nobody cites", () => {
    const reg = ov.sources.find((s) => s.key === "@S1@")!;
    expect(reg.citation.title).toBe("Parish register of Sampletown");
    expect(reg.citations).toBe(2);
    expect(reg.people.sort()).toEqual(["@I1@", "@I2@"]);
    expect(ov.sources.map((s) => s.citation.title)).toContain("Census 1869");
    expect(ov.sources.find((s) => s.key === "@S2@")!.citations).toBe(1);
  });

  test("a text citation is its own source", () => {
    const e = ov.sources.find((s) => s.key === "Family tradition")!;
    expect(e).toMatchObject({ citations: 1, people: ["@I1@"] });
  });

  test("each note text once with the people it is under; a family's note belongs to the spouses", () => {
    const witnesses = ov.notes.find((n) => n.text.startsWith("Witnesses"))!;
    expect(witnesses.people.sort()).toEqual(["@I1@", "@I2@"]);
    expect(ov.notes.map((n) => n.text)).toContain("Shared note about the baptism\nin the parish.");
  });
});

describe("source kinds", () => {
  const ov = sourceOverview(records, lookup);

  test("a source is listed under every kind of event that cites it", () => {
    expect(ov.sources.find((s) => s.key === "@S1@")!.kinds).toEqual(["birth", "marriage"]);
  });

  test("a citation on the person or a name, and a source nobody cites, are 'other' or have no kind", () => {
    expect(ov.sources.find((s) => s.key === "@S2@")!.kinds).toEqual(["other"]);
    expect(ov.sources.find((s) => s.key === "Family tradition")!.kinds).toEqual(["other"]);
    const unused = sourceOverview(parseGedcom("0 HEAD\n0 @S9@ SOUR\n1 TITL Unused\n0 TRLR\n"));
    expect(unused.sources[0].kinds).toEqual([]);
  });

  test("baptism and birth, death and burial, and every marriage-like event group together; a citation on the family is a marriage", () => {
    expect(["BIRT", "CHR", "BAPM"].map((t) => sourceKind(t))).toEqual(["birth", "birth", "birth"]);
    expect(["DEAT", "BURI", "CREM"].map((t) => sourceKind(t))).toEqual(["death", "death", "death"]);
    expect(["MARR", "MARB", "MARC", "MARL", "MARS", "ENGA"].map((t) => sourceKind(t))).toEqual(Array(6).fill("marriage"));
    expect(sourceKind("", true)).toBe("marriage");
    expect(["", "OCCU", "RESI", "DIV", "NAME"].map((t) => sourceKind(t))).toEqual(Array(5).fill("other"));
    expect(sourceKind("DIV", true)).toBe("other");
  });

  test("a citation deeper under an event still counts for that event; a second event adds a second kind", () => {
    const ged = `0 HEAD
0 @I1@ INDI
1 NAME A /B/
1 BURI
2 PLAC Town
2 SOUR @S1@
1 DEAT
2 DATE 1900
3 SOUR @S1@
0 @F1@ FAM
1 HUSB @I1@
1 DIV
2 SOUR @S1@
0 @S1@ SOUR
1 TITL Register
0 TRLR
`;
    const { sources } = sourceOverview(parseGedcom(ged));
    expect(sources[0]).toMatchObject({ citations: 3, kinds: ["death", "other"] });
  });
});

describe("matchSources", () => {
  const choices = [
    ...Array.from({ length: 30 }, (_, i) => ({ xref: `@S${i}@`, title: `Parish book of Springfield ${i}` })),
    { xref: "@A@", title: "Census of Shelbyville" },
    { xref: "@B@", title: "Old Springfield register" },
    { xref: "@C@", title: "Parish book of Springfield 3" },
  ];
  test("offers nothing for an empty text", () => { expect(matchSources(choices, "  ")).toEqual([]); });
  test("offers at most 8, equal titles once", () => {
    const m = matchSources(choices, "springfield");
    expect(m).toHaveLength(8);
    expect(new Set(m.map((s) => s.title)).size).toBe(8);
  });
  test("puts titles starting with the text first", () => {
    expect(matchSources(choices, "old")[0].xref).toBe("@B@");
    expect(matchSources(choices, "reg")[0].xref).toBe("@B@");
    expect(matchSources(choices, "xyz")).toEqual([]);
  });
});

describe("sourceTitle", () => {
  test("names the event and the people", () => {
    expect(sourceTitle("sk", "marriage", "Jan Novak", "Eva Novak")).toBe("Svadba Jan Novak & Eva Novak");
    expect(sourceTitle("sk", "birth", "Jan Novak")).toBe("Narodenie Jan Novak");
    expect(sourceTitle("en", "divorce", "A B", "C D")).toBe("Divorce A B & C D");
  });
  test("leaves out missing names; other events keep their own word; unknown language falls back to English", () => {
    expect(sourceTitle("en", "marriage", "", "Eva Novak")).toBe("Wedding Eva Novak");
    expect(sourceTitle("sk", "Bydlisko", "Jan Novak")).toBe("Bydlisko Jan Novak");
    expect(sourceTitle("xx", "burial", "Jan Novak")).toBe("Burial Jan Novak");
    expect(sourceTitle("sk", "death")).toBe("Úmrtie");
  });
  test("another language falls back to English", () => { expect(sourceTitle("de", "marriage", "Eva Novak")).toBe("Wedding Eva Novak"); });
  test("a source of the person itself", () => { expect(sourceTitle("sk", "person", "Jan Novak")).toBe("Osoba Jan Novak"); });
  test("every language has all six words", () => {
    for (const l of SOURCE_TITLE_LANGS) for (const e of ["person", "birth", "christening", "death", "burial", "marriage", "divorce"]) expect(sourceTitle(l, e)).not.toBe(e);
  });
});

describe("citation links", () => {
  const cite = (over: Partial<Citation>): Citation => ({ xref: "", title: "", author: "", publication: "", repository: "", page: "", quality: "", text: "", notes: [], ...over });

  test("web addresses are found in any field, once each, labelled by site", () => {
    const links = citationLinks(cite({
      publication: '"Sample Books", Example Archive (https://www.example.org/ark:/1/A1 : Sun Mar 10 13:18:48 UTC 2024), Entry for Jan Sample, 01 May 1894.',
      notes: ["https://example.org/ark:/1/A1", "https://other.example.net/x"],
    }));
    expect(links.map((l) => [l.href, l.label])).toEqual([["https://www.example.org/ark:/1/A1", "example.org"], ["https://other.example.net/x", "other.example.net"]]);
  });

  test("two different links on one site are told apart by the end of the address", () => {
    const links = citationLinks(cite({ page: "https://example.org/r/A1", notes: ["https://example.org/r/B2"] }));
    expect(links.map((l) => l.suffix)).toEqual(["A1", "B2"]);
  });

  test("a text without any address has no links, and a page that is only an address has no readable text left", () => {
    expect(citationLinks(cite({ title: "Birth register", page: "p. 41" }))).toEqual([]);
    expect(withoutLinks("https://example.org/a")).toBe("");
    expect(withoutLinks("p. 41, https://example.org/a")).toBe("p. 41");
  });
});

describe("citation fields", () => {
  const cite = (over: Partial<Citation>): Citation => ({ xref: "", title: "", author: "", publication: "", repository: "", page: "", quality: "", text: "", notes: [], ...over });

  test("every filled field is a line, empty ones are not", () => {
    expect(citationFields(cite({ title: "Parish book", page: "p. 41", author: "A. Writer", repository: "State Archive", quality: "2" })).map((f) => [f.key, f.text]))
      .toEqual([["page", "p. 41"], ["author", "A. Writer"], ["repository", "State Archive"], ["quality", "2 / 3"]]);
    expect(citationFields(cite({ title: "Parish book" }))).toEqual([]);
  });

  test("web addresses are not repeated in the lines, and text that repeats the title is skipped", () => {
    const f = citationFields(cite({
      title: 'Jan Sample, "Example Collection"',
      publication: '"Example Collection", Example Archive (https://example.org/ark:/1/A1 : Sun Mar 10 13:18:48 UTC 2024), Entry for Jan Sample, 01 May 1894.',
      page: "https://example.org/ark:/1/A1",
    }));
    expect(f.map((x) => x.key)).toEqual(["publication"]);
    expect(f[0].text).not.toContain("https://");
    expect(f[0].text).toContain("Entry for Jan Sample");
    expect(citationFields(cite({ title: "Parish book of Sampleton", page: "Parish book" }))).toEqual([]);
  });
});

describe("the source list shows what every citation of a source says", () => {
  test("two citations with their own links give the list both links, as the detail does", () => {
    const text = `0 HEAD
0 @S1@ SOUR
1 TITL Church book
1 PUBL https://www.example.org/book
0 @I1@ INDI
1 NAME Jan /Novak/
1 BIRT
2 SOUR @S1@
3 NOTE https://www.example.org/entry-1
1 DEAT
2 SOUR @S1@
3 NOTE https://www.example.org/entry-2
0 TRLR
`;
    const records = parseGedcom(text);
    const overview = sourceOverview(records);
    const entry = overview.sources.find((s) => s.key === "@S1@")!;
    expect(entry.citations).toBe(2);
    expect(entry.citation.notes).toEqual(["https://www.example.org/entry-1", "https://www.example.org/entry-2"]);
  });
});

describe("sources already shown on the timeline", () => {
  const cite = (xref: string, title = "", page = ""): Citation => ({ xref, title: title || xref, author: "", publication: "", repository: "", page, quality: "", text: "", notes: [] });
  test("a source shown at an event leaves the card, the others and the notes stay", () => {
    const a = { sources: [cite("@S1@"), cite("@S2@", "Other")], notes: ["note"] };
    expect(withoutShownSources(a, [cite("@S1@", "", "p. 3")])).toEqual({ sources: [cite("@S2@", "Other")], notes: ["note"] });
  });
  test("a citation written as text is matched by its title", () => {
    expect(withoutShownSources({ sources: [cite("", "Church book")], notes: [] }, [cite("", "Church book")]).sources).toEqual([]);
    expect(withoutShownSources({ sources: [cite("", "Church book")], notes: [] }, [cite("@S1@")]).sources).toHaveLength(1);
  });
});
