import { describe, expect, it } from "vitest";
import { outputFileName } from "./fileName";

const words = { chartWord: "ancestors", generationsWord: "generations" };

describe("outputFileName", () => {
  it("names the person, the chart and the generations", () => {
    expect(outputFileName("Maria Theresia", 7, words, "pdf")).toBe("maria-theresia_ancestors_7-generations.pdf");
  });

  it("strips diacritics and characters a file system rejects", () => {
    expect(outputFileName("Franz Joseph I. / von Österreich", 4, { chartWord: "potomkovia", generationsWord: "generácií" }, "svg"))
      .toBe("franz-joseph-i.-von-osterreich_potomkovia_4-generacii.svg");
  });

  it("falls back when the person has no name", () => {
    expect(outputFileName("", 3, words, "svg")).toBe("tree_ancestors_3-generations.svg");
  });
});
