import { describe, expect, test } from "vitest";
import { DEFAULTS, load, personLine, type ChartOptions } from "./index";

const GED = `0 HEAD
0 @I1@ INDI
1 NAME Anna /Test/
1 BIRT
2 DATE 1850
2 PLAC Alpha, Region
1 RESI
2 DATE 1870
2 PLAC Beta
1 RESI
2 DATE 1890
2 PLAC Gamma
1 RESI
2 PLAC Delta
1 DEAT
2 DATE 1920
2 PLAC Omega
0 @I2@ INDI
1 NAME Boris /Test/
1 BIRT
2 PLAC Alpha
1 RESI
2 PLAC alpha
0 TRLR
`;

const opts = (o: Partial<ChartOptions> = {}): ChartOptions =>
  ({ ...DEFAULTS, places: "short", showResidence: true, ...o });

describe("residence", () => {
  const data = load(GED);
  const anna = data.people["@I1@"], boris = data.people["@I2@"];

  test("the latest dated RESI is kept", () => {
    expect(anna.residence).toEqual({ date: "1890", place: "Gamma" });
  });

  test("shown after the brackets with the symbol", () => {
    expect(personLine(anna, null, null, opts())).toBe("Anna Test (*1850 Alpha, †1920 Omega) ⌂ Gamma");
  });

  test("abbreviated labels use the abbreviation", () => {
    expect(personLine(anna, null, null, opts({ labels: "abbr", lang: "en" })))
      .toBe("Anna Test (b. 1850 Alpha, d. 1920 Omega) res. Gamma");
  });

  test("hidden when off, when places are off, and when equal to the birth place", () => {
    expect(personLine(anna, null, null, opts({ showResidence: false }))).not.toContain("⌂");
    expect(personLine(anna, null, null, opts({ places: "none" }))).not.toContain("⌂");
    expect(personLine(boris, null, null, opts())).not.toContain("⌂");
  });
});
