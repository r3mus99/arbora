import { expect, test } from "vitest";
import { nameDetails, parseGedcom, placeCoords } from "./index";

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
1 BIRT
2 PLAC Greenfield
3 MAP
4 LATI N48.5
4 LONG E16.25
1 DEAT
2 PLAC Lakeside
3 _LOC @L1@
1 BURI
2 PLAC Hill
3 MAP
4 LATI S12,5
4 LONG W3.7
1 CHR
2 PLAC Nowhere
3 MAP
4 LATI north
4 LONG 16
0 @L1@ _LOC
1 MAP
2 LATI 47.1
2 LONG 15.2
0 TRLR
`);
const rec = records[1];
const lookup = (x: string) => records.find((r) => r.xref === x);
const event = (tag: string) => rec.children.find((c) => c.tag === tag)!;

test("name pieces and other names, without aka names", () => {
  expect(nameDetails(rec)).toEqual({
    parts: [{ kind: "prefix", value: "Dr." }, { kind: "nickname", value: "Annie" }, { kind: "called", value: "Anna" },
            { kind: "surnamePrefix", value: "von" }, { kind: "suffix", value: "Jr." }],
    others: [{ name: "Anna Lake", type: "married" }, { name: "Fox", type: "" }],
  });
});

test("coordinates written under the place, or in a linked _LOC record", () => {
  expect(placeCoords(event("BIRT"))).toEqual({ lat: 48.5, lon: 16.25 });
  expect(placeCoords(event("DEAT"), lookup)).toEqual({ lat: 47.1, lon: 15.2 });
  expect(placeCoords(event("DEAT"))).toBeNull();
  expect(placeCoords(event("BURI"))).toEqual({ lat: -12.5, lon: -3.7 });
  expect(placeCoords(event("CHR"))).toBeNull();
  expect(placeCoords(rec)).toBeNull();
});
