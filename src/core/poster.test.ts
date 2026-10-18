import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  buildPoster, load, posterFonts, posterSeed, posterSvg, random, textWidth,
} from "./index";

const data = load(readFileSync(new URL("../../public/sample.ged", import.meta.url)));
const file = (name: string) => readFileSync(new URL(`../../public/fonts/${name}`, import.meta.url));
const fonts = posterFonts(
  [file("Alkatra-Latin-Regular.woff"), file("Alkatra-LatinExt-Regular.woff"), file("DejaVuSans.ttf")],
  [file("Alkatra-Latin-Bold.woff"), file("Alkatra-LatinExt-Bold.woff"), file("DejaVuSans-Bold.ttf")]);
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
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en" });
    expect(p.people).toBe(31);
    expect(p.generations).toBe(5);
    expect(p.title).toBe("Ancestors of Karol I.");
    expect(p.texts.some((t) => t.text === "Karol I." && t.y > p.height * 0.8)).toBe(true);
  });

  test("everything stays inside the drawing area and no line is wider than the assumed text width", () => {
    for (const gens of [2, 3, 5, 7]) {
      const p = buildPoster(data, ROOT, { generations: gens });
      for (const t of p.texts) {
        expect(t.x - textWidth(t.text, t.size, t.bold) / 2, t.text).toBeGreaterThanOrEqual(-1);
        expect(t.x + textWidth(t.text, t.size, t.bold) / 2, t.text).toBeLessThanOrEqual(p.width + 1);
        expect(t.y).toBeLessThan(p.height);
      }
    }
  });

  test("the generations are limited to 2..7 and a person without parents has just the plate", () => {
    expect(buildPoster(data, ROOT, { generations: 99 }).generations).toBe(7);
    expect(buildPoster(data, ROOT, { generations: 1 }).generations).toBe(2);
    expect(buildPoster(data, ROOT, { generations: 0 }).generations).toBe(7);
    const lone = Object.values(data.people).find((x) => !x.famc.length)!;
    const p = buildPoster(data, lone.id, { generations: 5 });
    expect(p.people).toBe(1);
  });

  test("an unknown father leaves the mother's side in place", () => {
    const some = structuredClone(data);
    const child = Object.values(some.people).find((x) => x.famc.length && some.families[x.famc[0]].husb && some.families[x.famc[0]].wife)!;
    some.families[child.famc[0]].husb = null;
    const p = buildPoster(some, child.id, { generations: 3 });
    expect(p.people).toBeLessThan(buildPoster(data, child.id, { generations: 3 }).people);
  });

  test("the drawing has the proportions of A paper", () => {
    const p = buildPoster(data, ROOT, {});
    expect(p.width / p.height).toBeCloseTo(Math.SQRT2, 2);
  });

  test("one seed always draws the same tree, another seed another one", () => {
    const one = posterSvg(buildPoster(data, ROOT, { posterSeed: 3 }));
    expect(posterSvg(buildPoster(data, ROOT, { posterSeed: 3 }))).toBe(one);
    expect(posterSvg(buildPoster(data, ROOT, { posterSeed: 4 }))).not.toBe(one);
    expect(posterSvg(buildPoster(data, "@I2@", { posterSeed: 3 }))).not.toBe(one);
  });

  test("a custom title replaces the automatic one, long names wrap to two lines", () => {
    const p = buildPoster(data, ROOT, { generations: 7, title: "Our family & <friends>" });
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
    const p = buildPoster(data, ROOT, { generations: 4 });
    const svg = posterSvg(p);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.match(/<path /g)).toHaveLength(p.shapes.length);
    expect(svg.match(/<text /g)).toHaveLength(p.texts.length);
  });

  test("with the poster fonts the text is outlines and every line fits its plate", () => {
    const p = buildPoster(data, ROOT, { generations: 7 }, fonts);
    const svg = posterSvg(p, fonts);
    expect(svg).not.toContain("<text");
    expect(svg.match(/<path /g)).toHaveLength(p.shapes.length + p.texts.length);
    for (const t of p.texts) {
      const w = fonts.width(t.text, t.size, t.bold);
      expect(t.x - w / 2, t.text).toBeGreaterThanOrEqual(-1);
      expect(t.x + w / 2, t.text).toBeLessThanOrEqual(p.width + 1);
    }
  });

  test("a character Alkatra lacks is set in DejaVu, Latin Extended in Alkatra", () => {
    const wide = fonts.width("Ľudovít", 40, true), cyrillic = fonts.width("Людовік", 40, true);
    expect(wide).toBeGreaterThan(0);
    expect(cyrillic).toBeGreaterThan(0);
    expect(fonts.outline("Ľ Л", 40, false, 100, 100)).toMatch(/^M/);
  });
});
