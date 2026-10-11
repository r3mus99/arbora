import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, test } from "vitest";
import {
  DEFAULTS, LANGS, TEXTS, chartRows, collapseAt, decode, findPeople, formatDate, formatPlace, generate, load,
  parseGedcom, reveal, visibleRows, type ChartOptions,
} from "./index";

// fictional sample data shipped with the site
const sample = readFileSync(new URL("../../public/ukazka.ged", import.meta.url));
const fonts = {
  regular: readFileSync(new URL("../../public/fonts/DejaVuSans.ttf", import.meta.url)),
  bold: readFileSync(new URL("../../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
};
const data = load(sample);
const opts = (o: Partial<ChartOptions> = {}): ChartOptions => ({ ...DEFAULTS, ...o });

describe("GEDCOM", () => {
  test("loads the sample", () => {
    expect(Object.keys(data.people)).toHaveLength(792);
    expect(Object.keys(data.families)).toHaveLength(354);
    expect(data.people["@I13@"]).toMatchObject({ name: "Juraj Sokol", sex: "M" });
  });

  test("joins CONC/CONT and nests sub-records", () => {
    const [rec] = parseGedcom("0 @N1@ NOTE first\n1 CONT second\n1 CONC part\n1 SOUR x\n2 PAGE 5");
    expect(rec.value).toBe("first\nsecondpart");
    expect(rec.children).toHaveLength(1);
    expect(rec.children[0].children[0]).toMatchObject({ tag: "PAGE", value: "5" });
  });

  test("decodes UTF-8 with BOM, UTF-16 and Windows-1250", () => {
    const text = "0 HEAD\n1 NOTE Ťažký žľab";
    const utf8 = new TextEncoder().encode("﻿" + text);
    expect(decode(utf8)).toBe(text);
    const u16 = new Uint8Array(2 + text.length * 2);
    u16.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i++) u16[2 + 2 * i] = text.charCodeAt(i) & 0xff, u16[3 + 2 * i] = text.charCodeAt(i) >> 8;
    expect(decode(u16)).toBe(text);
    // "Ťa" in Windows-1250
    expect(decode(new Uint8Array([0x8d, 0x61]))).toBe("Ťa");
  });

  test("uses christening and burial when birth and death are missing", () => {
    const ged = "0 @I1@ INDI\n1 NAME Ján /Kováč/\n1 CHR\n2 DATE 3 MAR 1850\n1 BURI\n2 PLAC Dolná Ves";
    expect(load(ged).people["@I1@"]).toMatchObject({
      name: "Ján Kováč", birth: { date: "3 MAR 1850", place: "" }, death: { date: "", place: "Dolná Ves" },
    });
    expect(load(ged, false).people["@I1@"].birth).toBeNull();
  });

  test("joins occupations", () => {
    const ged = "0 @I1@ INDI\n1 NAME Ján /Kováč/\n1 OCCU roľník\n1 OCCU kováč";
    expect(load(ged).people["@I1@"].occupation).toBe("roľník, kováč");
    expect(data.people["@I13@"].occupation).toBe("");
  });

  test("finds people by name without diacritics or by ID", () => {
    expect(findPeople("juraj sokol", data.people).map((p) => p.id)).toContain("@I13@");
    expect(findPeople("I13", data.people)).toEqual([data.people["@I13@"]]);
  });
});

describe("formatting", () => {
  test.each([
    ["ABT 1761", "cca 1761", "abt 1761"],
    ["BEF 1900", "pred 1900", "bef 1900"],
    ["AFT 1800", "po 1800", "aft 1800"],
    ["BET 1903 AND 1905", "1903–1905", "1903–1905"],
    ["14 MAY 1991", "14.5.1991", "14 May 1991"],
    ["MAY 1991", "5/1991", "May 1991"],
    ["1991-05-14", "14.5.1991", "14 May 1991"],
    ["(neznámy)", "neznámy", "neznámy"],
  ])("%s", (raw, sk, en) => {
    expect(formatDate(raw, true, "sk")).toBe(sk);
    expect(formatDate(raw, true, "en")).toBe(en);
  });

  test("year only", () => {
    expect(formatDate("14 MAY 1991", false, "sk")).toBe("1991");
  });

  test("places", () => {
    expect(formatPlace("Dolná Ves, Okres, Kraj", "short")).toBe("Dolná Ves");
    expect(formatPlace("Dolná Ves, Okres, Kraj", "full")).toBe("Dolná Ves, Okres, Kraj");
    expect(formatPlace("Dolná Ves", "none")).toBe("");
  });

  test("every language has all PDF texts", () => {
    for (const lang of LANGS) {
      expect(Object.keys(TEXTS[lang].abbr)).toEqual(["birt", "marr", "deat"]);
      expect(TEXTS[lang].page).toMatch(/\{n\}.*\{total\}/);
    }
  });
});

describe("ancestor chart", () => {
  const rows = chartRows(data, "@I1@", opts());

  test("root is generation 1 with father's line above and mother's below", () => {
    expect(rows).toHaveLength(269);
    const root = rows.findIndex((r) => r.gen === 1);
    expect(rows[root].text).toBe("1. Adam Sokol (*1994)");
    expect(rows.slice(0, root).some((r) => r.text.startsWith("2. Ondrej Sokol"))).toBe(true);
    expect(rows.slice(root + 1).some((r) => r.gen === 2)).toBe(true);
    expect(rows[0].text).toBe("10. Štefan Sokol (†cca 1766)");
  });

  test("repeated ancestor is printed once and then referenced", () => {
    const dups = rows.filter((r) => r.dup);
    expect(dups.map((r) => r.text)).toEqual(["6. Samuel Gálik (*1830, †1873)"]);
    expect(dups[0].target?.personId).toBe(dups[0].personId);
    expect(chartRows(data, "@I1@", opts({ repeat: true })).filter((r) => r.dup)).toHaveLength(0);
  });

  test("divorce, Ahnentafel numbers and generation limit", () => {
    const ahn = chartRows(data, "@I1@", opts({ numbering: "ahnentafel", generations: 3 }));
    expect(ahn.map((r) => r.text.split(".")[0]).sort((a, b) => +a - +b))
      .toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(ahn.find((r) => r.text.startsWith("2. "))?.text).toContain("(rozv.)");
  });
});

describe("descendant chart", () => {
  test("spouses with marriage year and children below", () => {
    const rows = chartRows(data, "@I13@", opts({ chart: "descendants" }));
    expect(rows).toHaveLength(145);
    expect(rows.slice(0, 4).map((r) => [r.gen, r.text])).toEqual([
      [1, "1. Juraj Sokol (*cca 1761, †cca 1806)"],
      [1, "∞1791 Magdaléna Mlynárová (*cca 1762, †cca 1804)"],
      [2, "2. Tomáš Sokol (*cca 1792, †1869)"],
      [2, "∞cca 1821 Veronika Ondrušová (*1803, †cca 1845)"],
    ]);
  });

  test("spouse lines name the spouse", () => {
    const rows = chartRows(data, "@I13@", opts({ chart: "descendants" }));
    const spouses = rows.filter((r) => r.spouse);
    expect(spouses.length).toBeGreaterThan(0);
    for (const r of spouses) {
      expect(r.personId).toBeNull();
      if (r.spouseId) expect(r.text).toContain(data.people[r.spouseId].name);
    }
  });

  test("d'Aboville numbering and without spouses", () => {
    const rows = chartRows(data, "@I13@", opts({ chart: "descendants", numbering: "ahnentafel",
                                                 showSpouses: false }));
    expect(rows.some((r) => r.spouse)).toBe(false);
    expect(rows[1].text).toMatch(/^1\.1\. Tomáš Sokol/);
  });
});

describe("collapsed branches", () => {
  const anc = chartRows(data, "@I1@", opts({ numbering: "ahnentafel" }));
  const desc = chartRows(data, "@I13@", opts({ chart: "descendants" }));

  test("nothing collapsed shows every row with the same connectors", () => {
    const shown = visibleRows(anc, new Set());
    expect(shown).toHaveLength(anc.length);
    expect(shown.map((r) => r.links)).toEqual(anc.map((r) => r.links));
  });

  test("collapsing the father's line hides his ancestors and counts them", () => {
    const father = anc.find((r) => r.ref === "2")!;
    expect(father.path).toBe("1.f");
    const shown = visibleRows(anc, new Set([father.path]));
    const row = shown.find((r) => r.path === "1.f")!;
    expect(row.hidden).toBe(anc.filter((r) => r.path.startsWith("1.f.")).length);
    expect(row.links).toEqual([]);
    expect(shown).toHaveLength(anc.length - row.hidden);
    expect(shown.some((r) => r.ref === "4")).toBe(false);
    expect(shown.some((r) => r.ref === "3")).toBe(true);
    // connectors point at rows that are still there
    for (const r of shown) for (const l of r.links) expect(Math.max(l.a, l.b)).toBeLessThan(shown.length);
  });

  test("showing N generations", () => {
    const shown = visibleRows(anc, collapseAt(anc, 3));
    expect(shown.map((r) => r.ref).sort((a, b) => +a - +b)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(shown.filter((r) => r.hidden).length).toBeGreaterThan(0);
  });

  test("descendants: spouse lines fold with the person", () => {
    const tomas = desc.find((r) => r.ref === "1.1")!;
    const shown = visibleRows(desc, new Set([tomas.path]));
    expect(shown.some((r) => r.path.startsWith("1.1~") || r.path.startsWith("1.1."))).toBe(false);
    expect(shown.find((r) => r.path === "1.1")!.hidden).toBe(desc.filter((r) => !r.spouse && r.path.startsWith("1.1.")).length);
  });

  test("revealing a row opens the branches above it", () => {
    const deep = anc.find((r) => r.gen === 5)!;
    const open = reveal(collapseAt(anc, 2), deep.path);
    expect(visibleRows(anc, open).some((r) => r.index === anc.indexOf(deep))).toBe(true);
  });
});

describe("PDF", () => {
  test("ancestors, A4 portrait", async () => {
    const res = await generate(data, "@I1@", { lang: "sk" }, fonts);
    expect(res).toMatchObject({ pages: 6, rows: 269, generations: 10, title: "Predkovia: Adam Sokol" });
    const doc = await PDFDocument.load(res.bytes);
    expect(doc.getPageCount()).toBe(6);
    expect(doc.getTitle()).toBe("Predkovia: Adam Sokol");
  });

  test("descendants in English, landscape", async () => {
    const res = await generate(data, "@I13@", { chart: "descendants", lang: "en",
                                                orientation: "landscape" }, fonts);
    expect(res.title).toBe("Descendants of Juraj Sokol");
    const page = (await PDFDocument.load(res.bytes)).getPage(0);
    expect(page.getWidth()).toBeGreaterThan(page.getHeight());
  });

  test("unknown person", async () => {
    await expect(generate(data, "@X@", {}, fonts)).rejects.toThrow();
  });
});
