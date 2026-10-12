import { expect, test } from "vitest";
import { associationsOf, inboundAssociations, parseGedcom } from "./index";

const records = parseGedcom(`0 HEAD
0 @I1@ INDI
1 NAME Ota /Brandt/
1 ASSO @I2@
2 RELA Godparent
1 ASSO @I3@
1 ASSO not a link
0 @I2@ INDI
1 NAME Pia /Moss/
0 @I3@ INDI
1 NAME Quin /Lake/
1 ASSO @I2@
2 RELA witness
0 @F1@ FAM
1 ASSO @I2@
0 TRLR
`);

test("the people a record names, with their role", () => {
  expect(associationsOf(records[1])).toEqual([{ id: "@I2@", role: "godparent" }, { id: "@I3@", role: "" }]);
});

test("the people who name a person, from persons only", () => {
  const inbound = inboundAssociations(records);
  expect(inbound.get("@I2@")).toEqual([{ id: "@I1@", role: "godparent" }, { id: "@I3@", role: "witness" }]);
  expect(inbound.get("@I3@")).toEqual([{ id: "@I1@", role: "" }]);
  expect(inbound.has("@I1@")).toBe(false);
});
