import { describe, expect, test } from "vitest";
import { parseGedcom } from "../core/gedcom";
import {
  NO_BROWSING, canRedo, canUndo, changeCount, discardUnsaved, edited, isDirty, move, replay, startEdits, stepEdits, unsavedChanges, visit, withRecords,
  applyOp, diffRecords, type Doc,
} from "./history";
import { NUMBERING, storedOptions, toForm, toOptions, withOption } from "./options";
import { DEFAULTS } from "../core/format";

const doc = (name: string): Doc => ({ records: parseGedcom(`0 @I1@ INDI\n1 NAME ${name}\n`), eol: "\n" });

const next = (d: Doc, name: string) => withRecords(d, parseGedcom(`0 @I1@ INDI\n1 NAME ${name}\n`));
const name = (d: Doc) => d.records[0].children[0].value;

describe("edit history", () => {

  test("undo and redo walk through the versions", () => {
    const a = doc("A"), b = next(a, "B"), c = next(b, "C");
    let edits = edited(edited(startEdits(a), a, b), b, c);
    expect(canUndo(edits)).toBe(true);
    const back = stepEdits(edits, c, -1)!;
    expect(name(back.doc)).toBe("B");
    const back2 = stepEdits(back.edits, back.doc, -1)!;
    expect(name(back2.doc)).toBe("A");
    expect(back2.doc.records[0]).toBe(a.records[0]);
    expect(stepEdits(back2.edits, back2.doc, -1)).toBeNull();
    expect(canRedo(back2.edits)).toBe(true);
    const forward = stepEdits(back2.edits, back2.doc, 1)!;
    expect(name(forward.doc)).toBe("B");
    edits = forward.edits;
    expect(canRedo(edits)).toBe(true);
  });

  test("a new edit after undo drops what could be redone", () => {
    const a = doc("A"), b = next(a, "B");
    const undone = stepEdits(edited(startEdits(a), a, b), b, -1)!;
    expect(canRedo(undone.edits)).toBe(true);
    const again = edited(undone.edits, undone.doc, next(undone.doc, "Z"));
    expect(canRedo(again)).toBe(false);
  });

  test("an edit that changes nothing adds no step", () => {
    const a = doc("A");
    expect(edited(startEdits(a), a, { ...a })).toEqual(startEdits(a));
  });

  test("the log replays to the same file and holds only changed records", () => {
    const a: Doc = { records: parseGedcom("0 @I1@ INDI\n1 NAME A\n0 @I2@ INDI\n1 NAME X\n0 @I3@ INDI\n1 NAME Y\n"), eol: "\n" };
    const b = withRecords(a, parseGedcom("0 @I2@ INDI\n1 NAME X2\n"));
    const edits = edited(startEdits(a), a, b);
    expect(edits.ops[0]).toHaveLength(1);
    expect(edits.ops[0][0].remove).toHaveLength(1);
    const again = replay(edits);
    expect(again.records[0]).toBe(a.records[0]);
    expect(again.records[1]).toBe(b.records[1]);
    // JSON round trip (what the browser keeps) replays the same
    const kept = { ...edits, ops: JSON.parse(JSON.stringify(edits.ops)) };
    expect(replay(kept).records[1].children[0].value).toBe("X2");
  });

  test("records added or removed are undone too", () => {
    const a = doc("A");
    const extra = parseGedcom("0 @I9@ INDI\n1 NAME N\n");
    const added: Doc = { ...a, records: [...a.records, ...extra] };
    const op = diffRecords(a.records, added.records);
    expect(applyOp(a.records, op)).toEqual(added.records);
    expect(applyOp(added.records, op, true)).toEqual(a.records);
    const gone = { ...a, records: [] as typeof a.records };
    expect(applyOp(a.records, diffRecords(a.records, gone.records))).toEqual([]);
  });

  test("several separate changes in one edit undo in order", () => {
    const a: Doc = { records: parseGedcom("0 @I1@ INDI\n1 NAME A\n0 @I2@ INDI\n1 NAME B\n0 @I3@ INDI\n1 NAME C\n"), eol: "\n" };
    const bulk = parseGedcom("0 @I1@ INDI\n1 NAME A2\n0 @I2@ INDI\n1 NAME B\n0 @I3@ INDI\n1 NAME C2\n");
    const nextRecs = [bulk[0], a.records[1], bulk[2]];
    const op = diffRecords(a.records, nextRecs);
    expect(op).toHaveLength(2);
    expect(applyOp(nextRecs, op, true)).toEqual(a.records);
  });

  test("a log that does not fit the file is rejected", () => {
    expect(() => applyOp([], [{ at: 3, remove: parseGedcom("0 @I1@ INDI\n"), insert: [] }])).toThrow("does not fit");
  });

  test("unsaved changes are those after the version last opened or downloaded", () => {
    const a = doc("A"), b = next(a, "B");
    const edits = startEdits(a);
    expect(isDirty(edits)).toBe(false);
    const one = edited(edits, a, b);
    expect(isDirty(one)).toBe(true);
    expect(changeCount(one)).toBe(1);
    // undo back to the saved version is clean again
    expect(isDirty(stepEdits(one, b, -1)!.edits)).toBe(false);
    // saving starts a fresh log from the saved version: nothing old is kept
    const saved = startEdits(b);
    expect(isDirty(saved)).toBe(false);
    expect(saved.ops).toEqual([]);
    expect(canUndo(saved)).toBe(false);
  });

  test("discarding goes back to the saved version and forgets what came after", () => {
    const a = doc("A"), b = next(a, "B"), c = next(b, "C");
    let edits = edited(startEdits(a), a, b);
    edits = { ...edits, saved: edits.at };
    edits = edited(edits, b, c);
    const back = discardUnsaved(edits);
    expect(name(back.doc)).toBe("B");
    expect(isDirty(back.edits)).toBe(false);
    expect(canRedo(back.edits)).toBe(false);
    // when the saved version is gone from the log, the file as opened is the way back
    const lost = discardUnsaved({ ...edits, saved: null });
    expect(name(lost.doc)).toBe("A");
  });

  test("changed records replace the ones with the same ID", () => {
    const a = doc("A");
    const changed = parseGedcom("0 @I1@ INDI\n1 NAME Z\n");
    const merged = withRecords(a, changed);
    expect(merged.records[0]).toBe(changed[0]);
    expect(merged.eol).toBe("\n");
    expect(withRecords(a, []).records[0]).toBe(a.records[0]);
  });
});

describe("browsing history", () => {
  const p = (root: string, focus = root) => ({ root, focus });

  test("back and forward over the places visited", () => {
    let h = visit(NO_BROWSING, p("@I1@"));
    h = visit(h, p("@I2@"));
    h = visit(h, p("@I2@", "@I5@"));
    expect(h.list).toHaveLength(3);
    const back = move(h, -1)!;
    expect(back.place).toEqual(p("@I2@"));
    expect(move(back.browsing, 1)!.place).toEqual(p("@I2@", "@I5@"));
    expect(move(h, 1)).toBeNull();
    expect(move(move(back.browsing, -1)!.browsing, -1)).toBeNull();
  });

  test("the same place twice is one step, and a new place drops those ahead", () => {
    let h = visit(visit(NO_BROWSING, p("@I1@")), p("@I1@"));
    expect(h.list).toHaveLength(1);
    h = visit(h, p("@I2@"));
    h = move(h, -1)!.browsing;
    h = visit(h, p("@I3@"));
    expect(h.list.map((x) => x.root)).toEqual(["@I1@", "@I3@"]);
    expect(h.at).toBe(1);
  });
});

describe("chart options", () => {
  test("typed numbers are read and kept within bounds", () => {
    const form = (generations: string, fontSize: string) => ({ ...toForm(DEFAULTS), generations, fontSize });
    expect(toOptions(form("3.6", "9"), "en")).toMatchObject({ generations: 4, fontSize: 9, lang: "en" });
    expect(toOptions(form("-2", "2"), "sk")).toMatchObject({ generations: 0, fontSize: 5 });
    expect(toOptions(form("x", "99"), "sk")).toMatchObject({ generations: DEFAULTS.generations, fontSize: 20 });
    expect(toOptions(form("", ""), "sk").fontSize).toBe(DEFAULTS.fontSize);
  });

  test("another chart kind gets its own numbering", () => {
    const anc = withOption(toForm({ ...DEFAULTS, numbering: "ahnentafel" }), "chart", "descendants");
    expect(anc.numbering).toBe("daboville");
    const desc = withOption(toForm({ ...DEFAULTS, chart: "descendants", numbering: "daboville" }), "chart", "ancestors");
    expect(desc.numbering).toBe("ahnentafel");
    expect(withOption(anc, "numbering", "none").numbering).toBe("none");
    for (const kind of ["ancestors", "descendants"] as const) {
      expect(NUMBERING[kind].map(([v]) => v)).toContain("generation");
    }
  });

  test("options kept in the browser: what is valid stays, the rest gets the default", () => {
    expect(storedOptions(undefined)).toEqual(DEFAULTS);
    expect(storedOptions("junk")).toEqual(DEFAULTS);
    const kept = storedOptions({ pageSize: "a3", fontSize: 11, title: "Mine", dates: "full", showSpouses: false });
    expect(kept).toMatchObject({ pageSize: "a3", fontSize: 11, title: "Mine", dates: "full", showSpouses: false });
    const bad = storedOptions({ pageSize: "tabloid", fontSize: "big", dates: 3, orientation: null, lang: "xx",
                                lineHeight: Number.NaN });
    expect(bad).toEqual(DEFAULTS);
    expect(storedOptions({ chart: "descendants", numbering: "ahnentafel" }).numbering).toBe("daboville");
  });

  test("the poster has its own number of generations, kept within 2 to 7", () => {
    expect(DEFAULTS.posterGenerations).toBe(7);
    expect(storedOptions({ posterGenerations: 4 }).posterGenerations).toBe(4);
    expect(toOptions(toForm({ ...DEFAULTS, posterGenerations: 12 }), "sk").posterGenerations).toBe(7);
    expect(toOptions(toForm({ ...DEFAULTS, posterGenerations: 1 }), "sk").posterGenerations).toBe(2);
  });

  test("the number of unsaved changes counts steps since the saved version", () => {
    const a = doc("A"), b = next(a, "B"), c = next(b, "C");
    let edits = startEdits(a);
    expect(changeCount(edits)).toBe(0);
    edits = edited(edited(edits, a, b), b, c);
    expect(changeCount(edits)).toBe(2);
    const back = stepEdits(edits, c, -1)!;
    expect(changeCount(back.edits)).toBe(1);
    // undo past the saved version (saved after B, then two undos) still counts
    const saved = { ...edits, saved: 1 };
    expect(changeCount(saved)).toBe(1);
    const undone = stepEdits(stepEdits(saved, c, -1)!.edits, b, -1)!;
    expect(changeCount(undone.edits)).toBe(1);
  });
});

describe("unsaved changes", () => {
  test("a change reverted by hand is no change, even though it took two edit steps", () => {
    const a = doc("A"), b = next(a, "B"), a2 = next(b, "A");
    let edits = startEdits(a);
    expect(unsavedChanges(edits, a.records)).toEqual([]);
    edits = edited(edits, a, b);
    expect(unsavedChanges(edits, b.records)).toHaveLength(1);
    edits = edited(edits, b, a2);
    expect(changeCount(edits)).toBe(2);
    expect(unsavedChanges(edits, a2.records)).toEqual([]);
  });
});
