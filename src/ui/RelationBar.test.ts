import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { load } from "../core/gedcom";
import { STRINGS, type StringKey } from "./i18n";
import { RelationBar } from "./RelationBar";

const GED = `0 HEAD
0 @I1@ INDI
1 NAME Home /Person/
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /Person/
1 FAMC @F2@
0 @I3@ INDI
1 NAME Grandpa /Person/
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 HUSB @I3@
1 CHIL @I2@
0 TRLR
`;

const render = (selectedId: string, homeId: string | null) => renderToStaticMarkup(createElement(RelationBar, {
  data: load(GED), selectedId, homeId, onOpen: () => {}, onSetHome: () => {},
  t: (key: StringKey) => STRINGS.en[key] ?? key,
}));

describe("relation bar", () => {
  test("an ancestor of the home person shows the line from the home person", () => {
    const html = render("@I3@", "@I1@");
    expect(html).toContain(">Home Person</button>");
    expect(html).not.toContain("home-chip");
    expect(html).toContain(">Father</button>");
    expect(html).toContain('<strong title="Grandpa Person">Grandpa</strong>');
  });
  test("another person shows no line, the home person itself neither", () => {
    expect(render("@I1@", "@I1@")).not.toContain("crumbs");
  });
  test("without a home person the chip offers to set one", () => {
    expect(render("@I1@", null)).toContain("home-chip empty");
  });
});
