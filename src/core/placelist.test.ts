import { describe, expect, test } from "vitest";
import { parseGedcom, placeName, placeOverview } from "./index";

const ged = [
  "0 @I1@ INDI", "1 BIRT", "2 PLAC Dolná 22, Okres Sever", "1 DEAT", "2 PLAC Dolná, Okres Sever",
  "0 @I2@ INDI", "1 BIRT", "2 PLAC Dolná 7, Okres Sever",
  "0 @I3@ INDI", "1 RESI", "2 PLAC Horná",
  "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I3@", "1 MARR", "2 PLAC Horná",
].join("\n");

describe("place list", () => {
  test("house numbers do not make a new place", () => {
    expect(placeName("Dolná 22, Okres Sever")).toBe("Dolná, Okres Sever");
    expect(placeName("Horná")).toBe("Horná");
  });

  test("places with events, people and houses", () => {
    const list = placeOverview(parseGedcom(ged));
    expect(list.map((p) => p.name)).toEqual(["Dolná, Okres Sever", "Horná"]);
    const dolna = list[0];
    expect(dolna.events).toBe(3);
    expect(dolna.people.sort()).toEqual(["@I1@", "@I2@"]);
    expect([...dolna.houses.keys()].sort()).toEqual(["22", "7"]);
    // the marriage counts for both spouses
    expect(list[1].events).toBe(2);
    expect(list[1].people.sort()).toEqual(["@I2@", "@I3@"]);
  });
});
