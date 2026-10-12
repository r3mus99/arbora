import { describe, expect, test } from "vitest";
import {
  applyPerson, checkGedcom, datesIn, decode, fixIssue, eventAnnotations, lineEnding, linkParts, lookupOf, marriageAnnotations, parseGedcom, personAnnotations,
  personFields, writeGedcom, type GedNode,
} from "./index";
import { SOURCES_GED } from "./fixtures/sources";

// fictional file with sources and notes on a person, its names, events and family
const text = decode(SOURCES_GED);
const records = parseGedcom(text);
const lookup = lookupOf(records);
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

  test("a person's own annotations gather the record, names and other lines, not the timeline events", () => {
    const a = personAnnotations(rec("@I1@"), lookup);
    expect(a.notes).toEqual(["Remembered in the family chronicle.\nSecond line of the note.", "Worked at the mill."]);
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
    // a rewritten record writes a continued line (CONC) as one line
    expect(out).toContain("4 TEXT Born at home, baptised the same week.");
    expect(out).toContain("1 NAME Anne /Example/");
  });
});

describe("attaching a source to the event it dates", () => {
  const ged = (body: string) => `0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 @S1@ SOUR\n1 TITL Parish register\n` +
    `1 PUBL Register of Sampletown, entry for Anna Example, 5 Mar 1850.\n${body}0 TRLR\n`;
  const person = (events: string, cite = "1 SOUR @S1@\n2 NOTE https://example.org/entry\n") =>
    ged(`0 @I1@ INDI\n1 NAME Anna /Example/\n${events}${cite}`);
  const issuesOf = (src: string) => checkGedcom(parseGedcom(src)).filter((i) => i.kind === "sourceDate");

  test("dates written in a text", () => {
    expect(datesIn("see 5 Mar 1850, 05.03.1850 and 1850-03-05, not 31 Feb 1850 or Sun Jul 07 2024"))
      .toEqual(["5 MAR 1850"]);
    expect(datesIn("24 November 1796.")).toEqual(["24 NOV 1796"]);
  });

  test("a source dated like the christening is offered for it, and moved with its note", () => {
    const src = person("1 BIRT\n2 DATE 3 MAR 1850\n1 CHR\n2 DATE 05 MAR 1850\n");
    const [issue] = issuesOf(src);
    expect(issue).toMatchObject({ kind: "sourceDate", person: "@I1@", fixable: true,
                                  args: { tag: "CHR", date: "5 MAR 1850", value: "Parish register" } });
    const recs = parseGedcom(src);
    const out = writeGedcom(fixIssue(recs, issue), lineEnding(src));
    expect(out).toContain("1 CHR\n2 DATE 05 MAR 1850\n2 SOUR @S1@\n3 NOTE https://example.org/entry\n");
    expect(out).not.toContain("1 SOUR @S1@");
    expect(issuesOf(out)).toEqual([]);
  });

  test("no offer when the date fits two events, none, or the event cites the source already", () => {
    expect(issuesOf(person("1 BIRT\n2 DATE 5 MAR 1850\n1 CHR\n2 DATE 5 MAR 1850\n"))).toEqual([]);
    expect(issuesOf(person("1 BIRT\n2 DATE 3 MAR 1850\n"))).toEqual([]);
    expect(issuesOf(person("1 BIRT\n2 DATE ABT 1850\n"))).toEqual([]);
    expect(issuesOf(person("1 BIRT\n2 DATE 5 MAR 1850\n2 SOUR @S1@\n"))).toEqual([]);
  });
});
