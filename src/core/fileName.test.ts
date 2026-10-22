import { describe, expect, it } from "vitest";
import { outputFileName } from "./fileName";

describe("outputFileName", () => {
  it("names the person, the chart and the generations", () => {
    expect(outputFileName("Maria Theresia", 7, "ancestors", "pdf")).toBe("maria-theresia_ancestors_7g.pdf");
  });

  it("strips diacritics and characters a file system rejects", () => {
    expect(outputFileName("Franz Joseph I. / von Österreich", 4, "potomkovia", "svg"))
      .toBe("franz-joseph-i.-von-osterreich_potomkovia_4g.svg");
  });

  it("falls back when the person has no name", () => {
    expect(outputFileName("", 3, "ancestors", "svg")).toBe("tree_ancestors_3g.svg");
  });
});
