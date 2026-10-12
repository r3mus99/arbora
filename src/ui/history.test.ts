import { describe, expect, test } from "vitest";
import { parseGedcom } from "../core/gedcom";
import {
  NO_BROWSING, edited, isDirty, move, startEdits, stepEdits, visit, withRecords, type Doc,
} from "./history";
import { NUMBERING, storedOptions, toForm, toOptions, withOption } from "./options";
import { DEFAULTS } from "../core/format";

const doc = (name: string): Doc => ({ records: parseGedcom(`0 @I1@ INDI\n1 NAME ${name}\n`), eol: "\n" });

describe("edit history", () => {
  test("undo and redo walk through the versions", () => {
    const [a, b, c] = [doc("A"), doc("B"), doc("C")];
    let edits = startEdits(a);
    edits = edited(edits, a);          // a → b
    edits = edited(edits, b);          // b → c
    const back = stepEdits(edits, c, -1)!;
    expect(back.doc).toBe(b);
    const back2 = stepEdits(back.edits, back.doc, -1)!;
    expect(back2.doc).toBe(a);
    expect(stepEdits(back2.edits, back2.doc, -1)).toBeNull();
    const forward = stepEdits(back2.edits, back2.doc, 1)!;
    expect(forward.doc).toBe(b);
    expect(forward.edits.future).toEqual([c]);
  });

  test("a new edit after undo drops what could be redone", () => {
    const [a, b, c] = [doc("A"), doc("B"), doc("C")];
    const undone = stepEdits(edited(startEdits(a), a), b, -1)!;
    expect(undone.edits.future).toEqual([b]);
    expect(edited(undone.edits, undone.doc).future).toEqual([]);
    expect(c).toBeDefined();
  });

  test("only the last 200 steps are kept", () => {
    let edits = startEdits(doc("0"));
    for (let i = 0; i < 250; i++) edits = edited(edits, doc(String(i)));
    expect(edits.past).toHaveLength(200);
  });

  test("unsaved changes are those that differ from the saved version", () => {
    const [a, b] = [doc("A"), doc("B")];
    const edits = startEdits(a);
    expect(isDirty(a, edits)).toBe(false);
    expect(isDirty(b, edits)).toBe(true);
    expect(isDirty(null, edits)).toBe(false);
    // undo back to the saved version is clean again
    expect(isDirty(stepEdits(edited(edits, a), b, -1)!.doc, edits)).toBe(false);
  });

  test("changed records replace the ones with the same ID", () => {
    const a = doc("A");
    const changed = parseGedcom("0 @I1@ INDI\n1 NAME Z\n");
    const next = withRecords(a, changed);
    expect(next.records[0]).toBe(changed[0]);
    expect(next.eol).toBe("\n");
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
});
