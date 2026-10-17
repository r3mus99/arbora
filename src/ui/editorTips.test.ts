import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { suggestions } from "../core/edit";
import { parseGedcom, readRecords } from "../core/gedcom";
import { sourceChoices } from "../core/sources";
import { STRINGS, type StringKey } from "./i18n";
import { PersonEditor } from "./PersonEditor";

// a fictional person who fills every part of the form
const GED = `0 HEAD
1 CHAR UTF-8
0 @S1@ SOUR
1 TITL Parish book
0 @I1@ INDI
1 NAME Anna /Test/
2 NPFX Dr.
2 NSFX Jr.
2 NICK Annie
2 SPFX von
1 NAME Hanna /Tester/
2 TYPE aka
1 SEX F
1 BIRT
2 DATE 1 JAN 1900
2 PLAC Testville
1 CHR
2 DATE 5 JAN 1900
2 PLAC Testville
1 RELI Catholic
1 DEAT
2 DATE 1 JAN 1980
2 AGE 80y
2 CAUS Age
2 AGNC Parish
1 BURI
2 DATE 4 JAN 1980
1 OCCU Teacher
2 SOUR @S1@
3 PAGE 12
3 QUAY 2
1 EDUC School
1 RESI Main street 1
2 PLAC Testville
2 ADDR Other street 2
1 EVEN Medal
2 TYPE Honour
2 NOTE A medal
1 NOTE A note
1 SOUR @S1@
2 PAGE 3
2 QUAY 3
1 ASSO @I2@
2 RELA godfather
1 RESN confidential
1 ADDR Home 1
1 PHON 123
1 EMAIL a@b.test
1 REFN 77
2 TYPE own
1 AFN 1A
1 RFN 2B
1 FAMC @F2@
2 PEDI birth
1 FAMS @F1@
0 @I2@ INDI
1 NAME Karl /Test/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Child /Test/
1 FAMC @F1@
0 @I4@ INDI
1 NAME Parent /Test/
1 SEX M
1 FAMS @F2@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 CHIL @I3@
1 MARR
2 DATE 1920
2 PLAC Testville
1 DIV Y
0 @F2@ FAM
1 HUSB @I4@
1 CHIL @I1@
0 TRLR
`;

const fields = /<(input|select|textarea)\b[^>]*>/g;

/** whether the element at `index` sits inside a tag that has a title */
function hasTitle(html: string, index: number): boolean {
  const stack: { name: string; title: boolean }[] = [];
  const tag = /<(\/?)([a-z0-9]+)\b([^>]*)>/g;
  for (let m = tag.exec(html); m && m.index < index; m = tag.exec(html)) {
    const [, close, name, rest] = m;
    if (/^(input|br|hr|img|option)$/.test(name) || rest.endsWith("/")) continue;
    if (close) { while (stack.length && stack.pop()!.name !== name); } else stack.push({ name, title: /\stitle="/.test(rest) });
  }
  return stack.some((s) => s.title);
}

describe("tooltips of the edit window", () => {
  const records = parseGedcom(GED);
  const data = readRecords(records);
  const find = (id: string) => records.find((r) => r.xref === id)!;
  const t = (key: StringKey) => STRINGS.en[key] ?? key;
  const html = renderToStaticMarkup(createElement(PersonEditor, {
    data, record: find("@I1@"), families: [find("@F1@")], lang: "en", suggest: suggestions(records),
    recordOf: find, sources: sourceChoices(records), onSave: () => {}, allocate: () => "@I1@", onCancel: () => {}, onDirty: () => {}, t,
  }));

  test("the fixture shows the whole form", () => {
    for (const word of ["Teacher", "Medal", "godfather", "Parish book", "a@b.test", "1A"]) expect(html).toContain(word);
    expect((html.match(fields) || []).length).toBeGreaterThan(40);
  });

  // a field without an explanation is a bug: give the field (or its label) a title with a text in every language
  test("every field has a tooltip, on itself or on the label around it", () => {
    const bare = [...html.matchAll(fields)].filter((m) => !/type="(hidden|submit)"/.test(m[0]) && !/\stitle="/.test(m[0]) && !hasTitle(html, m.index!));
    expect(bare.map((m) => m[0])).toEqual([]);
  });
});
