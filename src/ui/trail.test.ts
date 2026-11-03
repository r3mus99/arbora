import { describe, expect, test } from "vitest";
import { NO_TRAIL, startTrail, stepTrail, visit } from "./trail";

const all = () => true;

describe("back and forward through the people opened", () => {
  test("steps back and forward in the order of opening", () => {
    const t = visit(visit(startTrail("a"), "b"), "c");
    const back = stepTrail(t, -1, all)!;
    expect(back.id).toBe("b");
    expect(stepTrail(back.trail, 1, all)!.id).toBe("c");
    expect(stepTrail(t, 1, all)).toBeNull();
    expect(stepTrail(startTrail("a"), -1, all)).toBeNull();
  });

  test("opening a person after going back drops what lay ahead", () => {
    const t = stepTrail(visit(visit(startTrail("a"), "b"), "c"), -1, all)!.trail;
    expect(visit(t, "d").ids).toEqual(["a", "b", "d"]);
  });

  test("the same person twice in a row counts once", () => {
    const t = startTrail("a");
    expect(visit(t, "a")).toBe(t);
  });

  test("a deleted person is skipped", () => {
    const t = visit(visit(startTrail("a"), "b"), "c");
    expect(stepTrail(t, -1, (id) => id !== "b")!.id).toBe("a");
    expect(stepTrail(t, -1, (id) => id === "c")).toBeNull();
  });

  test("an empty trail has no steps; visiting starts one", () => {
    expect(stepTrail(NO_TRAIL, -1, all)).toBeNull();
    expect(visit(NO_TRAIL, "a")).toEqual({ ids: ["a"], at: 0 });
  });
});
