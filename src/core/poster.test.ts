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
    const a = buildPoster(sparse, ROOT, { generations: 6 }), b = buildPoster(full(6), ROOT, { generations: 6 });
    expect(a.people).toBeLessThan(b.people);
    expect(a.height).toBeLessThan(b.height * 0.8);
    expect(b.width).toBe(a.width);
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

describe("poster plates", () => {
  test("every plate has its own hand-cut brown outline, and the name is blue for men and red for women", () => {
    const poster = buildPoster(data, ROOT, { generations: 4, posterSeed: 1 });
    const outlines = poster.shapes.filter((s) => s.fill === "#4a2f18" && !s.stroke);
    expect(outlines.length).toBe(poster.people);
    expect(new Set(outlines.map((s) => s.d)).size).toBe(outlines.length);
    const names = poster.texts.filter((t) => t.bold && t.fill !== "#2a1d12");
    expect(names.some((t) => t.fill === "#2f5f9e")).toBe(true);
    expect(names.some((t) => t.fill === "#a8322a")).toBe(true);
    expect(poster.texts.filter((t) => !t.bold && !t.text.startsWith("\u26AD")).every((t) => t.fill === "#2a1d12")).toBe(true);
  });
});

describe("poster marriage years", () => {
  const years = (p: ReturnType<typeof buildPoster>) => p.texts.filter((t) => t.text.startsWith("\u26AD"));

  test("a marriage year stands at each couple, bigger for the closer generations, and nothing without a date", () => {
    const p = buildPoster(full(6, () => true, true), ROOT, { generations: 6 });
    expect(years(p)).toHaveLength(2 ** 5 - 1);
    expect(years(p).map((t) => t.text)).toContain("\u26AD 1701");
    expect(years(p).every((t) => !t.bold && t.fill === "#6b4626")).toBe(true);
    const size = (year: string) => years(p).find((t) => t.text === year)!.size;
    expect(size("\u26AD 1701")).toBeGreaterThan(size("\u26AD 1702"));
    expect(size("\u26AD 1702")).toBeGreaterThan(size("\u26AD 1704"));
    expect(size("\u26AD 1704")).toBeGreaterThan(size("\u26AD 1716"));
    expect(years(buildPoster(full(6), ROOT, { generations: 6 }))).toHaveLength(0);
  });

  test("a marriage year touches no plate and no other marriage year", () => {
    const p = buildPoster(full(7, () => true, true), ROOT, { generations: 7 });
    const hits: string[] = [];
    const box = (t: { text: string; x: number; y: number; size: number }) => [t.x, t.y - t.size * 0.3, textWidth(t.text, t.size, false), t.size] as const;
    for (const t of years(p)) {
      const [x, y, w, h] = box(t);
      for (const q of p.plates) if (Math.abs(x - q.x) < (w + q.w) / 2 && Math.abs(y - q.y) < (h + q.h) / 2) hits.push(`${t.text} ${q.id}`);
      for (const u of years(p)) {
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
  test("a bigger poster keeps the size of the plates and of the text", () => {
    const seven = buildPoster(full(7), "@I1@", { generations: 7 });
    const ten = buildPoster(full(10), "@I1@", { generations: 10 });
    expect(ten.generations).toBe(10);
    expect(ten.people).toBe(2 ** 10 - 1);
    expect(ten.width).toBeGreaterThan(seven.width);
    expect(ten.plates[1].w).toBe(seven.plates[1].w);
    expect(ten.plates[1].h).toBe(seven.plates[1].h);
    // the names of the last generation are as big as on the smaller poster
    expect(Math.min(...ten.texts.slice(0, -1).map((t) => t.size))).toBeGreaterThanOrEqual(
      Math.min(...seven.texts.slice(0, -1).map((t) => t.size)));
  }, 60000);
});
