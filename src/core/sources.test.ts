import { describe, expect, test } from "vitest";
import { citationLinks, matchSources, withoutLinks, type Citation } from "./sources";
import {
  applyPerson, decode, eventAnnotations, sourceOverview, lineEnding, linkParts, lookupOf, marriageAnnotations, parseGedcom, personAnnotations,
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

describe("citation links", () => {
  const cite = (over: Partial<Citation>): Citation => ({ title: "", author: "", publication: "", repository: "", page: "", text: "", notes: [], ...over });

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
