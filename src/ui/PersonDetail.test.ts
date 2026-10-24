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
      onStar: () => {}, homeId: null, onSetHome: () => {}, lang: "en", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
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
      onStar: () => {}, homeId: null, onSetHome: () => {}, lang: "en", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.en[key] ?? key,
    }));
    expect(html).toContain("<span>1900 · </span>");
    expect(html).toContain('<div class="tl-what">Bride&#x27;s birth<span> · Brno</span></div>');
    expect(html).toContain('<div class="tl-what">Groom&#x27;s birth</div>');
    expect(html).toContain("Bob</button> (16y)</span> &amp; <span class=\"person-ref\"><button class=\"link person\" type=\"button\">Alice</button> (18y)");
  });

  test("only direct ancestors of the home person are bold in the timeline", () => {
    const records = parseGedcom(GED);
    const data = readRecords(records);
    const html = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I1@", lookup: (x: string) => records.find((r) => r.xref === x), inbound: [], rootId: "@I1@", starred: false,
      onStar: () => {}, homeId: "@I3@", onSetHome: () => {}, lang: "en", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.en[key] ?? key,
    }));
    expect(html).toContain('class="link person ancestor"');
    expect(html).toMatch(/title="Father(?:&#10;|\n)→ Bob Sample \(1902\)(?:&#10;|\n)→ Child Sample \(1920\)"/);
    expect(html).toContain('<span class="ancestor-relation">Mother</span>');
    expect(html).toContain('class="link person" type="button">Child Sample</button>');
  });

  test("uses correct Slovak great-grandparent relationship numbering", () => {
    const records = parseGedcom(`0 HEAD
0 @I1@ INDI
1 NAME Home /Person/
1 SEX F
1 BIRT
2 DATE 2000
1 FAMC @F1@
0 @I2@ INDI
1 NAME Parent /Person/
1 SEX M
1 FAMS @F1@
1 FAMC @F2@
0 @I3@ INDI
1 NAME Grandparent /Person/
1 SEX F
1 FAMS @F2@
1 FAMC @F3@
0 @I4@ INDI
1 NAME Great-grandparent /Person/
1 SEX F
1 FAMS @F3@
1 FAMC @F4@
0 @I5@ INDI
1 NAME Ancestor /Person/
1 SEX M
1 FAMS @F4@
1 FAMC @F5@
0 @I6@ INDI
1 NAME Distant ancestor /Person/
1 SEX F
1 FAMS @F5@
0 @I7@ INDI
1 NAME Another ancestor /Person/
1 SEX F
1 FAMS @F4@
1 FAMC @F6@
0 @I9@ INDI
1 NAME More distant ancestor /Person/
1 SEX M
1 FAMS @F6@
0 @F1@ FAM
1 HUSB @I2@
1 CHIL @I1@
0 @F2@ FAM
1 WIFE @I3@
1 CHIL @I2@
0 @F3@ FAM
1 HUSB @I4@
1 CHIL @I3@
0 @F4@ FAM
1 HUSB @I5@
1 WIFE @I7@
1 CHIL @I4@
0 @F5@ FAM
1 WIFE @I6@
1 CHIL @I5@
0 @F6@ FAM
1 HUSB @I9@
1 CHIL @I7@
0 TRLR
`);
    const data = readRecords(records);
    const html = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I5@", lookup: (x: string) => records.find((r) => r.xref === x), inbound: [], rootId: "@I5@", starred: false,
      onStar: () => {}, homeId: "@I1@", onSetHome: () => {}, lang: "sk", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.sk[key] ?? key,
    }));
    expect(html).toMatch(/title="Prababka(?:&#10;|\n)→ Great-grandparent Person(?:&#10;|\n)→ Grandparent Person(?:&#10;|\n)→ Parent Person(?:&#10;|\n)→ Home Person \(2000\)"/);
    const secondGreatGrandmotherHtml = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I9@", lookup: (x: string) => records.find((r) => r.xref === x), inbound: [], rootId: "@I9@", starred: false,
      onStar: () => {}, homeId: "@I1@", onSetHome: () => {}, lang: "sk", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.sk[key] ?? key,
    }));
    expect(secondGreatGrandmotherHtml).toMatch(/title="2\. prababka(?:&#10;|\n)→ Another ancestor Person(?:&#10;|\n)→ Great-grandparent Person(?:&#10;|\n)→ Grandparent Person(?:&#10;|\n)→ Parent Person(?:&#10;|\n)→ Home Person \(2000\)"/);
    const distantHtml = renderToStaticMarkup(createElement(PersonDetail, {
      data, id: "@I6@", lookup: (x: string) => records.find((r) => r.xref === x), inbound: [], rootId: "@I6@", starred: false,
      onStar: () => {}, homeId: "@I1@", onSetHome: () => {}, lang: "sk", onFocus: () => {}, onMakeRoot: () => {}, onChange: () => {},
      suggest: suggestions(records), onEdit: () => {}, onBack: () => {},
      t: (key: StringKey) => STRINGS.sk[key] ?? key,
    }));
    expect(distantHtml).toMatch(/title="2\. pradedko(?:&#10;|\n)→ Ancestor Person(?:&#10;|\n)→ Great-grandparent Person(?:&#10;|\n)→ Grandparent Person(?:&#10;|\n)→ Parent Person(?:&#10;|\n)→ Home Person \(2000\)"/);
  });
});
