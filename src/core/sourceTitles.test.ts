import { describe, expect, test } from "vitest";
import { parseGedcom, writeGedcom } from "./index";
import { applySourceRenames } from "./sourceTitles";

// fictional file: one source with a title
const GED = `0 HEAD
1 CHAR UTF-8
0 @S2@ SOUR
1 TITL Jan Novak, Example Collection, birth
0 TRLR
`;

describe("renaming a source", () => {
  const records = parseGedcom(GED);
  const rename = { xref: "@S2@", from: "Jan Novak, Example Collection, birth", to: "Birth Jan Novak (1900)" };

  test("only the title changes, the old one is kept in a note, the rest is written back as it was", () => {
    const out = writeGedcom(applySourceRenames(records, [rename]));
    expect(out).toBe(GED.replace("1 TITL Jan Novak, Example Collection, birth", "1 TITL Birth Jan Novak (1900)\n1 NOTE Original title: Jan Novak, Example Collection, birth"));
  });

  test("nothing to rename leaves the records as they are", () => {
    expect(applySourceRenames(records, [])).toBe(records);
  });
});
