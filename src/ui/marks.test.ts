import { describe, expect, test } from "vitest";
import { NO_MARKS, fileKey, marksOf, setHome, toggleFav, withMarks } from "./marks";

describe("favourite and home people", () => {
  test("the star of a person can be switched on and off", () => {
    const m = toggleFav(toggleFav(NO_MARKS, "a"), "c");
    expect(m.fav).toEqual(["c", "a"]);
    expect(toggleFav(m, "a").fav).toEqual(["c"]);
  });

  test("only one home person is kept and it can be cleared", () => {
    const first = setHome(NO_MARKS, "a");
    const second = setHome(first, "b");
    expect(second.home).toBe("b");
    expect(setHome(second, null)).toEqual(NO_MARKS);
  });

  test("marks do not mix between files", () => {
    const a = withMarks(undefined, fileKey("a.ged"), toggleFav(NO_MARKS, "x"));
    const both = withMarks(a, fileKey(null), toggleFav(NO_MARKS, "y"));
    expect(marksOf(both, "a.ged").fav).toEqual(["x"]);
    expect(marksOf(both, fileKey(null)).fav).toEqual(["y"]);
    expect(marksOf(both, "b.ged")).toBe(NO_MARKS);
  });

  test("a damaged store gives empty marks", () => {
    expect(marksOf({ f: { fav: [1, "k"] } as never }, "f")).toEqual({ fav: ["k"] });
  });

  test("the home person is restored from stored marks", () => {
    expect(marksOf({ f: { fav: [], home: "x" } }, "f").home).toBe("x");
  });
});
