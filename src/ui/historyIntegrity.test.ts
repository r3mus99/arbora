import { describe, expect, test } from "vitest";
import { recordChanges } from "../core/changes";
import { lineEnding, parseGedcom, writeGedcom } from "../core";
import { generated, random, randomEdit } from "../core/generatedFile";
import { changeCount, edited, replay, startEdits, stepEdits, unsavedChanges, type Doc } from "./history";

describe("undo and the list of changes after structural edits", () => {
  test("250 random edits undo back to the opened file, redo to the last one, and the list of changes follows", () => {
    const rand = random(11);
    const text = generated(rand, "\n");
    const opened: Doc = { records: parseGedcom(text), eol: lineEnding(text) };
    let doc = opened;
    let edits = startEdits(opened);
    const versions = [writeGedcom(opened.records, opened.eol)];
    for (let step = 0; step < 250; step++) {
      const next: Doc = { ...doc, records: randomEdit(doc.records, rand, step).records };
      edits = edited(edits, doc, next);
      doc = next;
      versions.push(writeGedcom(doc.records, doc.eol));
    }
    // every step is one undo step: the log replays to each version
    const steps = edits.ops.length;
    expect(steps).toBeGreaterThan(150);
    expect(replay(edits).records).toEqual(doc.records);

    // all the way back, each step lands on the file as it was before the edit
    const back: string[] = [];
    while (true) {
      const stepped = stepEdits(edits, doc, -1);
      if (!stepped) break;
      ({ doc, edits } = stepped);
      back.push(writeGedcom(doc.records, doc.eol));
    }
    expect(back.length).toBe(steps);
    expect(writeGedcom(doc.records, doc.eol)).toBe(versions[0]);
    expect(changeCount(edits)).toBe(0);
    expect(unsavedChanges(edits, doc.records)).toEqual([]);

    // and forward again to the last version
    while (true) {
      const stepped = stepEdits(edits, doc, 1);
      if (!stepped) break;
      ({ doc, edits } = stepped);
    }
    expect(writeGedcom(doc.records, doc.eol)).toBe(versions.at(-1));

    // the changes shown are exactly the difference to the file as opened: applying them to the opened records is not needed, but
    // every record that differs is listed and nothing else is
    const listed = new Set(unsavedChanges(edits, doc.records).map((c) => c.xref ?? c.tag));
    const differs = new Set(recordChanges(opened.records, doc.records).map((c) => c.xref ?? c.tag));
    expect(listed).toEqual(differs);
    expect(changeCount(edits)).toBeGreaterThan(0);
    expect(listed.has("@I61@")).toBe(false);
  });
});
