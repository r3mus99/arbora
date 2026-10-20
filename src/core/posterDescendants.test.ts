import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  buildDescendantsPoster, descendantPosterGenerations, load, POSTER_MAX_DESCENDANT_GENERATIONS, POSTER_MAX_DESCENDANT_PLATES, posterSvg, LANGS, TEXTS,
  type Poster,
} from "./index";
import { descendantsGed, type Shape } from "./fixtures/descendants";

const sample = load(readFileSync(new URL("../../public/sample.ged", import.meta.url)));
const FRANCIS = "@I52@";
const build = (ged: string, gens: number, extra = {}) => buildDescendantsPoster(load(ged), "@I1@", { generations: gens, lang: "en", posterSeed: 1, ...extra });

const overlap = (a: Poster["plates"][number], b: Poster["plates"][number]) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
const expectClean = (p: Poster) => {
  for (const q of p.plates) {
    expect(q.x - q.w / 2).toBeGreaterThanOrEqual(0);
    expect(q.x + q.w / 2).toBeLessThanOrEqual(p.width);
    expect(q.y - q.h / 2).toBeGreaterThanOrEqual(0);
    expect(q.y + q.h / 2).toBeLessThanOrEqual(p.height);
  }
  for (let i = 0; i < p.plates.length; i++) for (let j = i + 1; j < p.plates.length; j++) expect(overlap(p.plates[i], p.plates[j])).toBe(false);
  expect(posterSvg(p)).not.toMatch(/NaN|undefined|Infinity/);
};

const shapes: Record<string, Shape> = {
  typical: (g) => ({ partners: 1, children: g === 1 ? 4 : 3 }),
  sixteenChildren: (g) => ({ partners: 1, children: g === 1 ? 16 : g === 2 ? 3 : 2 }),
  threePartners: (g) => ({ partners: g === 1 ? 3 : 1, children: g === 1 ? 6 : 2 }),
  onlyChildren: () => ({ partners: 1, children: 1 }),
  noPartners: (g) => ({ partners: 0, children: g === 1 ? 5 : 2 }),
};

describe("descendants poster: the people", () => {
  test("the person stands at the left, each partner to the right of the person, the children in the next column", () => {
    const p = buildDescendantsPoster(sample, FRANCIS, { generations: 3, lang: "en" });
    const root = p.plates.find((q) => q.id === FRANCIS)!;
    expect(root.gen).toBe(1);
    expect(p.plates.filter((q) => q.gen === 1)).toHaveLength(2);
    const partner = p.plates.find((q) => q.gen === 1 && q.id !== FRANCIS)!;
    expect(partner.x).toBeGreaterThan(root.x + root.w / 2);
    const kids = sample.families[sample.people[FRANCIS].fams[0]].children;
    expect(kids.length).toBeGreaterThan(10);
    for (const c of kids) {
      const q = p.plates.find((x) => x.id === c && x.gen === 2)!;
      expect(q).toBeDefined();
      expect(q.x - q.w / 2).toBeGreaterThan(partner.x + partner.w / 2);
    }
    expectClean(p);
  });

  test("the title counts the descendants once each, without the partners, and gives the generations drawn and the years", () => {
    const p = buildDescendantsPoster(sample, FRANCIS, { generations: 3, lang: "en" });
    expect(p.title).toBe("Descendants of Francis I, Holy Roman Emperor");
    const ids = new Set(p.plates.filter((q) => q.gen > 1).map((q) => q.id));
    const descendantIds = new Set<string>();
    const walk = (id: string, gen: number) => { if (gen > 3) return; for (const f of sample.people[id].fams) for (const c of sample.families[f]?.children ?? []) { if (gen < 3) descendantIds.add(c); if (gen < 3) walk(c, gen + 1); } };
    walk(FRANCIS, 1);
    expect(ids.size).toBeGreaterThan(descendantIds.size);
    expect(p.texts.some((t) => t.text.startsWith(`3 generations · ${descendantIds.size} descendants · 1708`))).toBe(true);
  });

  test("a person without partner and children is one plate, a person with children but no known partner is the parent of the children", () => {
    const alone = build("0 HEAD\n0 @I1@ INDI\n1 NAME Ann /Solo/\n0 TRLR\n", 4);
    expect(alone.people).toBe(1);
    expectClean(alone);
    const p = build(descendantsGed(shapes.noPartners), 3);
    expect(p.people).toBe(1 + 5 + 10);
    expectClean(p);
  });

  test("cousins who married: their child is on the poster under both parents, with the 2× tag", () => {
    const ged = `0 HEAD
0 @I1@ INDI
1 NAME Root /Test/
1 FAMS @F1@
0 @I2@ INDI
1 NAME Left /Test/
1 FAMC @F1@
1 FAMS @F2@
0 @I3@ INDI
1 NAME Right /Test/
1 FAMC @F1@
1 FAMS @F3@
0 @I4@ INDI
1 NAME Cousin /Left/
1 FAMC @F2@
1 FAMS @F4@
0 @I5@ INDI
1 NAME Cousin /Right/
1 FAMC @F3@
1 FAMS @F4@
0 @I6@ INDI
1 NAME Child /Both/
1 FAMC @F4@
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
1 CHIL @I3@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I4@
0 @F3@ FAM
1 HUSB @I3@
1 CHIL @I5@
0 @F4@ FAM
1 HUSB @I4@
1 WIFE @I5@
1 CHIL @I6@
0 TRLR
`;
    const p = build(ged, 4);
    expect(p.plates.filter((q) => q.id === "@I6@")).toHaveLength(2);
    expect(p.texts.filter((t) => t.text === "2×").length).toBeGreaterThanOrEqual(2);
    expectClean(p);
  });

  test("a loop in bad data (a person who is their own descendant) ends instead of running on", () => {
    const ged = "0 HEAD\n0 @I1@ INDI\n1 NAME A /Loop/\n1 FAMS @F1@\n1 FAMC @F2@\n0 @I2@ INDI\n1 NAME B /Loop/\n1 FAMC @F1@\n1 FAMS @F2@\n0 @F1@ FAM\n1 HUSB @I1@\n1 CHIL @I2@\n0 @F2@ FAM\n1 HUSB @I2@\n1 CHIL @I1@\n0 TRLR\n";
    const p = build(ged, 4);
    expect(p.people).toBe(2);
  });
});

describe("descendants poster: uneven families stay clean", () => {
  for (const [name, shape] of Object.entries(shapes)) {
    test(`${name}: no plate overlaps another or leaves the poster, 3 and 4 generations`, () => {
      for (const gens of [3, 4]) {
        const p = build(descendantsGed(shape), gens);
        expectClean(p);
        expect(p.generations).toBeLessThanOrEqual(gens);
      }
    });
  }

  test("a family of sixteen children keeps all of them, level by level in one column", () => {
    const p = build(descendantsGed(shapes.sixteenChildren), 3);
    const column = p.plates.filter((q) => q.gen === 2 && q.x < p.width / 2);
    expect(new Set(column.map((q) => q.x)).size).toBe(1);
  });

  test("a person with three partners has a plate for each, one below the other, the children of each next to its partner", () => {
    const p = build(descendantsGed(shapes.threePartners), 3);
    const partners = p.plates.filter((q) => q.gen === 1 && q.id !== "@I1@");
    expect(partners).toHaveLength(3);
    expect(new Set(partners.map((q) => q.x)).size).toBe(1);
    expect(new Set(partners.map((q) => q.y)).size).toBe(3);
  });

  test("a chain of only children is a narrow strip", () => {
    const p = build(descendantsGed(shapes.onlyChildren), 4);
    expect(p.people).toBe(8);
    expect(p.height).toBeLessThan(500);
  });

  test("the generations setting is limited to the descendants poster's own range", () => {
    expect(descendantPosterGenerations(0)).toBe(POSTER_MAX_DESCENDANT_GENERATIONS);
    expect(descendantPosterGenerations(10)).toBe(POSTER_MAX_DESCENDANT_GENERATIONS);
    expect(descendantPosterGenerations(3)).toBe(3);
    expect(descendantPosterGenerations(1)).toBe(3);
    expect(build(descendantsGed(shapes.typical), 10).generations).toBe(POSTER_MAX_DESCENDANT_GENERATIONS);
  });

  test("a family too large for the last generation leaves that generation out, and the title says so", () => {
    const huge: Shape = (g) => ({ partners: 1, children: g === 1 ? 30 : 5 });
    const p = build(descendantsGed(huge), 4);
    expect(p.generations).toBe(3);
    expect(p.people).toBeLessThanOrEqual(POSTER_MAX_DESCENDANT_PLATES);
    expect(p.texts.some((t) => t.text.startsWith("3 generations"))).toBe(true);
    expectClean(p);
  });
});

describe("descendants poster: look", () => {
  test("the same seed draws the same tree, another seed another one, the layout stays", () => {
    const ged = descendantsGed(shapes.typical);
    const a = build(ged, 3, { posterSeed: 5 }), b = build(ged, 3, { posterSeed: 5 }), c = build(ged, 3, { posterSeed: 6 });
    expect(posterSvg(a)).toBe(posterSvg(b));
    expect(posterSvg(a)).not.toBe(posterSvg(c));
    expect(a.plates).toEqual(c.plates);
  });

  test("a marriage year stands between the person and the partner, in the language of the poster", () => {
    const p = build(descendantsGed(shapes.typical), 3, { dates: "year" });
    const root = p.plates.find((q) => q.id === "@I1@")!, partner = p.plates.find((q) => q.gen === 1 && q.id !== "@I1@")!;
    const year = p.texts.find((t) => t.text === "1822")!;
    expect(year).toBeDefined();
    expect(year.x).toBeGreaterThan(root.x + root.w / 2);
    expect(year.x).toBeLessThan(partner.x - partner.w / 2);
  });

  test("several marriages of one person put their years on different spots", () => {
    const p = buildDescendantsPoster(sample, "@I54@", { generations: 3, lang: "en", posterSeed: 2 });
    const years = p.texts.filter((t) => /^\d{4}$/.test(t.text));
    expect(years.length).toBeGreaterThan(10);
    expect(new Set(years.map((t) => `${Math.round(t.x)},${Math.round(t.y)}`)).size).toBe(years.length);
  });

  test("with Show places on, the plates of the first generations carry the places and stay in the drawing", () => {
    const p = build(descendantsGed(shapes.typical), 3, { showPlaces: true });
    expect(p.texts.some((t) => t.text.includes("Town"))).toBe(true);
    expectClean(p);
  });

  test("every language has the noun for the descendants and the poster title", () => {
    for (const lang of LANGS) {
      expect(TEXTS[lang].descendants).toHaveLength(3);
      expect(TEXTS[lang].descendants.every(Boolean)).toBe(true);
      const p = buildDescendantsPoster(sample, FRANCIS, { generations: 3, lang });
      expect(p.title).toContain("Francis");
    }
  });
});
