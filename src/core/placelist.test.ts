import { describe, expect, test } from "vitest";
import { parseGedcom, placeName, placeOverview } from "./index";

const ged = [
  "0 @I1@ INDI", "1 BIRT", "2 PLAC Dolná 22, Okres Sever", "1 DEAT", "2 PLAC Dolná  22 , Okres Sever",
  "0 @I2@ INDI", "1 BIRT", "2 PLAC Dolná 7, Okres Sever",
  "0 @I3@ INDI", "1 RESI", "2 PLAC Horná",
  "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I3@", "1 MARR", "2 PLAC Horná",
].join("\n");

describe("place list", () => {
  test("only spacing is tidied", () => {
    expect(placeName(" Dolná  22 , Okres Sever")).toBe("Dolná 22, Okres Sever");
  });

  test("the same village with another house number is another place", () => {
    const list = placeOverview(parseGedcom(ged));
    expect(list.map((p) => p.name)).toEqual(["Dolná 22, Okres Sever", "Horná", "Dolná 7, Okres Sever"]);
    expect(list[0]).toMatchObject({ events: 2, people: ["@I1@"] });
    // the marriage counts for both spouses
    expect(list[1].events).toBe(2);
    expect(list[1].people.sort()).toEqual(["@I2@", "@I3@"]);
  });
});
