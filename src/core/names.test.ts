import { expect, test } from "vitest";
import { nameDetails, parseGedcom } from "./index";

const records = parseGedcom(`0 HEAD
0 @I1@ INDI
1 NAME Anna /Moss/
2 NPFX Dr.
2 NICK Annie
2 _RUFNAME Anna
2 SPFX von
2 NSFX Jr.
1 NAME Anna /Lake/
2 TYPE married
1 NAME Annie /Moss/
2 TYPE aka
1 NAME /Fox/
0 TRLR
`);
const rec = records[1];

test("called name and other names, without aka names", () => {
  expect(nameDetails(rec)).toEqual({
    parts: [{ kind: "called", value: "Anna" }],
    others: [{ name: "Anna Lake", type: "married" }, { name: "Fox", type: "" }],
  });
});
