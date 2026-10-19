import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, test } from "vitest";
import {
  DEFAULTS, LANGS, TEXTS, chartRows, collapseAt, decode, findPeople, formatDate, formatPlace, generate, load,
  parseGedcom, reveal, visibleRows, type ChartOptions,
} from "./index";

// sample data shipped with the site: Habsburgs from Wikidata
const sample = readFileSync(new URL("../../public/sample.ged", import.meta.url));
const fonts = {
  regular: readFileSync(new URL("../../public/fonts/DejaVuSans.ttf", import.meta.url)),
  bold: readFileSync(new URL("../../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
  italic: readFileSync(new URL("../../public/fonts/DejaVuSans-Oblique.ttf", import.meta.url)),
};
const data = load(sample);
const opts = (o: Partial<ChartOptions> = {}): ChartOptions => ({ ...DEFAULTS, ...o });

describe("GEDCOM", () => {
  test("loads the sample", () => {
    expect(Object.keys(data.people)).toHaveLength(1714);
    expect(Object.keys(data.families)).toHaveLength(906);
    expect(data.people["@I52@"]).toMatchObject({ name: "Francis I, Holy Roman Emperor", sex: "M" });
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
    for (let i = 0; i < text.length; i++) {
      u16[2 + 2 * i] = text.charCodeAt(i) & 0xff;
      u16[3 + 2 * i] = text.charCodeAt(i) >> 8;
    }
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
    expect(data.people["@I52@"].occupation).toBe("");
  });

  test("finds people by name without diacritics or by ID", () => {
    expect(findPeople("francis i, holy", data.people).map((p) => p.id)).toContain("@I52@");
    expect(findPeople("I52", data.people)).toEqual([data.people["@I52@"]]);
  });

  test("finds people by year of birth or death, alone or with a name", () => {
    const ged = [
      "0 @I1@ INDI", "1 NAME Anna /Test/", "1 BIRT", "2 DATE 12 MAY 1894", "1 DEAT", "2 DATE BET 1950 AND 1952",
      "0 @I2@ INDI", "1 NAME Karl /Test/", "1 BIRT", "2 DATE ABT 1901",
      "0 @I3@ INDI", "1 NAME Eva /Other/", "1 NAME Eva /Test/", "2 TYPE aka", "1 DEAT", "2 DATE 1894",
    ].join("\n");
    const { people } = load(ged);
    const ids = (q: string) => findPeople(q, people).map((p) => p.id);
    expect(ids("1894")).toEqual(["@I1@", "@I3@"]);
    expect(ids("1952")).toEqual(["@I1@"]);
    expect(ids("190")).toEqual(["@I2@"]);
    expect(ids("test 1894")).toEqual(["@I1@", "@I3@"]);
    expect(ids("karl 1894")).toEqual([]);
    expect(ids("19")).toEqual([]);
  });
});

describe("search by place", () => {
  test("finds people by place of birth or death, alone or with a name or year", () => {
    const ged = [
      "0 @I1@ INDI", "1 NAME Anna /Test/", "1 BIRT", "2 DATE 1894", "2 PLAC Vienna", "1 DEAT", "2 PLAC Graz",
      "0 @I2@ INDI", "1 NAME Karl /Test/", "1 BIRT", "2 DATE 1901", "2 PLAC Graz",
      "0 @I3@ INDI", "1 NAME Eva /Other/",
    ].join("\n");
    const { people } = load(ged);
    const ids = (q: string) => findPeople(q, people).map((p) => p.id);
    expect(ids("graz")).toEqual(["@I1@", "@I2@"]);
    expect(ids("vienna")).toEqual(["@I1@"]);
    expect(ids("karl graz")).toEqual(["@I2@"]);
    expect(ids("graz 1894")).toEqual(["@I1@"]);
    expect(ids("eva graz")).toEqual([]);
  });
});

describe("formatting", () => {
  test.each([
    ["ABT 1761", "cca 1761", "abt 1761"],
    ["BEF 1900", "pred 1900", "bef 1900"],
    ["AFT 1800", "po 1800", "aft 1800"],
    ["BET 1903 AND 1905", "1903–1905", "1903–1905"],
    ["14 MAY 1991", "14.5.1991", "14 May 1991"],
    ["MAY 1991", "Máj 1991", "May 1991"],
    ["OCT 1961", "Okt. 1961", "Oct 1961"],
    ["ABT OCT 1961", "cca Okt. 1961", "abt Oct 1961"],
    ["1991-05-14", "14.5.1991", "14 May 1991"],
    ["(neznámy)", "neznámy", "neznámy"],
  ])("%s", (raw, sk, en) => {
    expect(formatDate(raw, true, "sk")).toBe(sk);
    expect(formatDate(raw, true, "en")).toBe(en);
  });

  test("a month without a day is shown with the month name in every language", () => {
    expect(formatDate("OCT 1961", true, "de")).toBe("Okt. 1961");
    expect(formatDate("OCT 1961", true, "hu")).toBe("1961. okt.");
    expect(formatDate("OCT 1961", true, "uk")).toBe("жовт. 1961");
    for (const lang of LANGS) expect(formatDate("OCT 1961", true, lang), lang).not.toMatch(/\b10\b/);
  });

  test("year only", () => {
    expect(formatDate("14 MAY 1991", false, "sk")).toBe("1991");
  });

  test("places", () => {
    expect(formatPlace("Dolná Ves, Okres, Kraj")).toBe("Dolná Ves");
    expect(formatPlace("Dolná Ves")).toBe("Dolná Ves");
    expect(formatPlace("")).toBe("");
  });

  test("every language has all PDF texts", () => {
    for (const lang of LANGS) {
      expect(Object.keys(TEXTS[lang].abbr)).toEqual(["birt", "marr", "deat", "resi"]);
      expect(TEXTS[lang].page).toMatch(/\{n\}.*\{total\}/);
    }
  });
});

describe("ancestor chart", () => {
  const rows = chartRows(data, "@I1@", opts());

  test("root is generation 1 with father's line above and mother's below", () => {
    expect(rows).toHaveLength(1491);
    const root = rows.findIndex((r) => r.gen === 1);
    expect(rows[root].text).toBe("1. Charles I of Austria (*1887, †1922)");
    expect(rows.slice(0, root).some((r) => r.text.startsWith("2. Archduke Otto of Austria"))).toBe(true);
    expect(rows.slice(root + 1).some((r) => r.text.startsWith("2. Princess Maria Josepha of Saxony"))).toBe(true);
    expect(rows[0].text).toBe("13. Francis I, Duke of Lorraine (*1517, ∞1541, †1545)");
  });

  test("repeated ancestor is printed once and then referenced", () => {
    const dups = rows.filter((r) => r.dup);
    expect(dups).toHaveLength(403);
    for (const r of dups) expect(r.target?.personId).toBe(r.personId);
  });

  test("Ahnentafel numbers and generation limit", () => {
    const ahn = chartRows(data, "@I1@", opts({ numbering: "ahnentafel", generations: 3 }));
    expect(ahn.map((r) => r.text.split(".")[0]).sort((a, b) => +a - +b))
      .toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(ahn.find((r) => r.text.startsWith("2. "))?.text).toBe("2. Archduke Otto of Austria (*1865, ∞1886, †1906)");
  });
});

describe("descendant chart", () => {
  test("spouses with marriage year and children below", () => {
    const rows = chartRows(data, "@I52@", opts({ chart: "descendants" }));
    expect(rows).toHaveLength(699);
    expect(rows.slice(0, 3).map((r) => [r.gen, r.text])).toEqual([
      [1, "1. Francis I, Holy Roman Emperor (*1708, †1765)"],
      [1, "∞1736 Maria Theresa of Austria (*1717, †1780)"],
      [2, "2. Archduchess Maria Elisabeth of Austria (*1737, †1740)"],
    ]);
  });

  test("several marriages and a divorce", () => {
    const spouses = chartRows(data, "@I416@", opts({ chart: "descendants" })).filter((r) => r.spouse);
    expect(spouses.slice(0, 2).map((r) => r.text)).toEqual([
      "∞1572 ⚮ Margaret of Valois (*1553, †1615)",
      "∞1600 Marie de' Medici (*1575, †1642)",
    ]);
  });

  test("spouse lines name the spouse", () => {
    const rows = chartRows(data, "@I52@", opts({ chart: "descendants" }));
    const spouses = rows.filter((r) => r.spouse);
    expect(spouses.length).toBeGreaterThan(0);
    for (const r of spouses) expect(r.personId).toBeNull();
    for (const r of spouses.filter((s) => s.spouseId)) expect(r.text).toContain(data.people[r.spouseId!].name);
  });

  test("d'Aboville numbering and without spouses", () => {
    const rows = chartRows(data, "@I52@", opts({ chart: "descendants", numbering: "ahnentafel",
                                                 showSpouses: false }));
    expect(rows.some((r) => r.spouse)).toBe(false);
    expect(rows[1].text).toMatch(/^1\.1\. Archduchess Maria Elisabeth of Austria/);
  });
});

describe("collapsed branches", () => {
  const anc = chartRows(data, "@I1@", opts({ numbering: "ahnentafel" }));
  const desc = chartRows(data, "@I52@", opts({ chart: "descendants" }));

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
    const leopold = desc.find((r) => r.ref === "1.9")!;
    expect(leopold.text).toBe("2. Leopold II, Holy Roman Emperor (*1747, †1792)");
    const shown = visibleRows(desc, new Set([leopold.path]));
    expect(shown.some((r) => r.path.startsWith("1.9~") || r.path.startsWith("1.9."))).toBe(false);
    expect(shown.find((r) => r.path === "1.9")!.hidden).toBe(desc.filter((r) => !r.spouse && r.path.startsWith("1.9.")).length);
  });

  test("revealing a row opens the branches above it", () => {
    const deep = anc.find((r) => r.gen === 5)!;
    const open = reveal(collapseAt(anc, 2), deep.path);
    expect(visibleRows(anc, open).some((r) => r.index === anc.indexOf(deep))).toBe(true);
  });
});

describe("PDF", () => {
  test("ancestors, A4 portrait", async () => {
    const res = await generate(data, "@I1@", { lang: "sk", generations: 7 }, fonts);
    expect(res).toMatchObject({ pages: 3, rows: 103, generations: 7, title: "Predkovia: Charles I of Austria" });
    const doc = await PDFDocument.load(res.bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getTitle()).toBe("Predkovia: Charles I of Austria");
  });

  test("descendants in English, landscape", async () => {
    const res = await generate(data, "@I52@", { chart: "descendants", lang: "en",
                                                orientation: "landscape" }, fonts);
    expect(res.title).toBe("Descendants of Francis I, Holy Roman Emperor");
    const page = (await PDFDocument.load(res.bytes)).getPage(0);
    expect(page.getWidth()).toBeGreaterThan(page.getHeight());
  });

  test("styled pieces match the text; coloured and italic PDF is built", async () => {
    const o = { lang: "en" as const, showPlaces: true as const, dates: "full" as const, generations: 4 };
    const rows = chartRows(data, "@I1@", o);
    for (const r of rows) expect(r.parts.map((p) => p.text).join("")).toBe(r.text);
    const kinds = new Set(rows.flatMap((r) => r.parts.map((p) => p.kind)));
    for (const k of ["num", "name", "birt", "deat", "place", "marr"]) expect(kinds).toContain(k);
    const plain = await generate(data, "@I1@", o, fonts);
    const colour = await generate(data, "@I1@", { ...o, colorPdf: true }, fonts);
    expect(colour.pages).toBe(plain.pages);
    expect(colour.bytes.length).toBeGreaterThan(0);
    // without an italic font the regular one stands in
    expect((await generate(data, "@I1@", o, { regular: fonts.regular })).pages).toBeGreaterThan(0);
  });

  test("unknown person", async () => {
    await expect(generate(data, "@X@", {}, fonts)).rejects.toThrow("@X@");
  });
});
