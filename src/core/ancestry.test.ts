import { describe, expect, test } from "vitest";
import { ancestry, shortName } from "./ancestry";
import { load } from "./gedcom";

const GED = `0 HEAD
0 @I1@ INDI
1 NAME Home /Person/
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /Person/
1 FAMC @F2@
0 @I3@ INDI
1 NAME Mother /Other/
0 @I4@ INDI
1 NAME Grandpa /Person/
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I4@
1 CHIL @I2@
0 TRLR
`;

describe("ancestry", () => {
  const data = load(GED);
  test("each ancestor gets its generation and the line down to the home person", () => {
    const a = ancestry(data, "@I1@");
    expect(a.generations.get("@I2@")).toBe(1);
    expect(a.generations.get("@I4@")).toBe(2);
    expect(a.paths.get("@I4@")).toEqual(["@I4@", "@I2@", "@I1@"]);
    expect(a.paths.get("@I1@")).toEqual(["@I1@"]);
  });
  test("without a home person there are no ancestors", () => {
    expect(ancestry(data, null).paths.size).toBe(0);
  });
  test("a short name has no title, no place of rule and nothing after a comma", () => {
    const p = (name: string) => ({ name, given: name } as never);
    expect(shortName(p("Archduke Franz Karl of Austria"))).toBe("Franz Karl");
    expect(shortName(p("Francis II, Holy Roman Emperor"))).toBe("Francis II");
    expect(shortName(p("Ján Nepomucký"))).toBe("Ján Nepomucký");
    expect(shortName(undefined)).toBe("?");
  });
});
