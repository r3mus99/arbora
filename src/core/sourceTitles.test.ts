import { describe, expect, test } from "vitest";
import { parseGedcom, writeGedcom } from "./index";
import { applySourceRenames, sourceRenames } from "./sourceTitles";

// fictional file: sources cited once under events, on a person, twice, and not at all
const GED = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jan /Novak/
1 SOUR @S1@
1 BIRT
2 DATE 1 JAN 1900
2 SOUR @S2@
1 DEAT
2 SOUR @S6@
0 @I2@ INDI
1 NAME Eva /Kral/
1 BIRT
2 SOUR @S3@
2 SOUR @S5@
1 CHR
2 SOUR @S5@
0 @I3@ INDI
1 NAME Eva /Novak/
1 BIRT
2 SOUR @S7@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 SOUR @S4@
0 @S1@ SOUR
1 TITL Jan Novak, Example Collection
0 @S2@ SOUR
1 TITL Jan Novak, Example Collection, birth
0 @S3@ SOUR
1 TITL Birth Eva Kral
0 @S4@ SOUR
1 TITL Marriage index
0 @S5@ SOUR
1 TITL Shared register
0 @S6@ SOUR
1 TITL Unused-looking
0 @S7@ SOUR
1 TITL Other register
0 @S8@ SOUR
1 TITL Nobody cites me
0 TRLR
`;
const names: Record<string, string> = { "@I1@": "Jan Novak", "@I2@": "Eva Kral", "@I3@": "Eva Kral" };
const nameOf = (id: string) => names[id] ?? "";

describe("renaming sources like new ones", () => {
  const records = parseGedcom(GED);
  const list = sourceRenames(records, "en", nameOf);
  const to = (x: string) => list.find((r) => r.xref === x);

  test("a source cited once under an event is named after it and the people", () => {
    expect(to("@S2@")).toMatchObject({ from: "Jan Novak, Example Collection, birth", to: "Birth Jan Novak (1900)", weak: false });
    expect(to("@S4@")).toMatchObject({ to: "Wedding Jan Novak & Eva Kral" });
    expect(to("@S6@")?.to).toBe("Death Jan Novak");
  });

  test("a person-level citation is flagged as weak", () => {
    expect(to("@S1@")).toMatchObject({ to: "Person Jan Novak", weak: true });
  });

  test("a source cited several times, or not at all, is left alone; one already named so too", () => {
    expect(to("@S5@")).toBeUndefined();
    expect(to("@S8@")).toBeUndefined();
    expect(to("@S3@")).toBeUndefined();
  });

  test("a name that another source already has gets a number; with a year, the number follows the year", () => {
    expect(to("@S7@")?.to).toBe("Birth Eva Kral (2)");
  });

  test("the year of the event is always in brackets, even when the name is not repeated", () => {
    const dated = GED.replace("2 DATE 1 JAN 1900\n2 SOUR @S2@", "2 DATE 1 JAN 1900\n2 SOUR @S2@");
    expect(sourceRenames(parseGedcom(dated), "en", nameOf).find((r) => r.xref === "@S2@")?.to).toBe("Birth Jan Novak (1900)");
  });

  test("the language of the app names the event", () => {
    expect(sourceRenames(records, "sk", nameOf).find((r) => r.xref === "@S4@")?.to).toBe("Svadba Jan Novak & Eva Kral");
  });

  test("only the title changes, the old one is kept in a note, the rest is written back as it was", () => {
    const out = writeGedcom(applySourceRenames(records, list.filter((r) => r.xref === "@S2@")));
    expect(out).toBe(GED.replace("1 TITL Jan Novak, Example Collection, birth", "1 TITL Birth Jan Novak (1900)\n1 NOTE Original title: Jan Novak, Example Collection, birth"));
  });

  test("nothing to rename leaves the records as they are", () => {
    expect(applySourceRenames(records, [])).toBe(records);
  });
});
