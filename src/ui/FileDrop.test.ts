import { describe, expect, it } from "vitest";
import { FILE_ACCEPT } from "./FileDrop";

describe("file picker", () => {
  it("has no accept filter, so iOS does not grey out .ged files", () => {
    expect(FILE_ACCEPT).toBeUndefined();
  });
});
