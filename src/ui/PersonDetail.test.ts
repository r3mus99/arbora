import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { suggestions } from "../core/edit";
import { parseGedcom, readRecords } from "../core/gedcom";
import { STRINGS, type StringKey } from "./i18n";
import { PersonDetail } from "./PersonDetail";

const GED = `0 HEAD
0 @I1@ INDI
1 NAME Alice /Sample/
1 SEX F
1 BIRT
2 DATE 1900
2 PLAC Brno, Czechia
1 FAMS @F1@
0 @I2@ INDI
1 NAME Bob /Sample/
1 SEX M
1 BIRT
2 DATE 1902
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child /Sample/
1 BIRT
2 DATE 1920
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 CHIL @I3@
1 MARR
2 DATE 1918
0 TRLR
`;

describe("person detail timeline", () => {
  test("shows the spouse and child on the date line, with event type and age below", () => {
    const records = parseGedcom(GED);
    const data = readRecords(records);
    const recordOf = (xref: string) => records.find((r) => r.xref === xref);
    const html = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I1@", lookup: recordOf, inbound: [], rootId: "@I1@", starred: false,
      onStar: () => {}, lang: "en", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.en[key] ?? key,
    }));

    expect(html).toContain(
      'class="tl-date"><span>1918</span> · <span class="person-ref"><button class="link person" type="button">Bob Sample</button></span></div><div class="tl-what">Marriage<span> · at 18</span></div>',
    );
    expect(html).toContain(
      'class="tl-date"><span>1920</span> · <span class="person-ref"><button class="link person" type="button">Child Sample</button></span></div><div class="tl-what">Child born<span> · at 20</span></div>',
    );
  });

  test("parents: birth rows show date and name, then role and place; the wedding shows both spouses with ages", () => {
    const records = parseGedcom(GED);
    const data = readRecords(records);
    const html = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I3@", lookup: (x: string) => records.find((r) => r.xref === x), inbound: [], rootId: "@I3@", starred: false,
      onStar: () => {}, lang: "en", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.en[key] ?? key,
    }));
    expect(html).toContain("<span>1900 · </span>");
    expect(html).toContain('<div class="tl-what">Bride&#x27;s birth<span> · Brno</span></div>');
    expect(html).toContain('<div class="tl-what">Groom&#x27;s birth</div>');
    expect(html).toContain("<span>1918 · </span><span>Bob (16y)</span> ⚭ <span>Alice (18y)</span>");
  });
});
