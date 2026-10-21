import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { KIND_COLORS } from "./colors";
import {
  buildPoster, buildPosterWithoutTree, CORNER_MIN_PEOPLE, PALETTE, POSTER_COLORS, POSTER_PLACES_HEIGHT, POSTER_PLACES_UP_TO, CORNER_PAD, POSTER_CORNERS_MIN_GENERATIONS, posterHasStatistics, cornerMaxValues, load, mergeSurnameForms, posterFonts, posterSeed, posterSvg, random, textWidth, LANGS, TEXTS, rgbOf,
} from "./index";

const data = load(readFileSync(new URL("../../public/sample.ged", import.meta.url)));
const file = (name: string) => readFileSync(new URL(`../../public/fonts/${name}`, import.meta.url));
const fonts = posterFonts(
  [file("Alkatra-Latin-Regular.woff"), file("Alkatra-LatinExt-Regular.woff"), file("DejaVuSans.ttf")],
  [file("Alkatra-Latin-Bold.woff"), file("Alkatra-LatinExt-Bold.woff"), file("DejaVuSans-Bold.ttf")]);
const ROOT = "@I1@";

// a complete tree: person n has parents 2n and 2n+1, down to `gens` generations
const full = (gens: number, hasParents: (n: number) => boolean = () => true, married = false) => {
  let ged = "0 HEAD\n";
  const last = 2 ** gens - 1;
  for (let n = 1; n <= last; n++) {
    ged += `0 @I${n}@ INDI\n1 NAME P${n} /Full/\n1 SEX ${n % 2 ? "F" : "M"}\n`;
    if (n < 2 ** (gens - 1) && hasParents(n)) ged += `1 FAMC @F${n}@\n`;
  }
  for (let n = 1; n < 2 ** (gens - 1); n++) if (hasParents(n)) ged += `0 @F${n}@ FAM\n1 HUSB @I${2 * n}@\n1 WIFE @I${2 * n + 1}@\n${married ? `1 MARR\n2 DATE ${1700 + n}\n` : ""}1 CHIL @I${n}@\n`;
  return load(ged + "0 TRLR\n");
};


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
  test("the mark of the program sits in the bottom right corner, outside the tree, only when asked for", () => {
    const date = new Date(2026, 9, 20);
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en" }, undefined, { version: "2.57.0", date });
    const mark = p.texts.find((t) => t.text.startsWith("Created with Arbora"))!;
    expect(mark.text).toBe("Created with Arbora 2.57.0 \u00B7 20 Oct 2026");
    expect(mark.y).toBeGreaterThan(p.height);
    expect(mark.x).toBeLessThan(p.width);
    expect(mark.x).toBeGreaterThan(p.width * 0.5);
    expect(buildPoster(data, ROOT, { generations: 5, lang: "en" }).texts.some((t) => t.text.includes("Arbora"))).toBe(false);
  });

  test("a full five-generation tree has a plate for each of the 31 ancestors, and the root below the parents in the middle", () => {
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en" });
    expect(p.people).toBe(31);
    expect(p.generations).toBe(5);
    expect(p.title).toBe("Ancestors of Charles I of Austria");
    const root = p.plates.find((q) => q.id === ROOT)!;
    expect(root.x).toBe(p.width / 2);
    const parents = p.plates.filter((q) => q.gen === 2);
    expect(parents).toHaveLength(2);
    expect(parents[0].y).toBe(parents[1].y);
    expect(root.y).toBeGreaterThan(parents[0].y + root.h / 2);
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

  test("the generations are limited to 3..10 and a person without parents has just the plate", () => {
    expect(buildPoster(full(3), ROOT, { generations: 99 }).generations).toBe(10);
    expect(buildPoster(data, ROOT, { generations: 1 }).generations).toBe(3);
    expect(buildPoster(data, ROOT, { generations: 0 }).generations).toBe(10); // all
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

  test("a person stands halfway between the parents and no two plates of a column touch", () => {
    for (const d of [data, full(6)]) {
      const p = buildPoster(d, ROOT, { generations: 6 });
      const at = new Map(p.plates.map((q) => [q.id, q]));
      const touching: string[] = [], off: string[] = [];
      for (const q of p.plates) {
        const fam = d.people[q.id].famc[0] && d.families[d.people[q.id].famc[0]];
        const [a, b] = fam ? [fam.husb, fam.wife].map((id) => id && at.get(id)) : [];
        // (the Habsburgs repeat people, so only the made-up tree tells which plate is whose parent)
        if (d !== data && q.gen < 6 && q.gen > 1 && a && b && Math.abs(q.y - (a.y + b.y) / 2) > 1e-6) off.push(q.id);
        for (const r of p.plates) {
          const sameColumn = r !== q && r.gen === q.gen && Math.sign(r.x - p.width / 2) === Math.sign(q.x - p.width / 2);
          if (sameColumn && Math.abs(r.y - q.y) < q.h + 20) touching.push(`${q.id} ${r.id}`);
        }
      }
      expect(touching).toEqual([]);
      expect(off).toEqual([]);
    }
  });

  test("only the people who exist take room: a sparse tree is much lower than a full one", () => {
    const sparse = full(6, (n) => n % 3 !== 0 || n < 8);
    const a = buildPosterWithoutTree(sparse, ROOT, { generations: 6 }), b = buildPosterWithoutTree(full(6), ROOT, { generations: 6 });
    expect(a.people).toBeLessThan(b.people);
    expect(a.height).toBeLessThan(b.height * 0.8);
    expect(b.width).toBe(a.width);
  });

  test("one seed always draws the same tree, another seed another one", () => {
    const one = posterSvg(buildPoster(data, ROOT, { generations: 6, posterSeed: 3 }));
    expect(posterSvg(buildPoster(data, ROOT, { generations: 6, posterSeed: 3 }))).toBe(one);
    expect(posterSvg(buildPoster(data, ROOT, { generations: 6, posterSeed: 4 }))).not.toBe(one);
    expect(posterSvg(buildPoster(data, "@I2@", { generations: 6, posterSeed: 3 }))).not.toBe(one);
  });

  test("the title names the person, long names wrap to two lines", () => {
    const p = buildPoster(data, ROOT, { generations: 7 });
    expect(p.title).toBe("Predkovia: Charles I of Austria");
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
    // the letters are drawn once each and placed with <use>, so the file stays small
    expect(svg.match(/<g fill=/g)).toHaveLength(p.texts.length);
    const defs = svg.match(/<path id="g\d+"/g)!.length;
    expect(svg.match(/<use /g)!.length).toBeGreaterThan(5 * defs);
    expect(svg.match(/<path /g)).toHaveLength(p.shapes.length + defs);
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

describe("poster plates", () => {
  test("the main branches overlap each connected plate by six drawing units", () => {
    const poster = buildPosterWithoutTree(full(3), "@I1@", { generations: 3, posterSeed: 1 });
    const limbs = poster.shapes
      .filter((shape) => shape.fill === POSTER_COLORS.branch && shape.strokeWidth === 1)
      .map((shape) => (shape.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number))
      .map((values) => {
        const points = Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2], values[i * 2 + 1]] as const);
        const midpoint = (a: readonly [number, number], b: readonly [number, number]) =>
          [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
        const half = points.length / 2;
        return [midpoint(points[0], points[points.length - 1]), midpoint(points[half - 1], points[half])];
      });
    const overlap = (x: number, y: number) =>
      Math.min(...limbs.flatMap((ends) => ends.map(([px, py]) => Math.hypot(px - x, py - y))));
    const root = poster.plates.find((plate) => plate.gen === 1)!;
    expect(overlap(root.x, root.y - root.h / 2)).toBeCloseTo(6, 1);

    for (const plate of poster.plates.filter((item) => item.gen === 2)) {
      const side = Math.sign(plate.x - poster.width / 2);
      expect(overlap(plate.x - side * plate.w * 0.2, plate.y + plate.h / 2)).toBeCloseTo(6, 1);
    }
    for (const plate of poster.plates.filter((item) => item.gen === 3)) {
      const side = Math.sign(plate.x - poster.width / 2);
      expect(overlap(plate.x - side * plate.w / 2, plate.y)).toBeCloseTo(6, 1);
    }
  });

  test("two-line names use a smaller font so the date line stays clear of the plate edge", () => {
    const person = load(`0 HEAD
0 @I1@ INDI
1 NAME Longgivenname /Longfamilyname/
1 BIRT
2 DATE 1865
1 DEAT
2 DATE 1936
0 TRLR
`);
    const poster = buildPoster(person, "@I1@", { generations: 6, lang: "en" }, fonts);
    const names = poster.texts.filter((t) => t.text === "Longgivenname" || t.text === "Longfamilyname");
    expect(names.map((t) => t.text)).toEqual(["Longgivenname", "Longfamilyname"]);
    expect(names.every((t) => t.size < 40)).toBe(true);
    const date = poster.texts.find((t) => t.text.includes("1865"))!;
    const singleLine = buildPoster(load(`0 HEAD
0 @I1@ INDI
1 NAME Given /Family/
1 BIRT
2 DATE 1865
1 DEAT
2 DATE 1936
0 TRLR
`), "@I1@", { generations: 6, lang: "en" }, fonts).texts.find((t) => t.text.includes("1865"))!;
    expect(date.size).toBeLessThan(singleLine.size);
  });

  test("a wrapped name only shrinks its own plate, not the single-line plates of its generation", () => {
    const family = (motherName: string) => load(`0 HEAD
0 @I1@ INDI
1 NAME Child /Test/
1 FAMC @F1@
0 @I2@ INDI
1 NAME Adam /Short/
1 SEX M
1 BIRT
2 DATE 1860
0 @I3@ INDI
1 NAME ${motherName}
1 SEX F
1 BIRT
2 DATE 1862
1 DEAT
2 DATE 1930
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
0 TRLR
`);
    const sizes = (name: string, text: string) =>
      buildPoster(family(name), "@I1@", { generations: 4, lang: "en" }, fonts).texts.find((t) => t.text === text)!.size;
    const plain = family("Eve /Brief/");
    const father = buildPoster(plain, "@I1@", { generations: 4, lang: "en" }, fonts).texts.find((t) => t.text === "Adam Short")!;
    expect(sizes("Maximiliana Konstantina /Longfamilyname-Hohenzollern/", "Adam Short")).toBe(father.size);
    const wrapped = buildPoster(family("Maximiliana Konstantina /Longfamilyname-Hohenzollern/"), "@I1@", { generations: 4, lang: "en" }, fonts);
    expect(wrapped.texts.some((t) => t.text === "Maximiliana Konstantina")).toBe(true);
  });

  test("a double border stands in a margin outside the tree, which the svg view box includes", () => {
    const poster = buildPoster(data, ROOT, { generations: 4, posterSeed: 1 });
    expect(poster.margin).toBeGreaterThan(0);
    expect(posterSvg(poster)).toContain(`viewBox="${-poster.margin} ${-poster.margin} ${poster.width + 2 * poster.margin}`);
  });

  test("every plate has its own brown outline, and the name is blue for men and red for women", () => {
    const poster = buildPoster(data, ROOT, { generations: 4, posterSeed: 1 });
    const outlines = poster.shapes.filter((s) => s.fill === POSTER_COLORS.branchEdge && !s.stroke);
    expect(outlines.length).toBe(poster.people + 3); // the frame of the title and the two rings of the border (4 generations: no ruler)
    expect(new Set(outlines.map((s) => s.d)).size).toBeGreaterThan(1);
    const names = poster.texts.filter((t) => t.bold && t.fill !== POSTER_COLORS.ink);
    expect(names.some((t) => t.fill === POSTER_COLORS.male)).toBe(true);
    expect(names.some((t) => t.fill === POSTER_COLORS.female)).toBe(true);
    const others = poster.texts.filter((t) => !t.bold && t.fill !== POSTER_COLORS.branch && t.fill !== POSTER_COLORS.marriage && t.fill !== POSTER_COLORS.birth);
    expect(others.every((t) => t.fill === POSTER_COLORS.ink)).toBe(true);
  });
});

describe("poster age and title", () => {
  const one = (birth: string, death: string) => load(`0 HEAD
0 @I1@ INDI
1 NAME Ann /Poe/
1 BIRT
2 DATE ${birth}
1 DEAT
2 DATE ${death}
0 TRLR
`);
  const dates = (birth: string, death: string, lang: "en" | "sk" = "en") =>
    buildPoster(one(birth, death), "@I1@", { generations: 2, lang }).texts.filter((t) => t.text.includes("\u2020") || t.text.includes("1")).map((t) => t.text).join(" ");

  test("the age at death follows the years, in the language of the poster, only when both years are known", () => {
    expect(dates("1907", "1986")).toContain(", 79 y.");
    expect(dates("1907", "1986", "sk")).toContain(", 79 r.");
    expect(dates("ABT 1907", "12 MAR 1986")).toContain(", 79 y.");
    expect(dates("1907", "1900")).not.toContain(" y.");
    expect(dates("1907", "")).not.toContain(" y.");
  });

  test("the title stands in its own frame with the number of ancestors and generations under it", () => {
    const p = buildPoster(data, ROOT, { generations: 4, lang: "en" });
    const root = p.texts.find((t) => t.text.startsWith(`4 generations \u00B7 ${p.people - 1} ancestors`))!;
    expect(root).toBeDefined();
    expect(root.text).toMatch(/ \u00B7 \d{4}\u2013\d{4}$/); // from the oldest birth to the main person's
    // the nouns follow the plural of the language
    const first = (generations: number, lang: "sk" | "en") => buildPoster(data, ROOT, { generations, lang }).texts.find((t) => /\u00B7/.test(t.text) && /^\d/.test(t.text))!.text.split(" \u00B7 ")[0];
    expect(first(3, "sk")).toBe("3 generácie");
    expect(first(5, "sk")).toBe("5 generácií");
    expect(first(5, "en")).toBe("5 generations");
  });
});

describe("poster repeated people", () => {
  test("a person on two branches keeps both plates, each with a tag of the count, and is counted once in the title", () => {
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en" });
    const ids = p.plates.map((x) => x.id), unique = new Set(ids).size;
    expect(unique).toBeLessThan(ids.length); // the Habsburgs marry within the family
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
    const tags = p.texts.filter((t) => /^\d+\u00D7$/.test(t.text));
    expect(tags).toHaveLength(ids.filter((id) => ids.indexOf(id) !== ids.lastIndexOf(id)).length);
    expect(repeated.length).toBeGreaterThan(0);
    expect(p.texts.some((t) => t.text.startsWith(`5 generations \u00B7 ${unique - 1} ancestors`))).toBe(true);
  });

  test("a tree without repeats has no tags", () => {
    const p = buildPoster(data, ROOT, { generations: 4, lang: "en" });
    expect(new Set(p.plates.map((x) => x.id)).size).toBe(p.plates.length);
    expect(p.texts.filter((t) => /^\d+\u00D7$/.test(t.text))).toHaveLength(0);
  });
});

describe("poster options of a larger poster", () => {
  test("the corner lists appear on their own from five generations on, not below", () => {
    const four = buildPoster(data, ROOT, { generations: 4, lang: "en", posterSeed: 1 });
    const five = buildPoster(data, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    expect(four.texts.filter((t) => t.bold && t.size === 34)).toHaveLength(0);
    expect(five.texts.filter((t) => t.bold && t.size === 34).length).toBeGreaterThan(0);
  });

  test("the corner lists follow the generations that are really on the poster, not the ones asked for", () => {
    const shallow = "0 HEAD\n" + [1, 2, 3].map((n) => `0 @I${n}@ INDI\n1 NAME P${n} /Test/\n${n === 1 ? "1 FAMC @F1@\n" : ""}`).join("")
      + "0 @F1@ FAM\n1 HUSB @I2@\n1 WIFE @I3@\n1 CHIL @I1@\n0 TRLR\n";
    const p = buildPoster(load(shallow), ROOT, { generations: 10, lang: "en", posterSeed: 1 });
    expect(Math.max(...p.plates.map((q) => q.gen))).toBe(2);
    expect(p.texts.some((t) => t.bold && t.size === 34)).toBe(false);
  });
});

describe("poster marriage years", () => {
  const marriageText = (p: ReturnType<typeof buildPoster>) => p.texts.filter((t) => t.fill === POSTER_COLORS.marriage && !/^\d+ generations \u00B7 /.test(t.text));
  const years = (p: ReturnType<typeof buildPoster>) => marriageText(p).filter((t) => /^\d{4}$/.test(t.text));

  test("a marriage year stands at each couple, bigger for the closer generations, and nothing without a date", () => {
    const p = buildPosterWithoutTree(full(6, () => true, true), ROOT, { generations: 6 });
    expect(years(p)).toHaveLength(2 ** 5 - 1);
    expect(years(p).map((t) => t.text)).toContain("1701");
    expect(years(p).every((t) => !t.bold && t.fill === POSTER_COLORS.marriage)).toBe(true);
    const size = (year: string) => years(p).find((t) => t.text === year)!.size;
    expect(size("1701")).toBeGreaterThan(size("1702"));
    expect(size("1702")).toBeGreaterThan(size("1704"));
    expect(size("1704")).toBeGreaterThan(size("1716"));
    expect(years(buildPosterWithoutTree(full(6), ROOT, { generations: 6 }))).toHaveLength(0);
  });

  test("two figures and the number of children stand under the year, and nothing for an only child", () => {
    const families = (n: number) => load(`0 HEAD
0 @I1@ INDI
1 NAME Child /One/
1 FAMC @F1@
0 @I2@ INDI
1 NAME Father /One/
0 @I3@ INDI
1 NAME Mother /One/
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 MARR
2 DATE 1885
${Array.from({ length: n }, (_, i) => `1 CHIL @I${i === 0 ? 1 : 10 + i}@`).join("\n")}
0 TRLR
`);
    const poster = (n: number) => buildPosterWithoutTree(families(n), "@I1@", { generations: 2, lang: "en" });
    const counts = (n: number) => marriageText(poster(n)).map((t) => t.text);
    expect(counts(1)).toEqual(["1885"]);
    expect(counts(2)).toEqual(["1885", "2"]);
    expect(counts(6)).toEqual(["1885", "6"]);
    // rings and figures are drawn shapes in the brown of the branches: two rings, two heads and two bodies
    const symbols = (n: number) => poster(n).shapes.filter((x) => x.fill === null || (x.fill === POSTER_COLORS.marriage && !x.stroke));
    expect(symbols(1)).toHaveLength(2);
    expect(symbols(6)).toHaveLength(6);
  });

  test("a marriage year touches no plate and no other marriage year", () => {
    const p = buildPosterWithoutTree(full(7, () => true, true), ROOT, { generations: 7 });
    const hits: string[] = [];
    const box = (t: { text: string; x: number; y: number; size: number }) => [t.x, t.y - t.size * 0.3, textWidth(t.text, t.size, false), t.size] as const;
    for (const t of marriageText(p)) {
      const [x, y, w, h] = box(t);
      for (const q of p.plates) if (Math.abs(x - q.x) < (w + q.w) / 2 && Math.abs(y - q.y) < (h + q.h) / 2) hits.push(`${t.text} ${q.id}`);
      for (const u of marriageText(p)) {
        const [x2, y2, w2, h2] = box(u);
        if (u !== t && Math.abs(x - x2) < (w + w2) / 2 && Math.abs(y - y2) < (h + h2) / 2) hits.push(`${t.text} ${u.text}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("poster plate sizes", () => {
  test("the closest generations have bigger plates: 200 %, 175 %, 150 %, 125 %, then 100 %", () => {
    for (const d of [data, full(6)]) {
      const p = buildPoster(d, ROOT, { generations: 6 });
      const width = (gen: number) => p.plates.find((q) => q.gen === gen)!.w;
      const height = (gen: number) => p.plates.find((q) => q.gen === gen)!.h;
      for (const [gen, scale] of [[1, 2], [2, 1.75], [3, 1.5], [4, 1.25], [5, 1], [6, 1]]) {
        expect(width(gen) / width(5), `width ${gen}`).toBeCloseTo(scale, 1);
        expect(height(gen) / height(5), `height ${gen}`).toBeCloseTo(scale, 1);
      }
    }
  });

  test("bigger plates never overlap, and the text is bigger with them", () => {
    const p = buildPoster(full(6), ROOT, { generations: 6 });
    const hits: string[] = [];
    for (const a of p.plates) {
      for (const b of p.plates) {
        if (a.id < b.id && Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) hits.push(`${a.id} ${b.id}`);
      }
    }
    expect(hits).toEqual([]);
    const size = (id: string) => p.texts.find((t) => t.text === `P${id.replace(/\D/g, "")} Full`)!.size;
    expect(size("@I1@")).toBeGreaterThan(size("@I2@"));
    expect(size("@I2@")).toBeGreaterThan(size("@I4@"));
    expect(size("@I4@")).toBeGreaterThan(size("@I32@"));
  });
});

describe("poster beyond seven generations", () => {
  test("from the 7th generation on the plates are half as tall, with smaller text, so the poster grows less in height", () => {
    const p = buildPoster(full(9), ROOT, { generations: 9 });
    const high = (gen: number) => p.plates.find((q) => q.gen === gen)!.h;
    expect(high(7) / high(6)).toBeCloseTo(0.5, 1);
    expect(high(9)).toBe(high(7));
    const wide = (gen: number) => p.plates.find((q) => q.gen === gen)!.w;
    expect(wide(7) / wide(6)).toBeCloseTo(0.7, 2);
    expect(wide(9)).toBe(wide(7));
    const size = (n: number) => p.texts.find((t) => t.text === `P${n} Full`)!.size;
    // P64 is generation 7, P32 generation 6
    expect(size(64)).toBeLessThan(size(32) * 0.6);
    expect(size(64)).toBeGreaterThanOrEqual(5.5);
    // a plate still holds its text and no two plates of a column touch
    const touching = p.plates.flatMap((a) => p.plates.filter((b) => a.id < b.id && Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2));
    expect(touching).toEqual([]);
    const before = buildPoster(full(9), ROOT, { generations: 6 });
    expect(p.height).toBeLessThan(before.height * 2 ** 3 * 0.6);
  }, 60000);

  test("a bigger poster keeps the size of the plates and of the text", () => {
    const seven = buildPoster(full(7), "@I1@", { generations: 7 });
    const ten = buildPoster(full(10), "@I1@", { generations: 10 });
    expect(ten.generations).toBe(10);
    expect(ten.people).toBe(2 ** 10 - 1);
    expect(ten.width).toBeGreaterThan(seven.width);
    expect(ten.plates[1].w).toBe(seven.plates[1].w);
    expect(ten.plates[1].h).toBe(seven.plates[1].h);
    expect(ten.plates[ten.plates.length - 1].h).toBe(seven.plates[seven.plates.length - 1].h);
    // the names of the last generation are as big as on the smaller poster
    expect(Math.min(...ten.texts.slice(0, -1).map((t) => t.size))).toBeGreaterThanOrEqual(
      Math.min(...seven.texts.slice(0, -1).map((t) => t.size)));
  }, 60000);
});

describe("poster corner lists", () => {
  // a complete tree: person n has parents 2n and 2n+1; every person has a given name, a surname, a birth place and a residence
  const places = (gens: number) => {
    let ged = "0 HEAD\n";
    const last = 2 ** gens - 1;
    for (let n = 1; n <= last; n++) {
      ged += `0 @I${n}@ INDI\n1 NAME ${n % 3 ? "Anna" : "Jan"}${n} /Branch${n % 2}/\n1 SEX ${n % 2 ? "F" : "M"}\n1 BIRT\n2 PLAC Town${n % 4}\n1 RESI\n2 PLAC Farm${n}\n`;
      if (n < 2 ** (gens - 1)) ged += `1 FAMC @F${n}@\n`;
    }
    for (let n = 1; n < 2 ** (gens - 1); n++) ged += `0 @F${n}@ FAM\n1 HUSB @I${2 * n}@\n1 WIFE @I${2 * n + 1}@\n1 CHIL @I${n}@\n`;
    return load(ged + "0 TRLR\n");
  };
  const d = places(5);
  const heads = (p: ReturnType<typeof buildPoster>) => p.texts.filter((t) => t.bold && t.size === 34);
  const lines = (p: ReturnType<typeof buildPoster>) => p.texts.filter((t) => !t.bold && t.size === 24);

  test("there are none below five generations", () => {
    const p = buildPoster(d, ROOT, { generations: 4, lang: "en", posterSeed: 1 });
    expect(heads(p)).toHaveLength(0);
    expect(lines(p)).toHaveLength(0);
  });

  test("a branch with fewer than five people gets no block", () => {
    expect(CORNER_MIN_PEOPLE).toBe(5);
    const ged = "0 HEAD\n" + [1, 2, 3, 4, 5].map((n) => `0 @I${n}@ INDI\n1 NAME P${n} /Test/\n1 BIRT\n2 PLAC Town\n${n < 3 ? `1 FAMC @F${n}@\n` : ""}`).join("")
      + "0 @F1@ FAM\n1 HUSB @I2@\n1 WIFE @I3@\n1 CHIL @I1@\n0 @F2@ FAM\n1 HUSB @I4@\n1 WIFE @I5@\n1 CHIL @I2@\n0 TRLR\n";
    const p = buildPoster(load(ged), ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    expect(heads(p)).toHaveLength(0);
  });

  test("each of the four branches gets a heading and three labelled lines (origin, first names, surnames), and the poster grows", () => {
    const on = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    expect(heads(on)).toHaveLength(4);
    expect(lines(on)).toHaveLength(12);
    expect(on.texts.some((t) => ["Born in", "Names"].includes(t.text))).toBe(false);
    const labels = on.texts.filter((t) => t.bold && t.size === 21).map((t) => t.text);
    expect(labels.filter((l) => l === "Line")).toHaveLength(4);
    expect(labels.filter((l) => l === "Origin")).toHaveLength(4);
    expect(labels.filter((l) => l === "First names")).toHaveLength(4);
    expect(labels.filter((l) => l === "Surnames")).toHaveLength(4);
    expect(on.texts.some((t) => t.text.includes(":") && (t.size === 21 || t.size === 24))).toBe(false);
  });

  test("the lines count people: most common first, with the number", () => {
    const on = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    // father's father is person 4; his branch holds 4, 8, 9 and 16 to 19, born in Town0 (4, 8, 16), Town1 (9, 17), Town2 (18), Town3 (19)
    expect(on.texts.some((t) => t.text === "Town0 (3)  \u00B7  Town1 (2)  \u00B7  Town2  \u00B7  Town3")).toBe(true);
  });

  test("the last value is not followed by a dot before \"+ N more\"", () => {
    const on = buildPoster(places(6), ROOT, { generations: 6, lang: "en", posterSeed: 1 });
    const cut = lines(on).filter((t) => /\+ \d+ more$/.test(t.text));
    expect(cut.length).toBeGreaterThan(0);
    for (const t of cut) expect(t.text).not.toMatch(/\u00B7\s+\+ \d+ more$/);
  });

  test("the left lists start at the leftmost plate and the right ones end at the rightmost", () => {
    const p = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    const left = Math.min(...p.plates.map((q) => q.x - q.w / 2)), right = Math.max(...p.plates.map((q) => q.x + q.w / 2));
    const labels = p.texts.filter((t) => t.bold && t.size === 21);
    const near = (a: number, b: number) => Math.abs(a - b) < 1;
    // a frame starts at the plate edge and its texts a padding further in; no text leaves the plates' width
    expect(labels.some((t) => t.x < p.width / 2 && near(t.x - textWidth(t.text, t.size, t.bold) / 2, left + CORNER_PAD))).toBe(true);
    const corner = [...heads(p), ...lines(p), ...labels];
    expect(corner.every((t) => t.x - textWidth(t.text, t.size, t.bold) / 2 > left || t.x > p.width / 2)).toBe(true);
    expect(corner.every((t) => t.x + textWidth(t.text, t.size, t.bold) / 2 < right || t.x < p.width / 2)).toBe(true);
  });

  test("the first values of the lines of a block start in one column", () => {
    const p = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    const start = (t: { x: number; text: string; size: number; bold: boolean }) => t.x - textWidth(t.text, t.size, t.bold) / 2;
    const first = [...heads(p), ...lines(p)].map((t) => Math.round(start(t) * 10) / 10);
    // four blocks, each with one column for its heading and three lines
    expect(new Set(first).size).toBe(2);
  });

  test("residences are not listed in the corners", () => {
    const on = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1, showPlaces: true });
    expect(lines(on)).toHaveLength(12);
    expect(on.texts.some((t) => t.text.startsWith("Farm"))).toBe(false);
  });

  test("what does not fit is counted as \"+ N more\"", () => {
    const on = buildPoster(places(6), ROOT, { generations: 6, lang: "en", posterSeed: 1 });
    const names = on.texts.filter((t) => /^(Anna|Jan)\d+  ·/.test(t.text));
    expect(names).toHaveLength(4);
    expect(names.every((t) => /\+ \d+ more$/.test(t.text))).toBe(true);
  });

  test("the corner text stays clear of every plate and inside the poster", () => {
    for (const gens of [3, 4, 6]) {
      const p = buildPoster(places(gens), ROOT, { generations: gens, lang: "en", posterSeed: 1, showPlaces: true });
      const cornerTexts = [...heads(p), ...lines(p)];
      for (const t of cornerTexts) {
        const w = textWidth(t.text, t.size, t.bold);
        expect(t.x - w / 2).toBeGreaterThanOrEqual(0);
        expect(t.x + w / 2).toBeLessThanOrEqual(p.width);
        const hit = p.plates.some((q) => t.x + w / 2 > q.x - q.w / 2 && t.x - w / 2 < q.x + q.w / 2 && t.y + 4 > q.y - q.h / 2 && t.y - t.size < q.y + q.h / 2);
        expect(hit, `${gens} generations, ${t.text}`).toBe(false);
      }
    }
  });

  test("a file without separate surnames has places and names only", () => {
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    const corner = lines(p).filter((t) => t.text.includes("  \u00B7  "));
    expect(corner).toHaveLength(heads(p).length * 2);
    expect(corner.some((t) => t.text.includes("Vienna"))).toBe(true);
  });

  test("a corner is headed by the first person of the branch", () => {
    const p = buildPoster(d, ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    expect(heads(p).map((t) => t.text).sort()).toEqual(["Anna4 Branch0  \u00B7  7 ancestors", "Anna5 Branch1  \u00B7  7 ancestors", "Anna7 Branch1  \u00B7  7 ancestors", "Jan6 Branch0  \u00B7  7 ancestors"].sort());
  });

  test("a corner line names at most 5 values up to 5 generations, 6 up to 7 and 7 from 8", () => {
    expect([3, 5, 6, 7, 8, 10].map(cornerMaxValues)).toEqual([5, 5, 6, 6, 7, 7]);
    const p = buildPoster(places(6), ROOT, { generations: 6, lang: "en", posterSeed: 1 });
    const names = lines(p).filter((t) => /^(Anna|Jan)\d+/.test(t.text));
    expect(names.length).toBeGreaterThan(0);
    for (const t of names) expect(t.text.split("  ·  ").filter((x) => !x.startsWith("+")).length).toBeLessThanOrEqual(6);
  });

  test("a heading that fits names the line, the birth and the number of ancestors", () => {
    const p = buildPoster(data, ROOT, { generations: 5, lang: "en", posterSeed: 1, dates: "full" }, fonts);
    expect(heads(p).length).toBeGreaterThan(0);
    expect(heads(p).every((t) => /^.+  \u00B7  \d+ ancestors?$/.test(t.text))).toBe(true);
    expect(heads(p).some((t) => /^.+  \u00B7  b\. .+  \u00B7  \d+ ancestors$/.test(t.text))).toBe(true);
  });

  test("every language has the corner texts", () => {
    for (const lang of LANGS) {
      const t = TEXTS[lang].corners;
      expect([t.line, t.origin, t.given, t.surnames, ...t.more].every(Boolean), lang).toBe(true);
    }
  });
});

describe("poster corner lists: places and surnames", () => {
  test("only the municipality of a birth place is counted", () => {
    const ged = "0 HEAD\n0 @I1@ INDI\n1 NAME Ota /Test/\n1 BIRT\n2 PLAC Lesná, okres Hory, Krajina\n1 FAMC @F1@\n"
      + "0 @I2@ INDI\n1 NAME Karel /Test/\n1 BIRT\n2 PLAC Lesná, okres Doly\n1 FAMC @F2@\n0 @I3@ INDI\n1 NAME Eva /Test/\n"
      + "0 @I4@ INDI\n1 NAME Jan /Test/\n1 BIRT\n2 DATE 1700\n1 FAMC @F3@\n0 @I6@ INDI\n1 NAME Petr /Test/\n1 BIRT\n2 PLAC Lesná, okres Doly\n0 @F3@ FAM\n1 HUSB @I6@\n1 WIFE @I9@\n1 CHIL @I4@\n0 @I5@ INDI\n1 NAME Anna /Test/\n"
      + "0 @I9@ INDI\n1 NAME Zora /Test/\n1 FAMC @F4@\n0 @F4@ FAM\n1 HUSB @I7@\n1 WIFE @I8@\n1 CHIL @I9@\n0 @I7@ INDI\n1 NAME Ivan /Test/\n0 @I8@ INDI\n1 NAME Dana /Test/\n"
      + "0 @F1@ FAM\n1 HUSB @I2@\n1 WIFE @I3@\n1 CHIL @I1@\n0 @F2@ FAM\n1 HUSB @I4@\n1 WIFE @I5@\n1 CHIL @I2@\n0 TRLR\n";
    const p = buildPosterWithoutTree(load(ged), ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    const born = p.texts.filter((t) => t.text.startsWith("Lesná"));
    expect(born.length).toBeGreaterThan(0);
    for (const t of born) expect(t.text).not.toContain("okres");
    // this small poster has no room for the birth after the label column; the heading names the head of the branch and the count
    expect(p.texts.some((t) => t.bold && t.text === "Jan Test  \u00B7  5 ancestors")).toBe(true);
  });

  test("a municipality and the same one with a number are one entry", () => {
    const person = (n: number, place: string, famc = "") => `0 @I${n}@ INDI\n1 NAME P${n} /Test/\n1 BIRT\n2 PLAC ${place}\n${famc}`;
    const ged = "0 HEAD\n" + person(1, "Elsewhere", "1 FAMC @F1@\n") + person(2, "Elsewhere", "1 FAMC @F2@\n") + person(3, "Elsewhere")
      + person(4, "Lesná 2, okres Hory", "1 FAMC @F3@\n") + person(5, "Elsewhere") + person(6, "Lesná", "1 FAMC @F4@\n") + person(7, "Lesná 10")
      + "0 @F1@ FAM\n1 HUSB @I2@\n1 WIFE @I3@\n1 CHIL @I1@\n0 @F2@ FAM\n1 HUSB @I4@\n1 WIFE @I5@\n1 CHIL @I2@\n"
      + "0 @F3@ FAM\n1 HUSB @I6@\n1 WIFE @I7@\n1 CHIL @I4@\n"
      + "0 @I8@ INDI\n1 NAME Ivan /Test/\n0 @I9@ INDI\n1 NAME Dana /Test/\n0 @F4@ FAM\n1 HUSB @I8@\n1 WIFE @I9@\n1 CHIL @I6@\n0 TRLR\n";
    const p = buildPoster(load(ged), ROOT, { generations: 5, lang: "en", posterSeed: 1 });
    expect(p.texts.some((t) => t.text === "Lesná (3)")).toBe(true);
  });

  test("female and male surname forms are one entry, shown in the male form", () => {
    const m = (v: [string, number][]) => mergeSurnameForms(v);
    expect(m([["Nováková", 2], ["Novák", 1], ["Dvořák", 1]])).toEqual([["Novák", 3], ["Dvořák", 1]]);
    expect(m([["Novotná", 2], ["Novotný", 3]])).toEqual([["Novotný", 5]]);
    expect(m([["Procházková", 1], ["Procházka", 1]])).toEqual([["Procházka", 2]]);
    expect(m([["Kowalska", 1], ["Kowalski", 1], ["Nowak", 1]])).toEqual([["Kowalski", 2], ["Nowak", 1]]);
    expect(m([["Иванова", 2], ["Иванов", 1], ["Петровская", 1], ["Петровский", 1]])).toEqual([["Иванов", 3], ["Петровский", 2]]);
    expect(m([["Біла", 1]])).toEqual([["Біла", 1]]);
    // only a female form: shown as it stands
    expect(m([["Nováková", 2]])).toEqual([["Nováková", 2]]);
    // unrelated surnames stay apart
    expect(m([["Kovács", 2], ["Smith", 1]])).toEqual([["Kovács", 2], ["Smith", 1]]);
  });
});

describe("poster packing of uneven sides", () => {
  test("a side with fewer generations does not keep the width of the deeper one", () => {
    const even = buildPoster(full(6), ROOT, { generations: 6 });
    const uneven = buildPoster(full(6, (n) => !(n === 2 || n === 4 || n === 5)), ROOT, { generations: 6 });
    expect(uneven.width).toBeLessThan(even.width);
    const root = uneven.plates.find((p) => p.id === ROOT)!;
    expect(root.x).toBeLessThan(uneven.width / 2);
    expect(Math.min(...uneven.plates.map((p) => p.x - p.w / 2))).toBeLessThan(60);
  });
});

describe("poster generation ruler", () => {
  const titleBox = (p: ReturnType<typeof buildPoster>) => {
    const t = p.texts.find((x) => x.text === p.title)!;
    return { x0: t.x - textWidth(p.title, 58, true) / 2, x1: t.x + textWidth(p.title, 58, true) / 2, y: t.y };
  };

  test("a column has a generation label unless the title frame covers it", () => {
    const p = buildPoster(data, ROOT, { generations: 7, lang: "en", dates: "year" });
    const labels = p.texts.filter((t) => /^Generation \d$/.test(t.text));
    const box = titleBox(p);
    // the columns beside the main person are hidden behind the title, the outer ones stay
    expect(labels.map((t) => t.text)).not.toContain("Generation 1");
    expect(labels.map((t) => t.text)).toContain("Generation 7");
    for (const t of labels) expect(t.x < box.x0 || t.x > box.x1).toBe(true);
    expect(p.texts.some((t) => /^\d{4}–\d{4}$/.test(t.text))).toBe(false);
  });

  test("under each generation the known people are counted out of the possible ones", () => {
    const p = buildPoster(full(7), ROOT, { generations: 7, lang: "en" });
    expect(p.texts.filter((t) => /^\d+ of \d+$/.test(t.text)).map((t) => t.text).sort()).toEqual(["1 of 1", "1 of 1", "16 of 16", "16 of 16", "2 of 2", "2 of 2", "32 of 32", "32 of 32", "4 of 4", "4 of 4", "8 of 8", "8 of 8"]);
    // person 4 has no parents: of the 4 people the father's side could hold in generation 4, 2 are known
    const sparse = buildPoster(full(7, (n) => n !== 4), ROOT, { generations: 7, lang: "en" });
    expect(sparse.texts.some((t) => t.text === "2 of 4")).toBe(true);
  });

  test("the ruler runs through the middle of the title frame", () => {
    const p = buildPoster(data, ROOT, { generations: 7, lang: "en" });
    const label = p.texts.find((t) => t.text === "Generation 7")!, title = titleBox(p);
    // the label stands just above the axis, which is level with the middle of the frame (the title text sits 4 above it)
    expect(label.y).toBeGreaterThan(title.y - 60);
    expect(label.y).toBeLessThan(title.y);
  });

  test("the ruler appears under the same rule as the corner lists", () => {
    const hasRuler = (n: number) => buildPoster(full(n), ROOT, { generations: n, lang: "en" }).texts.some((t) => /^Generation \d$/.test(t.text));
    expect(posterHasStatistics(POSTER_CORNERS_MIN_GENERATIONS - 1)).toBe(false);
    expect(posterHasStatistics(POSTER_CORNERS_MIN_GENERATIONS)).toBe(true);
    expect(hasRuler(4)).toBe(false);
    expect(hasRuler(5)).toBe(true);
    // fewer generations filled than asked for: no statistics either
    const shallow = buildPoster(full(4), ROOT, { generations: 8, lang: "en" });
    expect(shallow.texts.some((t) => /^Generation \d$/.test(t.text))).toBe(false);
  });

  test("all languages have a label with the number", () => {
    for (const lang of LANGS) expect(TEXTS[lang].generation).toContain("{n}");
  });
});

describe("poster places line on the big plates", () => {
  const opts = { generations: 7, lang: "en", posterSeed: 3 } as const;
  const on = buildPoster(data, ROOT, { ...opts, showPlaces: true }, fonts);
  const off = buildPoster(data, ROOT, { ...opts, showPlaces: false }, fonts);
  const ged = (body: string) => load(`0 HEAD\n0 @I1@ INDI\n1 NAME Anna Test\n${body}0 TRLR\n`);
  const textsOf = (data2: ReturnType<typeof load>, extra: Record<string, unknown> = {}) =>
    buildPoster(data2, "@I1@", { ...opts, showPlaces: true, ...extra } as never, fonts);

  test("with places off the plates are as before and carry no places line", () => {
    expect(off.texts.some((t) => t.fill === POSTER_COLORS.place || t.text.includes("\u2302"))).toBe(false);
    expect(off.plates.filter((p) => p.gen <= POSTER_PLACES_UP_TO).every((p) => p.h === Math.round(66 * [2, 1.75, 1.5, 1.25][p.gen - 1]))).toBe(true);
  });

  test("with places on only generations 1 to 4 can be taller, by what their lines need, and the others keep their size", () => {
    for (const p of on.plates) {
      const before = off.plates.find((q) => q.id === p.id && q.gen === p.gen)!;
      expect(p.h).toBeGreaterThanOrEqual(before.h);
      expect(p.h).toBeLessThanOrEqual(p.gen <= POSTER_PLACES_UP_TO ? Math.round(before.h * POSTER_PLACES_HEIGHT) + 1 : before.h);
    }
    // a person with a place is taller than a person with no place at all, who keeps the plain plate
    const h = (places: string) => textsOf(ged(`1 BIRT\n2 DATE 1900\n${places}1 DEAT\n2 DATE 1970\n${places}`)).plates[0].h;
    expect(h("")).toBe(132);
    expect(h("2 PLAC Graz\n")).toBeGreaterThan(132);
  });

  test("the years stand on the second line (green birth, brown death) and the places on the third, grey", () => {
    const root = on.plates.find((p) => p.gen === 1)!;
    const lines = on.texts.filter((t) => t.y > root.y - root.h / 2 && t.y < root.y + root.h / 2 + 1 && Math.abs(t.x - root.x) < root.w / 2);
    const by = (text: string) => lines.find((t) => t.text === text);
    expect(by("*1887")?.fill).toBe(POSTER_COLORS.birth);
    expect(by("\u20201922, 35 y.")?.fill).toBe(POSTER_COLORS.death);
    const places = by("* Persenbeug Castle   \u2020 Funchal")!;
    expect(places.fill).toBe(POSTER_COLORS.place);
    expect(places.y).toBeGreaterThan(by("*1887")!.y);
    for (const p of on.plates.filter((q) => q.gen <= POSTER_PLACES_UP_TO)) {
      for (const t of on.texts.filter((u) => Math.abs(u.x - p.x) < p.w / 2 && u.y > p.y - p.h / 2 && u.y < p.y + p.h / 2 + 1)) {
        expect(t.y).toBeLessThanOrEqual(p.y + p.h / 2);
      }
    }
  });

  test("the residence appears only when it differs from the birth and death place, and one place is not repeated", () => {
    const body = (resi: string, death = "Wien") => `1 BIRT\n2 DATE 1900\n2 PLAC Graz\n1 DEAT\n2 DATE 1970\n2 PLAC ${death}\n1 RESI\n2 PLAC ${resi}\n`;
    const places = (b: string, extra = {}) => textsOf(ged(b), extra).texts.map((t) => t.text).filter((t) => /Graz|Wien|Linz/.test(t));
    expect(places(body("Linz"))).toEqual(["* Graz   \u2302 Linz   \u2020 Wien"]);
    expect(places(body("Graz"))).toEqual(["* Graz   \u2020 Wien"]);
    // the same place of birth and death is one entry
    expect(places(body("Linz", "Graz"))).toEqual(["*\u2020 Graz   \u2302 Linz"]);
    expect(places(body("Graz", "Graz"))).toEqual(["*\u2020 Graz"]);
    // abbreviated labels use the words of the language
    expect(places(body("Linz"), { labels: "abbr", generations: 3 })).toEqual(["b. Graz   res. Linz   d. Wien"]);
  });

  test("a long place is cut with an ellipsis and the line still fits and keeps the other place", () => {
    const long = "Sankt Georgen am Ybbsfelde im Mostviertel";
    const p = textsOf(ged(`1 BIRT\n2 DATE 1900\n2 PLAC ${long}\n1 DEAT\n2 DATE 1970\n2 PLAC Wien\n`));
    const line = p.texts.find((t) => t.text.includes("Wien") && t.fill === POSTER_COLORS.place)!;
    expect(line.text).toMatch(/^\* Sankt .*\u2026 {3}\u2020 Wien$/);
    expect(fonts.width(line.text, line.size, false)).toBeLessThanOrEqual(p.plates[0].w);
  });
});

describe("palette", () => {
  test("the screen and the PDF use the same green, gold, brown and grey as the poster", () => {
    const css = readFileSync(new URL("../ui/styles.css", import.meta.url), "utf8");
    expect(css).toContain(`--c-birth: ${PALETTE.forest};`);
    expect(css).toContain(`--c-marr: ${PALETTE.gold};`);
    expect(css).toContain(`--c-death: ${PALETTE.chocolate};`);
    expect(css).toContain(`--muted: ${PALETTE.stone};`);
    expect(css).toContain(`--accent: ${PALETTE.forest};`);
    expect(css).toContain(`--danger: ${PALETTE.brick};`);
    expect(css).toContain(`--sex-F: ${PALETTE.brick};`);
    expect(KIND_COLORS.birt).toEqual(rgbOf(PALETTE.forest));
    expect(KIND_COLORS.marr).toEqual(rgbOf(PALETTE.gold));
    expect(KIND_COLORS.deat).toEqual(rgbOf(PALETTE.chocolate));
    expect(KIND_COLORS.place).toEqual(rgbOf(PALETTE.stone));
    expect(POSTER_COLORS.branch).toBe(PALETTE.chocolate);
    expect(POSTER_COLORS.marriage).toBe(PALETTE.gold);
    expect(POSTER_COLORS.leaves).toContain(PALETTE.forest);
  });

  test("styles.css has colour values only in the token blocks of :root", () => {
    const css = readFileSync(new URL("../ui/styles.css", import.meta.url), "utf8");
    const rules = css.replace(/:root[^{]*\{[^}]*\}/g, "");
    expect(rules.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
  });
});

describe("poster tree in the middle", () => {
  const trunk = (p: ReturnType<typeof buildPoster>) => p.shapes.filter((s) => s.fill === POSTER_COLORS.branch && s.stroke === POSTER_COLORS.branchEdge && s.strokeWidth === 1.2);

  test("a landscape poster gets an apple tree between the parents and is wider than without it", () => {
    for (const gens of [3, 5, 7, 8]) {
      const p = buildPoster(full(gens), ROOT, { generations: gens, posterSeed: 1 });
      expect(p.width).toBeGreaterThanOrEqual(p.height);
      expect(trunk(p)).toHaveLength(1);
      expect(p.width).toBeGreaterThan(buildPosterWithoutTree(full(gens), ROOT, { generations: gens, posterSeed: 1 }).width);
    }
  });

  test("a portrait poster stays without the tree", () => {
    const p = buildPoster(full(10), ROOT, { generations: 10, posterSeed: 1 });
    expect(p.height).toBeGreaterThan(p.width);
    expect(trunk(p)).toHaveLength(0);
    expect(posterSvg(p)).toBe(posterSvg(buildPosterWithoutTree(full(10), ROOT, { generations: 10, posterSeed: 1 })));
  });

  test("the tree stands on the middle line below the parents' plates and the person's plate is in front of its trunk", () => {
    const p = buildPoster(full(7), ROOT, { generations: 7, posterSeed: 1 });
    const root = p.plates.find((q) => q.gen === 1)!, parents = p.plates.filter((q) => q.gen === 2);
    expect(parents).toHaveLength(2);
    // the parents are level, on both sides of the tree, and the person is below them
    expect(parents[0].y).toBe(parents[1].y);
    expect(parents[0].x).toBeLessThan(root.x);
    expect(parents[1].x).toBeGreaterThan(root.x);
    expect(root.y).toBeGreaterThan(parents[0].y);
    // the trunk (the first brown shape with a dark edge of width 1.2) ends at the ground below the plate
    const xs = (trunk(p)[0].d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(root.x);
    expect(Math.max(...xs)).toBeGreaterThan(root.x);
  });

  test("one seed always grows the same tree and the tree uses only the named palette", () => {
    const a = posterSvg(buildPoster(full(6), ROOT, { generations: 6, posterSeed: 2 })), b = posterSvg(buildPoster(full(6), ROOT, { generations: 6, posterSeed: 2 }));
    expect(a).toBe(b);
    const colours = new Set<string>(Object.values(PALETTE));
    for (const m of a.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colours.has(m[1])).toBe(true);
  });
});
