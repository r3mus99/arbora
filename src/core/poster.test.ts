import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, test } from "vitest";
import {
  POSTER_PAPER, buildPoster, generatePoster, load, posterSeed, posterSvg, random, textWidth,
} from "./index";

const data = load(readFileSync(new URL("../../public/sample.ged", import.meta.url)));
const fonts = {
  regular: readFileSync(new URL("../../public/fonts/DejaVuSans.ttf", import.meta.url)),
  bold: readFileSync(new URL("../../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
};
const ROOT = "@I1@";

describe("seeded random", () => {
  test("the same seed gives the same sequence, another seed another one", () => {
    const a = random(5), b = random(5), c = random(6);
    const seq = (r: () => number) => [r(), r(), r()];
    expect(seq(a)).toEqual(seq(b));
    expect(seq(random(5))).not.toEqual(seq(c));
    expect(seq(random(1)).every((n) => n >= 0 && n < 1)).toBe(true);
  });

  test("a poster seed depends on the person and on the chosen number", () => {
    expect(posterSeed("@I1@", 0)).toBe(posterSeed("@I1@", 0));
    expect(posterSeed("@I1@", 0)).not.toBe(posterSeed("@I1@", 1));
    expect(posterSeed("@I1@", 0)).not.toBe(posterSeed("@I2@", 0));
  });
});

describe("poster layout", () => {
  test("a full five-generation tree has a plate for each of the 31 ancestors, and the root at the bottom", () => {
    const p = buildPoster(data, ROOT, { posterGens: 5, lang: "en" });
    expect(p.people).toBe(31);
    expect(p.generations).toBe(5);
    expect(p.title).toBe("Ancestors of Karol I.");
    expect(p.texts.some((t) => t.text === "Karol I." && t.y > p.height * 0.8)).toBe(true);
  });

  test("everything stays inside the drawing area and no line is wider than the assumed text width", () => {
    for (const gens of [2, 3, 5, 7]) {
      const p = buildPoster(data, ROOT, { posterGens: gens });
      for (const t of p.texts) {
        expect(t.x - textWidth(t.text, t.size, t.bold) / 2, t.text).toBeGreaterThanOrEqual(-1);
        expect(t.x + textWidth(t.text, t.size, t.bold) / 2, t.text).toBeLessThanOrEqual(p.width + 1);
        expect(t.y).toBeLessThan(p.height);
      }
    }
  });

  test("the generations are limited to 2..7 and a person without parents has just the plate", () => {
    expect(buildPoster(data, ROOT, { posterGens: 99 }).generations).toBe(7);
    expect(buildPoster(data, ROOT, { posterGens: 0 }).generations).toBe(2);
    const lone = Object.values(data.people).find((x) => !x.famc.length)!;
    const p = buildPoster(data, lone.id, { posterGens: 5 });
    expect(p.people).toBe(1);
  });

  test("an unknown father leaves the mother's side in place", () => {
    const some = structuredClone(data);
    const child = Object.values(some.people).find((x) => x.famc.length && some.families[x.famc[0]].husb && some.families[x.famc[0]].wife)!;
    some.families[child.famc[0]].husb = null;
    const p = buildPoster(some, child.id, { posterGens: 3 });
    expect(p.people).toBeLessThan(buildPoster(data, child.id, { posterGens: 3 }).people);
  });

  test("the paper only changes the proportions", () => {
    const a3 = buildPoster(data, ROOT, { posterPaper: "a3" }), a0 = buildPoster(data, ROOT, { posterPaper: "a0" });
    expect(a3.width).toBe(a0.width);
    expect(a3.width / a3.height).toBeCloseTo(POSTER_PAPER.a3[0] / POSTER_PAPER.a3[1], 2);
  });

  test("one seed always draws the same tree, another seed another one", () => {
    const one = posterSvg(buildPoster(data, ROOT, { posterSeed: 3 }));
    expect(posterSvg(buildPoster(data, ROOT, { posterSeed: 3 }))).toBe(one);
    expect(posterSvg(buildPoster(data, ROOT, { posterSeed: 4 }))).not.toBe(one);
    expect(posterSvg(buildPoster(data, "@I2@", { posterSeed: 3 }))).not.toBe(one);
  });

  test("a custom title replaces the automatic one, long names wrap to two lines", () => {
    const p = buildPoster(data, ROOT, { posterGens: 7, title: "Our family & <friends>" });
    expect(p.title).toBe("Our family & <friends>");
    expect(posterSvg(p)).toContain("Our family &amp; &lt;friends&gt;");
    expect(p.texts.length).toBeGreaterThan(p.people * 2);
  });

  test("an unknown person is an error", () => {
    expect(() => buildPoster(data, "@X@", {})).toThrow("@X@");
  });
});

describe("poster output", () => {
  test("the SVG is one document with every shape and text", () => {
    const p = buildPoster(data, ROOT, { posterGens: 4 });
    const svg = posterSvg(p);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.match(/<path /g)).toHaveLength(p.shapes.length);
    expect(svg.match(/<text /g)).toHaveLength(p.texts.length);
  });

  test("the PDF is one page of the chosen paper", async () => {
    const res = await generatePoster(data, ROOT, { posterPaper: "a3", posterGens: 4, lang: "en" }, fonts);
    const doc = await PDFDocument.load(res.bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(POSTER_PAPER.a3[0], 1);
    expect(height).toBeCloseTo(POSTER_PAPER.a3[1], 1);
    expect(res.poster.people).toBe(15);
    // the default paper and a regular font only
    expect((await generatePoster(data, ROOT, {}, { regular: fonts.regular })).bytes.length).toBeGreaterThan(1000);
  });
});
