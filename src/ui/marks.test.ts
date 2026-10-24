import { describe, expect, test } from "vitest";
import { NO_MARKS, RECENT_LIMIT, fileKey, listing, marksOf, setHome, toggleFav, visited, withMarks } from "./marks";

describe("recent and favourite people", () => {
  test("the latest visit comes first and a repeat does not duplicate", () => {
    let m = visited(visited(visited(NO_MARKS, "@I1@"), "@I2@"), "@I3@");
    expect(m.recent).toEqual(["@I3@", "@I2@", "@I1@"]);
    m = visited(m, "@I1@");
    expect(m.recent).toEqual(["@I1@", "@I3@", "@I2@"]);
    expect(visited(m, "@I1@")).toBe(m);
  });

  test("the recent list is capped", () => {
    let m = NO_MARKS;
    for (let i = 0; i < RECENT_LIMIT + 10; i++) m = visited(m, `@I${i}@`);
    expect(m.recent).toHaveLength(RECENT_LIMIT);
    expect(m.recent[0]).toBe(`@I${RECENT_LIMIT + 9}@`);
  });

  test("favourites are always on top, then the recent ones", () => {
    let m = NO_MARKS;
    for (const id of ["a", "b", "c", "d"]) m = visited(m, id);
    m = toggleFav(toggleFav(m, "a"), "c");
    expect(listing(m, () => true)).toEqual([
      { id: "c", fav: true }, { id: "a", fav: true }, { id: "d", fav: false }, { id: "b", fav: false },
    ]);
    expect(toggleFav(m, "a").fav).toEqual(["c"]);
  });

  test("only one home person is kept and it can be cleared", () => {
    const first = setHome(NO_MARKS, "a");
    const second = setHome(first, "b");
    expect(second.home).toBe("b");
    expect(setHome(second, null)).toEqual(NO_MARKS);
  });

  test("people missing from the file are left out", () => {
    const m = toggleFav(visited(visited(NO_MARKS, "a"), "b"), "a");
    expect(listing(m, (id) => id === "b")).toEqual([{ id: "b", fav: false }]);
  });

  test("marks do not mix between files", () => {
    const a = withMarks(undefined, fileKey("a.ged"), toggleFav(NO_MARKS, "x"));
    const both = withMarks(a, fileKey(null), toggleFav(NO_MARKS, "y"));
    expect(marksOf(both, "a.ged").fav).toEqual(["x"]);
    expect(marksOf(both, fileKey(null)).fav).toEqual(["y"]);
    expect(marksOf(both, "b.ged")).toBe(NO_MARKS);
  });

  test("a damaged store gives empty marks", () => {
    expect(marksOf({ f: { recent: "x", fav: [1, "k"] } as never }, "f")).toEqual({ recent: [], fav: ["k"] });
  });

  test("the home person is restored from stored marks", () => {
    expect(marksOf({ f: { recent: [], fav: [], home: "x" } }, "f").home).toBe("x");
  });
});
