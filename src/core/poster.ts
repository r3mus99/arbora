/**
 * Tree poster: the ancestors of one person as a decorative wall chart. The person stands in the centre below the parents, the father's line unfolds to the left and the mother's to the right, one generation per column. Name plates have exact
 * positions; the branches between them are drawn from a seeded random generator, so one seed always gives the same
 * tree and every seed a different one.
 *
 * The result is a flat list of shapes (SVG path data with fill and stroke) and text lines, written out as SVG by
 * `posterSvg`; other outputs can draw the same list.
 */

import type { GedcomData, Person } from "./gedcom";
import { formatDMY, formatDate, formatEvent, formatPlace, residencePlace, type ChartOptions } from "./format";
import { normalize } from "./chart";
import { yearOf } from "./date";
import { TEXTS } from "./texts";
import { CORNER_HEAD_H, CORNER_HEAD_SIZE, CORNER_LABEL_SIZE, CORNER_PAD, CORNER_STEP, CORNER_VALUE_SIZE, cornerBlocks, cornerHeight, type CornerKey } from "./posterCorners";
import type { PosterFonts } from "./posterFont";
import { PALETTE } from "./palette";

export const POSTER_MIN_GENERATIONS = 3;
export const POSTER_MAX_GENERATIONS = 10;
/** the fewest generations that are actually on the poster (not only asked for) for the corner lists to be drawn */
export const POSTER_CORNERS_MIN_GENERATIONS = 5;
/** The corner lists and the generation ruler are the poster's statistics: both appear under this one rule. */
export const posterHasStatistics = (filledGens: number) => filledGens >= POSTER_CORNERS_MIN_GENERATIONS;
/** Plate size by generation (person, parents, grandparents, great-grandparents): the people the person may still have
 * known stand out; every further generation is 100 %. */
/** The most a branch swings sideways from the straight line between its ends, in drawing units. */
const POSTER_MAX_SWING = 24;
const POSTER_BRANCH_OVERLAP = 6;
export const POSTER_PLATE_SCALE = [2, 1.75, 1.5, 1.25];
/** The plates of generations 1 to this one (the big ones) show where the person was born, lived and died on a third line under the years, when "Show places" is on. */
export const POSTER_PLACES_UP_TO = 4;
/** A plate with a places line is as tall as its lines need, but at most this much taller than a plain plate. */
export const POSTER_PLACES_HEIGHT = 1.5;
/** The places line is this much of the name size; it shrinks to `POSTER_PLACES_MIN` of that before a place is cut. */
const PLACES_SIZE = 0.85, PLACES_MIN = 0.8;
const placesFor = (gen: number, o: { showPlaces: boolean }) => o.showPlaces && gen <= POSTER_PLACES_UP_TO;
/** From this generation on (the person is generation 1) the plates are only this tall (text, spacing and border shrink with them), so a big poster does not grow so fast in height. */
export const POSTER_SMALL_FROM = 7;
export const POSTER_SMALL_HEIGHT = 0.5;
/** The small plates are also narrower, and the branches between them shorter (the gap between two small columns). */
export const POSTER_SMALL_WIDTH = 0.7;
const POSTER_SMALL_GAP = 45;

export interface PosterShape {
  /** SVG path data in poster units, absolute coordinates */
  d: string;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
}

export interface PosterText {
  text: string;
  /** centre of the line */
  x: number;
  /** baseline */
  y: number;
  size: number;
  bold: boolean;
  fill: string;
}

export interface Poster {
  /** drawing area in poster units; the paper has the same proportions */
  width: number;
  height: number;
  /** The border drawn outside the width and height (0 without a frame). */
  margin: number;
  /** drawn in this order: background, branches, leaves, plates */
  shapes: PosterShape[];
  texts: PosterText[];
  generations: number;
  /** people on the plates */
  people: number;
  /** where every person's plate is: centre and size */
  plates: { id: string; gen: number; x: number; y: number; w: number; h: number }[];
  seed: number;
  title: string;
}

/** What the mark in the corner of a poster says about its origin. */
export interface PosterCredit { version: string; date: Date }

export const POSTER_COLORS = {
  paper: PALETTE.parchment, plate: PALETTE.ivory, male: PALETTE.lapis, female: PALETTE.brick, ink: PALETTE.ink, line: PALETTE.espresso,
  branch: PALETTE.chocolate, marriage: PALETTE.gold, branchEdge: PALETTE.espresso, birth: PALETTE.forest, death: PALETTE.chocolate, place: PALETTE.stone,
  leafEdge: PALETTE.leafEdge, leaves: [PALETTE.forest, PALETTE.fern, PALETTE.pine, PALETTE.clover, PALETTE.spruce],
};

/** A small seeded generator (mulberry32): the same seed gives the same sequence. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed of a poster: the number chosen by the user combined with the root person, so people differ. */
export function posterSeed(rootId: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < rootId.length; i++) h = Math.imul(h ^ rootId.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type Point = [number, number];

export const num = (n: number) => String(Math.round(n * 10) / 10);
/** A glyph scale (about 0.01) needs more digits than a coordinate. */
const scale = (n: number) => String(Math.round(n * 1e5) / 1e5);

/** Width of a text as the layout assumes it without the poster fonts; the real fonts are narrower, so a line never overflows its plate. */
export const textWidth = (text: string, size: number, bold: boolean) => text.length * size * (bold ? 0.62 : 0.56);

/** Points of a Catmull-Rom spline through `pts`, `k` per segment. */
export function dense(pts: Point[], k = 6): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const at = (c: 0 | 1) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
        (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A rectangle with corners rounded by `r`, as a path around the centre (cx, cy). Rectangles that are too small for `r` get less rounding. */
export function roundedRect(cx: number, cy: number, w: number, h: number, r: number, hole = false): string {
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const a = (x: number, y: number) => `A${num(r)},${num(r)} 0 0 ${hole ? 0 : 1} ${num(x)},${num(y)}`;
  const l = (x: number, y: number) => `L${num(x)},${num(y)}`;
  // a hole runs the other way round, so that it cuts out of the shape it lies in
  return hole
    ? `M${num(x0 + r)},${num(y0)}${a(x0, y0 + r)}${l(x0, y1 - r)}${a(x0 + r, y1)}${l(x1 - r, y1)}${a(x1, y1 - r)}${l(x1, y0 + r)}${a(x1 - r, y0)}Z`
    : `M${num(x0 + r)},${num(y0)}${l(x1 - r, y0)}${a(x1, y0 + r)}${l(x1, y1 - r)}${a(x1 - r, y1)}${l(x0 + r, y1)}${a(x0, y1 - r)}${l(x0, y0 + r)}${a(x0 + r, y0)}Z`;
}

/**
 * A plate with straight edges, rounded corners and a double line (a thick one outside, a thin one inside, like the
 * border of the whole poster); with `single` just one line. Returns the ink shape (the lines) and the paper shape
 * (drawn over it), both around the centre (cx, cy); the lines grow with the plate (`scale`).
 */
export function plateOutline(cx: number, cy: number, w: number, h: number, scale: number, single = false, r = 7 * scale): [string, string] {
  const thick = 2.2 * scale, gap = 2.6 * scale, thin = 1.2 * scale;
  const ring = (inset: number, width: number) =>
    roundedRect(cx, cy, w - 2 * inset, h - 2 * inset, r - inset) + roundedRect(cx, cy, w - 2 * (inset + width), h - 2 * (inset + width), r - inset - width, true);
  if (single) return [ring(0, thick), roundedRect(cx, cy, w - 2 * thick, h - 2 * thick, r - thick)];
  const inner = thick + gap + thin;
  return [ring(0, thick) + ring(thick + gap, thin), ring(thick, gap) + roundedRect(cx, cy, w - 2 * inner, h - 2 * inner, r - inner)];
}

const angleAt = (d: Point[], k: number) => {
  const a = d[Math.max(k - 1, 0)], b = d[Math.min(k + 1, d.length - 1)];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

/** A branch as a filled shape that narrows from width `w0` at its start to `w1` at its end. */
function tapered(d: Point[], w0: number, w1: number): string {
  const left: Point[] = [], right: Point[] = [];
  d.forEach(([x, y], i) => {
    const a = d[Math.max(i - 1, 0)], b = d[Math.min(i + 1, d.length - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * i / (d.length - 1)) / 2;
    left.push([x - dy / l * w, y + dx / l * w]);
    right.push([x + dy / l * w, y - dx / l * w]);
  });
  const poly = [...left, ...right.reverse()];
  return "M" + poly.map(([x, y]) => `${num(x)},${num(y)}`).join("L") + "Z";
}

/** A leaf from its stalk at (x, y), pointing `ang` radians, `s` times the base size; the midrib is part of the path. */
function leafPath(x: number, y: number, ang: number, s: number): string {
  const c = Math.cos(ang), sn = Math.sin(ang);
  const p = ([px, py]: Point) => `${num(x + (px * c - py * sn) * s)},${num(y + (px * sn + py * c) * s)}`;
  return `M${p([0, 0])}C${p([4, -9])} ${p([20, -10])} ${p([34, 0])}C${p([20, 10])} ${p([4, 9])} ${p([0, 0])}Z` +
    `M${p([2, 0])}L${p([30, 0])}`;
}

export interface Plate { id: string; gen: number; x: number; y: number; w: number; h: number }

/** The ancestors of `rootId` as a poster; `options.generations` generations including the person (0 = all, which the poster keeps to POSTER_MAX_GENERATIONS); the poster is as wide as the generations need and as high as the people need. */
export function buildPoster(data: GedcomData, rootId: string, options: Partial<ChartOptions>, fonts?: PosterFonts, credit?: PosterCredit): Poster {
  const o = normalize(options);
  const measure = fonts ? fonts.width : textWidth;
  const root = data.people[rootId];
  if (!root) throw new Error(`Person ${rootId} does not exist.`);
  const gens = Math.min(POSTER_MAX_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(o.generations) || POSTER_MAX_GENERATIONS));
  const seed = posterSeed(rootId, o.posterSeed);
  const rnd = random(seed);

  // ------------------------------------------------------------ plates
  // the plates keep one size; the columns are one generation each and the drawing is as high as the people need
  // The closest generations, whom the person may still have known, get bigger plates (see POSTER_PLATE_SCALE).
  const rowGap = 24, minGap = 70;
  const kit = plateKit(o, measure, gens);
  const { widthOf, small, heightOf, plateHeight, lookOf } = kit;
  // The year of a marriage and the number of children of the couple are a small gold text where the branches of the
  // two parents meet, each line led by a drawn symbol (two rings, two figures); its size follows the generation of the
  // child, and the gap between the child's column and the parents' is wide enough for it.
  const marrSize = (gen: number) => 12 * lookOf(gen);
  const symbolW = (size: number) => size * 1.14;
  const lineW = ({ text }: MarrLine, size: number) => symbolW(size) + size * 0.3 + measure(text, size, false);
  const marrLines = (pid: string | null): MarrLine[] => {
    const f = pid && data.people[pid]?.famc.length ? data.families[data.people[pid].famc[0]] : null;
    if (!f) return [];
    const date = f.marriage ? formatDate(f.marriage.date, o.dates === "full", o.lang) : "";
    const lines: MarrLine[] = [];
    if (date) lines.push({ symbol: "rings", text: date });
    if (f.children.length > 1) lines.push({ symbol: "children", text: String(f.children.length) });
    return lines;
  };
  const needed = new Map<number, number>();
  const survey = (pid: string | null, gen: number) => {
    const f = pid && gen < gens && data.people[pid]?.famc.length ? data.families[data.people[pid].famc[0]] : null;
    if (!f || !f.husb || !f.wife || !data.people[f.husb] || !data.people[f.wife]) return;
    const widest = Math.max(0, ...marrLines(pid).map((l) => lineW(l, marrSize(gen))));
    if (widest && gen > 1) needed.set(gen, Math.max(needed.get(gen) ?? 0, widest));
    survey(f.husb, gen + 1);
    survey(f.wife, gen + 1);
  };
  survey(rootId, 1);
  const gapAfter = (gen: number) => gen >= POSTER_SMALL_FROM ? Math.max(POSTER_SMALL_GAP, Math.ceil((needed.get(gen) ?? 0) + 40)) : Math.max(minGap, Math.ceil((needed.get(gen) ?? 0) + 80));
  // column centres, measured from the middle line: the first column starts 40 away from it
  const colX = new Map<number, number>();
  let edge = 40;
  for (let g = 2; g <= gens; g++) {
    colX.set(g, edge + widthOf(g) / 2);
    edge += widthOf(g) + gapAfter(g);
  }
  // placed around x = 0 first; the poster is made as wide as the plates need, each side by its own depth (below)
  let W = 0;
  const plates: Plate[] = [];
  const kids = new Map<Plate, Plate[]>();
  const people = new Map<Plate, Person>();

  // y is set below, once the packing of the people is known
  const place = (pid: string | null, gen: number, side: -1 | 1): Plate | null => {
    const p = pid ? data.people[pid] : null;
    if (!p) return null;
    const plate: Plate = { id: pid!, gen, w: widthOf(gen), h: plateHeight(p, gen), x: side * colX.get(gen)!, y: 0 };
    plates.push(plate);
    people.set(plate, p);
    const fam = p.famc.length ? data.families[p.famc[0]] : null;
    const next: Plate[] = [];
    if (gen < gens && fam) {
      for (const parent of [fam.husb, fam.wife]) {
        const q = place(parent, gen + 1, side);
        if (q) next.push(q);
      }
    }
    kids.set(plate, next);
    return plate;
  };

  const rootPlate: Plate = { id: rootId, gen: 1, x: 0, y: 0, w: widthOf(1), h: plateHeight(root, 1) };
  plates.push(rootPlate);
  people.set(rootPlate, root);
  const fam = root.famc.length ? data.families[root.famc[0]] : null;
  const rootKids: [Plate, -1 | 1][] = [];
  if (fam && gens > 1) {
    const f = place(fam.husb, 2, -1), m = place(fam.wife, 2, 1);
    if (f) rootKids.push([f, -1]);
    if (m) rootKids.push([m, 1]);
  }

  // A side with fewer generations leaves no empty room: the poster is as wide as the two sides need, and the main
  // person stands where the sides meet, not necessarily in the middle (the title stays in the middle of the sheet).
  const reach = (side: -1 | 1) => Math.max(rootPlate.w / 2, ...plates.filter((q) => q !== rootPlate && Math.sign(q.x) === side).map((q) => side * q.x + q.w / 2));
  const [leftReach, rightReach] = [reach(-1), reach(1)];
  const content = leftReach + rightReach + 40;
  W = Math.max(1400, Math.round(content));
  const shift = 20 + leftReach + (W - content) / 2;
  for (const q of plates) q.x += shift;

  const appearances = new Map<string, number>();
  for (const plate of plates) appearances.set(plate.id, (appearances.get(plate.id) ?? 0) + 1);
  const title = TEXTS[o.lang].title.replace("{name}", root.name || "?");
  // the title stands in a frame like the plates, with the numbers of the poster under it
  const born = [...people.values()].map((x) => yearOf(x.birth?.date)).filter((y): y is number => y !== null);
  const rootYear = yearOf(root.birth?.date);
  const plural = new Intl.PluralRules(o.lang);
  const counted = (n: number, forms: string[]) => `${n} ${forms[{ one: 0, few: 1 }[plural.select(n) as "one" | "few"] ?? 2]}`;
  // "6 generations · 62 ancestors · 1722–1887": the range runs from the oldest birth to the main person's
  const stats = [counted(gens, TEXTS[o.lang].generations), counted(appearances.size - 1, TEXTS[o.lang].ancestors),
    rootYear !== null && born.length > 1 ? `${Math.min(...born)}\u2013${rootYear}` : ""].filter(Boolean).join(" \u00B7 ");
  const frameW = Math.max(measure(title, 58, true), measure(stats, 26, false)) + 120, frameH = 150;

  // The lists in the corners (drawn when the poster really reaches POSTER_CORNERS_MIN_GENERATIONS generations): the top ones stand beside the title when there is room for
  // them there, otherwise above it; the bottom ones under the lowest plates. The poster grows by their height.
  const branchPeople = (q: Plate) => {
    const out = new Map<string, Person>();
    const walk = (x: Plate) => { out.set(x.id, people.get(x)!); (kids.get(x) || []).forEach(walk); };
    walk(q);
    return [...out.values()];
  };
  const branchOf: Record<CornerKey, Person[]> = { fatherFather: [], fatherMother: [], motherFather: [], motherMother: [] };
  for (const [parent, side] of rootKids) {
    const pf = data.people[parent.id].famc.length ? data.families[data.people[parent.id].famc[0]] : null;
    for (const q of kids.get(parent) || []) {
      const key = `${side < 0 ? "father" : "mother"}${pf && pf.husb === q.id ? "Father" : "Mother"}` as CornerKey;
      branchOf[key] = branchPeople(q);
    }
  }
  const isTop = (key: CornerKey) => key.endsWith("Father");
  // the lists start where the plates start: the left ones at the leftmost plate edge, the right ones end at the rightmost
  const plateLeft = Math.min(...plates.map((p) => p.x - p.w / 2)), plateRight = Math.max(...plates.map((p) => p.x + p.w / 2));
  const cornerEdge = (key: CornerKey) => key.startsWith("father") ? plateLeft : plateRight;
  const filledGens = Math.max(...plates.map((p) => p.gen));
  const cornerRoom = (key: CornerKey) => W / 2 - 100 - (key.startsWith("father") ? plateLeft - 60 : W - 60 - plateRight);
  // the labels (Line, Origin, ...) stand in a column of their own, the values start at its right edge
  const t = TEXTS[o.lang].corners;
  const labelW = Math.max(...[t.line, t.origin, t.given, t.surnames].map((l) => measure(l, CORNER_LABEL_SIZE, true))) + CORNER_PAD + 22;
  const corners = posterHasStatistics(filledGens) ? cornerBlocks(branchOf, o, measure, (key) => cornerRoom(key) - 2 * CORNER_PAD, gens, labelW) : [];
  // all frames are as wide as the widest content needs, so the four read as a set
  const blockW = Math.min(Math.max(0, ...corners.map((c) => labelW + 16 + Math.max(measure(c.heading, CORNER_HEAD_SIZE, true), ...c.rows.map((r) => measure(r.value, CORNER_VALUE_SIZE, false))) + CORNER_PAD)),
    ...corners.map((c) => cornerRoom(c.key)));
  const bandH = (top: boolean) => Math.max(0, ...corners.filter((c) => isTop(c.key) === top).map((c) => cornerHeight(c.rows.length)));
  const topH = bandH(true), bottomH = bandH(false);
  // The ruler runs through the middle of the title frame, so the title and the time axis read as one; the lists
  // stand under the numbers of the ruler and the plates under the lists.
  const frameY = 100, rulerY = frameY - 6;
  const listsY = frameY + 90;
  const top = topH ? listsY + topH + 40 : 190;
  const bottom = bottomH ? 30 + bottomH + 40 : 70;

  // Tidy-tree packing: a person stands halfway between the two parents (or level with a lone parent), and the
  // father's branch is pushed against the mother's just far enough that no two plates of one column touch. Only
  // people who exist take room, so an incomplete branch no longer leaves a gap. A contour holds, for each
  // generation below a plate, the top and bottom edge of the plates there (plates differ in height).
  type Contour = [low: number, high: number][];
  const offsets = new Map<Plate, number[]>();
  const pack = (plate: Plate): Contour => {
    const own: [number, number] = [-plate.h / 2, plate.h / 2];
    const ps = kids.get(plate) || [];
    if (!ps.length) return [own];
    const cs = ps.map(pack);
    if (cs.length === 1) { offsets.set(plate, [0]); return [own, ...cs[0]]; }
    const [a, b] = cs;
    let delta = 0;
    // the gap between two plates of a column shrinks with the small plates (the contour starts at this plate's generation)
    for (let i = 0; i < Math.min(a.length, b.length); i++) delta = Math.max(delta, a[i][1] - b[i][0] + (small(plate.gen + 1 + i) ? rowGap * POSTER_SMALL_HEIGHT : rowGap));
    offsets.set(plate, [-delta / 2, delta / 2]);
    const out: Contour = [own];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const lows = [a[i] && a[i][0] - delta / 2, b[i] && b[i][0] + delta / 2].filter((v) => v !== undefined);
      const highs = [a[i] && a[i][1] - delta / 2, b[i] && b[i][1] + delta / 2].filter((v) => v !== undefined);
      out.push([Math.min(...lows), Math.max(...highs)]);
    }
    return out;
  };
  const sides = rootKids.map(([plate]) => {
    const c = pack(plate);
    const low = Math.min(...c.map((r) => r[0])), high = Math.max(...c.map((r) => r[1]));
    return { plate, low, high };
  });
  // the two parents stand level in the middle, the person below them; the rest of each side hangs above and below
  // the parents
  const levelY = top + Math.max(0, ...sides.map((x) => -x.low));
  const rootY = levelY + Math.max(heightOf(2), ...rootKids.map(([q]) => q.h)) / 2 + 140 + rootPlate.h / 2;
  const H = Math.round(Math.max(levelY + Math.max(0, ...sides.map((x) => x.high)), rootY + rootPlate.h / 2) + bottom);
  const settle = (plate: Plate, y: number) => {
    plate.y = y;
    (kids.get(plate) || []).forEach((q, i) => settle(q, y + offsets.get(plate)![i]));
  };
  for (const x of sides) settle(x.plate, levelY);
  rootPlate.y = rootY;

  // ------------------------------------------------------------ branches
  const shapes: PosterShape[] = [];
  const C = POSTER_COLORS;
  const { branches, leaves, occupied, occupy, curve, limb, free } = makeGrower(rnd, plates, W, H);

  // The marriage years: a small gold text where the branches of the two parents meet, in the gap between the
  // person and the parents (beside the fork for the main person). The room is kept free of shoots before they grow;
  // afterwards the spot closest to the usual one that touches no plate, branch, shoot or leaf is taken.
  const labels = plates.flatMap((plate) => {
    if ((plate === rootPlate ? rootKids : kids.get(plate) || []).length !== 2) return [];
    const lines = marrLines(plate.id);
    if (!lines.length) return [];
    const size = marrSize(plate.gen), width = Math.max(...lines.map((l) => lineW(l, size))), height = size * 1.15 * lines.length;
    let x: number, y: number;
    if (plate === rootPlate) {
      x = plate.x + 30 + width / 2;
      y = Math.max(...rootKids.map(([q]) => q.y + q.h / 2)) + 70 + 40;
    } else {
      const side = Math.sign(plate.x - rootPlate.x);
      x = plate.x + side * (plate.w / 2 + gapAfter(plate.gen) * 0.6);
      y = plate.y;
    }
    for (let px = x - width / 2; px <= x + width / 2; px += 6) {
      for (let py = y - height / 2; py <= y + height / 2; py += 6) occupy([px, py]);
    }
    const parents = (plate === rootPlate ? rootKids.map(([q]) => q) : kids.get(plate) || []).map((q) => q.y);
    return [{ lines, size, width, height, x, y, top: Math.min(...parents), bottom: Math.max(...parents) }];
  });
  const reserved = occupied.length;


  const grow = (child: Plate, parent: Plate, side: -1 | 1) => {
    limb(curve([child.x + side * child.w / 2, child.y], [parent.x - side * parent.w / 2, parent.y]), gens - parent.gen, true, true);
    for (const q of kids.get(parent) || []) grow(parent, q, side);
  };
  // one limb rises from the person and splits in two, one for each parent
  if (rootKids.length) {
    const lowest = Math.max(...rootKids.map(([plate]) => plate.y + plate.h / 2));
    const fork: Point = [rootPlate.x, lowest + 70];
    limb(curve([rootPlate.x, rootPlate.y - rootPlate.h / 2], fork, true), gens - 1, true);
    for (const [plate, side] of rootKids) {
      limb(curve(fork, [plate.x - side * plate.w * 0.2, plate.y + plate.h / 2], true), gens - 2, false, true);
      for (const q of kids.get(plate) || []) grow(plate, q, side);
    }
  }

  const marriages: PosterText[] = [];
  const symbols: PosterShape[] = [];
  const taken: [number, number, number, number][] = [];
  for (const label of labels) {
    const { lines, size, width, height, x, y, top, bottom } = label;
    // the room between the two branches is preferred; a spot above or below them is the last resort
    const near: [number, number, number][] = [];
    for (let dx = -70; dx <= 70; dx += 4) {
      for (let dy = -120; dy <= 120; dy += 4) {
        const outside = y + dy < top || y + dy > bottom;
        near.push([x + dx, y + dy, Math.abs(dx) + 2 * Math.abs(dy) + (outside ? 1000 : 0)]);
      }
    }
    near.sort((a, b) => a[2] - b[2]);
    const apart = (px: number, py: number) => !taken.some(([tx, ty, tw, th]) => Math.abs(px - tx) < (width + tw) / 2 + 6 && Math.abs(py - ty) < (height + th) / 2 + 6);
    const spot = near.find(([px, py]) => free(px, py, width, height) && apart(px, py) && !occupied.slice(reserved).some(([ox, oy]) =>
      Math.abs(ox - px) < width / 2 + 6 && Math.abs(oy - py) < height / 2 + 6)) ?? [x, y];
    taken.push([spot[0], spot[1], width, height]);
    const left = spot[0] - width / 2;
    lines.forEach(({ symbol, text }, i) => {
      const cy = spot[1] - height / 2 + (i + 0.5) * size * 1.15;
      symbols.push(...symbolShapes(symbol, left, cy, size));
      marriages.push({ text, x: left + symbolW(size) + size * 0.3 + measure(text, size, false) / 2, y: cy + size * 0.3, size, bold: false, fill: POSTER_COLORS.marriage });
    });
  }

  // ------------------------------------------------------------ plates and texts
  const texts: PosterText[] = [];
  const drawn = drawPlates(plates, people, appearances, o, measure, kit);
  const plateShapes = drawn.shapes;
  texts.push(...drawn.texts);
  const [frameOuter, frameInner] = plateOutline(W / 2, frameY, frameW, frameH, 2);
  plateShapes.push({ d: frameOuter, fill: C.branchEdge, stroke: null, strokeWidth: 0 }, { d: frameInner, fill: C.plate, stroke: null, strokeWidth: 0 });
  texts.push(...marriages, { text: title, x: W / 2, y: frameY - 4, size: 58, bold: true, fill: C.ink },
             { text: stats, x: W / 2, y: frameY + 40, size: 26, bold: false, fill: C.branch });
  for (const { key, heading, headLabel, rows } of corners) {
    const left = key.startsWith("father"), x = cornerEdge(key), cx = left ? x + blockW / 2 : x - blockW / 2;
    const y0 = isTop(key) ? listsY : H - bottom + 30, h = cornerHeight(rows.length), x0 = cx - blockW / 2, x1 = cx + blockW / 2;
    // the same double-line frame as the title and the plates, the heading and a hairline above the lines
    const [outer, inner] = plateOutline(cx, y0 + h / 2, blockW, h, 1.3, false, 14);
    plateShapes.push({ d: outer, fill: C.branchEdge, stroke: null, strokeWidth: 0 }, { d: inner, fill: C.plate, stroke: null, strokeWidth: 0 });
    plateShapes.push({ d: `M${num(x0 + CORNER_PAD)},${num(y0 + CORNER_HEAD_H - 0.7)}L${num(x1 - CORNER_PAD)},${num(y0 + CORNER_HEAD_H - 0.7)}L${num(x1 - CORNER_PAD)},${num(y0 + CORNER_HEAD_H + 0.7)}L${num(x0 + CORNER_PAD)},${num(y0 + CORNER_HEAD_H + 0.7)}Z`, fill: C.branchEdge, stroke: null, strokeWidth: 0 });
    const put = (text: string, size: number, bold: boolean, y: number, fill: string, from: number) =>
      texts.push({ text, x: from + measure(text, size, bold) / 2, y, size, bold, fill });
    const headY = y0 + CORNER_HEAD_H / 2 + 11;
    put(headLabel, CORNER_LABEL_SIZE, true, headY, C.branch, x0 + CORNER_PAD);
    put(heading, CORNER_HEAD_SIZE, true, headY, C.branchEdge, x0 + labelW + 16);
    rows.forEach((r, n) => {
      const y = y0 + CORNER_HEAD_H + n * CORNER_STEP + CORNER_STEP * 0.68;
      put(r.label, CORNER_LABEL_SIZE, true, y, C.branch, x0 + CORNER_PAD);
      put(r.value, CORNER_VALUE_SIZE, false, y, C.ink, x0 + labelW + 16);
    });
  }

  // The ruler: a purely decorative line across the poster, level with the middle of the title frame, with a tick at the
  // middle of every generation's column, "Nth generation" over it and under it how many of the possible
  // people of that column are known (father's side left, mother's side right, the main person in the middle).
  // The title frame covers the columns beside the main person: their labels are left out.
  // Like the corner lists, it appears only when the poster really reaches POSTER_CORNERS_MIN_GENERATIONS generations.
  if (posterHasStatistics(filledGens)) {
    const ordinal = TEXTS[o.lang].generation;
    const left = Math.min(...plates.map((p) => p.x - p.w / 2)), right = Math.max(...plates.map((p) => p.x + p.w / 2));
    const bar = (x0: number, y0: number, x1: number, y1: number) => `M${x0},${y0}L${x1},${y0}L${x1},${y1}L${x0},${y1}Z`;
    // the outermost labels may be wider than their narrow plates: they stay inside the drawing
    const fit = (x: number, text: string, size: number, bold: boolean) => Math.min(W - 10 - measure(text, size, bold) / 2, Math.max(10 + measure(text, size, bold) / 2, x));
    const base = rulerY + 6;
    let d = bar(left, base - 1.5, right, base + 1.5);
    for (let x = left; x <= right; x += 25) d += bar(x - 0.75, base - 7, x + 0.75, base);
    const cols = new Map<string, Plate[]>();
    for (const q of plates) cols.set(`${q.gen}:${q === rootPlate ? 0 : Math.sign(q.x - rootPlate.x)}`, [...(cols.get(`${q.gen}:${q === rootPlate ? 0 : Math.sign(q.x - rootPlate.x)}`) || []), q]);
    const covered = (x0: number, x1: number) => x1 > W / 2 - frameW / 2 - 14 && x0 < W / 2 + frameW / 2 + 14;
    for (const [key, members] of cols) {
      const gen = Number(key.split(":")[0]);
      const cx = members.reduce((sum, q) => sum + q.x, 0) / members.length;
      const label = ordinal.replace("{n}", String(gen));
      const lw = measure(label, 26, true), lx = fit(cx, label, 26, true);
      if (covered(lx - lw / 2, lx + lw / 2)) continue;
      d += bar(cx - 2, base - 26, cx + 2, base + 18);
      texts.push({ text: label, x: lx, y: base - 38, size: 26, bold: true, fill: C.branchEdge });
      // how many of the possible people are known: a column on one side holds 2^(generation-2) of them
      const known = TEXTS[o.lang].known.replace("{a}", String(members.length)).replace("{b}", String(gen === 1 ? 1 : 2 ** (gen - 2)));
      texts.push({ text: known, x: fit(cx, known, 22, false), y: base + 44, size: 22, bold: false, fill: C.ink });
    }
    plateShapes.unshift({ d, fill: C.branchEdge, stroke: null, strokeWidth: 0 });
  }

  const { margin, frameShapes } = posterBorder(W, H);
  addCredit(texts, credit, o, measure, W, H);
  shapes.push({ d: `M${-margin},${-margin}L${W + margin},${-margin}L${W + margin},${H + margin}L${-margin},${H + margin}Z`, fill: C.paper, stroke: null, strokeWidth: 0 },
              ...frameShapes, ...branches, ...leaves, ...symbols, ...plateShapes);
  return { width: W, height: H, margin, shapes, texts, generations: gens, people: plates.length, plates: plates.map(({ id, gen, x, y, w, h }) => ({ id, gen, x, y, w, h })), seed, title };
}

/**
 * The branches of a poster: limbs with side shoots and leaves grown from a seeded generator, kept clear of the plates
 * (`plates` is read while growing, so plates added later count too) and of the poster edge.
 */
export function makeGrower(rnd: () => number, plates: Plate[], W: number, H: number) {
  const uniform = (a: number, b: number) => a + (b - a) * rnd();
  const int = (a: number, b: number) => Math.floor(uniform(a, b + 1));
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];
  const C = POSTER_COLORS;
  const branches: PosterShape[] = [], leaves: PosterShape[] = [];
  const occupied: Point[] = [];
  // limb and leaf points in a grid of CELL-sized squares, so that `free` looks only at the points near the box
  const CELL = 40;
  const grid = new Map<string, Point[]>();
  const addPoint = (pt: Point) => {
    const key = `${Math.floor(pt[0] / CELL)}:${Math.floor(pt[1] / CELL)}`;
    const cell = grid.get(key);
    if (cell) cell.push(pt); else grid.set(key, [pt]);
  };
  const touchesPoint = (x: number, y: number, w: number, h: number) => {
    for (let cx = Math.floor((x - w / 2 - 10) / CELL); cx <= Math.floor((x + w / 2 + 10) / CELL); cx++) {
      for (let cy = Math.floor((y - h / 2 - 10) / CELL); cy <= Math.floor((y + h / 2 + 10) / CELL); cy++) {
        if (grid.get(`${cx}:${cy}`)?.some(([px, py]) => Math.abs(px - x) < w / 2 + 10 && Math.abs(py - y) < h / 2 + 10)) return true;
      }
    }
    return false;
  };

  // the plates and the occupied points are looked up in the same kind of grid
  const plateGrid = new Map<string, Plate[]>();
  const plateReach = Math.max(0, ...plates.map((p) => Math.max(p.w, p.h) / 2)) + 12;
  for (const p of plates) {
    const key = `${Math.floor(p.x / CELL)}:${Math.floor(p.y / CELL)}`;
    const cell = plateGrid.get(key);
    if (cell) cell.push(p); else plateGrid.set(key, [p]);
  }
  const nearCells = <T,>(cells: Map<string, T[]>, x: number, y: number, reach: number, test: (item: T) => boolean) => {
    for (let cx = Math.floor((x - reach) / CELL); cx <= Math.floor((x + reach) / CELL); cx++) {
      for (let cy = Math.floor((y - reach) / CELL); cy <= Math.floor((y + reach) / CELL); cy++) {
        if (cells.get(`${cx}:${cy}`)?.some(test)) return true;
      }
    }
    return false;
  };
  const occupiedGrid = new Map<string, Point[]>();
  const occupy = (pt: Point) => {
    occupied.push(pt);
    const key = `${Math.floor(pt[0] / CELL)}:${Math.floor(pt[1] / CELL)}`;
    const cell = occupiedGrid.get(key);
    if (cell) cell.push(pt); else occupiedGrid.set(key, [pt]);
  };

  // `leaving`: the first points of a shoot that starts on another shoot stay close to it and are not tested against the shoots
  const blocked = (pts: Point[], radius: number, leaving = 0) => pts.slice(1).some(([x, y], i) =>
    x < 20 || x > W - 20 || y < 20 || y > H - 20 ||
    nearCells(plateGrid, x, y, plateReach, (p) => Math.abs(x - p.x) < p.w / 2 + 12 && Math.abs(y - p.y) < p.h / 2 + 12) ||
    (i >= leaving && nearCells(occupiedGrid, x, y, radius, ([ox, oy]) => (x - ox) ** 2 + (y - oy) ** 2 < radius * radius)));

  const branch = (d: string, width: number) => branches.push({ d, fill: C.branch, stroke: C.branchEdge, strokeWidth: width });
  const leaf = (x: number, y: number, ang: number, s: number) => {
    addPoint([x, y]);
    leaves.push({ d: leafPath(x, y, ang, s), fill: pick(C.leaves), stroke: C.leafEdge, strokeWidth: 1.2 });
  };

  /** A side shoot with its own shoots and leaves; false (nothing drawn) when it would touch something. */
  const twig = (x: number, y: number, ang: number, length: number, width: number, depth: number): boolean => {
    const pts: Point[] = [[x, y]];
    let a = ang;
    const n = Math.max(3, Math.floor(length / 14));
    for (let i = 0; i < n; i++) {
      a += uniform(-18, 18) * Math.PI / 180;
      x += length / n * Math.cos(a);
      y += length / n * Math.sin(a);
      pts.push([x, y]);
    }
    if (blocked(pts, depth < 2 ? 34 : depth < 3 ? 22 : 16, depth > 1 ? 3 : 0)) return false;
    const d = dense(pts);
    dense(pts, 2).forEach(occupy);
    branch(tapered(d, width, Math.max(0.6, width * 0.25)), 0.8);
    // a longer shoot splits into more and longer ones, and those split again (three levels in all)
    let split = 0;
    if (depth < 3 && length > 36) {
      let dir = pick([-1, 1]);
      for (let i = length > 90 ? int(2, 4) : int(1, 3); i > 0; i--) {
        const k = int(Math.floor(d.length / 3), d.length - 2);
        dir = -dir;
        if (twig(d[k][0], d[k][1], a + dir * uniform(35, 65) * Math.PI / 180, length * uniform(0.45, 0.7), width * 0.55, depth + 1)) split++;
      }
    }
    for (let k = Math.floor(d.length / 3); k < d.length; k += int(3, 5)) {
      for (const side of [-1, 1]) {
        if (rnd() < (split ? 0.12 : 0.3)) leaf(d[k][0], d[k][1], angleAt(d, k) + side * uniform(35, 80) * Math.PI / 180, uniform(0.3, 0.5));
      }
    }
    for (const da of [-30, 0, 30]) {
      if (da === 0 || (!split && rnd() < 0.4)) leaf(d[d.length - 1][0], d[d.length - 1][1], a + (da + uniform(-10, 10)) * Math.PI / 180, uniform(0.5, 0.75));
    }
    return true;
  };

  /**
   * A smooth curve from `a` to `b` with a seeded wiggle; it leaves `a` sideways or, with `up`, upwards. The wiggle
   * swings across the chord (an S), a little more for a longer chord but never beyond POSTER_MAX_SWING, so big waves
   * do not appear; a long branch gets longer side shoots instead (see `limb`).
   * A bend that would run over a plate is tried again with less swing.
   */
  const curve = (a: Point, b: Point, up = false): Point[] => {
    const N = 14, [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(dx, dy) || 1;
    const [nx, ny] = [-dy / len, dx / len];
    const phase = uniform(0, Math.PI * 2), freq = uniform(1, 1.8);
    const swing = Math.min(POSTER_MAX_SWING, uniform(0.03, 0.06) * len + 5);
    const build = (amp: number) => {
      const pts: Point[] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, s = t * t * (3 - 2 * t);
        const wob = Math.sin(phase + t * freq * Math.PI * 2) * amp * Math.sin(Math.PI * t) ** 0.8;
        const [x, y] = up ? [a[0] + dx * s, a[1] + dy * t] : [a[0] + dx * t, a[1] + dy * s];
        pts.push([x + nx * wob, y + ny * wob]);
      }
      return pts;
    };
    const overPlate = (pts: Point[]) => pts.slice(2, -2).some(([x, y]) =>
      plates.some((p) => Math.abs(x - p.x) < p.w / 2 + 8 && Math.abs(y - p.y) < p.h / 2 + 8));
    let pts = build(swing);
    for (let k = 1; k <= 4 && overPlate(pts); k++) pts = build(swing * (1 - k * 0.22));
    return pts;
  };

  /** A limb along `pts` of the given thickness class, with side shoots and leaves (unless `shoots` is false). */
  const limb = (pts: Point[], thick: number, extendStart = false, extendEnd = false, shoots = true) => {
    const d = dense(pts);
    dense(pts, 3).forEach(addPoint);
    const path = [...d];
    const extend = (a: Point, b: Point): Point => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [b[0] + (b[0] - a[0]) / len * POSTER_BRANCH_OVERLAP,
        b[1] + (b[1] - a[1]) / len * POSTER_BRANCH_OVERLAP];
    };
    if (extendStart) path.unshift(extend(d[1], d[0]));
    if (extendEnd) path.push(extend(d[d.length - 2], d[d.length - 1]));
    branch(tapered(path, 5 + 2.2 * thick, 2.5 + 1.2 * thick), 1);
    if (!shoots) return;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(2, Math.round(len / 95));
    // the side shoots grow with the branch: 1 at 260 units, proportionally longer on a longer branch (0.8 to 3)
    const reach = Math.min(3, Math.max(0.8, len / 260));
    let side2 = pick([-1, 1]);
    for (let i = 0; i < count; i++) {
      const k = Math.min(Math.max(Math.floor(d.length * (i + 0.5 + uniform(-0.2, 0.2)) / count), 3), d.length - 4);
      side2 = -side2;
      for (let tries = 0; tries < 4; tries++) {
        if (twig(d[k][0], d[k][1], angleAt(d, k) + side2 * uniform(40, 70) * Math.PI / 180, uniform(34, 60) * reach, 3.4 * Math.sqrt(reach), 1)) break;
      }
    }
  };

  /** Whether a box of size w by h around (x, y) touches no plate, limb or leaf. */
  const free = (x: number, y: number, w: number, h: number) =>
    !plates.some((q) => Math.abs(x - q.x) < q.w / 2 + w / 2 + 6 && Math.abs(y - q.y) < q.h / 2 + h / 2 + 6) &&
    !touchesPoint(x, y, w, h);

  return { branches, leaves, occupied, occupy, blocked, twig, curve, limb, free };
}

/** The mark of the program: small, in the strip between the tree and the inner border line, right aligned at the bottom. */
export function addCredit(texts: PosterText[], credit: PosterCredit | undefined, o: ChartOptions, measure: PosterFonts["width"], W: number, H: number) {
  if (!credit) return;
  const size = 20, text = `${TEXTS[o.lang].createdWith} ${credit.version} \u00B7 ${formatDMY(o.lang, credit.date.getDate(), credit.date.getMonth() + 1, credit.date.getFullYear())}`;
  texts.push({ text, x: W - 30 - measure(text, size, false) / 2, y: H + 28, size, bold: false, fill: POSTER_COLORS.place });
}

/** A quiet double border around the whole poster, in the margin outside the tree: straight lines with rounded corners like every box on the poster (the plates, the title and the lists). */
export function posterBorder(W: number, H: number) {
  const C = POSTER_COLORS;
  const margin = 84, inset = 54, gap = 16, cornerR = 24;
  const line = (distance: number, thickness: number) => {
    const o = inset - distance, r = cornerR - distance;
    return roundedRect(W / 2, H / 2, W + 2 * o, H + 2 * o, r) + roundedRect(W / 2, H / 2, W + 2 * (o - thickness), H + 2 * (o - thickness), r - thickness, true);
  };
  const frameShapes: PosterShape[] = [{ d: line(0, 6), fill: C.branchEdge, stroke: null, strokeWidth: 0 },
                                      { d: line(gap, 3), fill: C.branchEdge, stroke: null, strokeWidth: 0 }];
  return { margin, frameShapes };
}

/** The sizes of the plates by generation, shared by the ancestors poster and the descendants poster. */
export function plateKit(o: ChartOptions, measure: PosterFonts["width"], gens: number, scales: readonly number[] = POSTER_PLATE_SCALE) {
  const baseH = 66;
  const baseW = gens <= 4 ? 280 : gens <= 6 ? 230 : 200;
  const scaleOf = (gen: number) => scales[gen - 1] ?? 1;
  const widthOf = (gen: number) => Math.round(baseW * scaleOf(gen) * (gen >= POSTER_SMALL_FROM ? POSTER_SMALL_WIDTH : 1));
  const small = (gen: number) => gen >= POSTER_SMALL_FROM;
  const unitH = (gen: number) => baseH * scaleOf(gen) * (small(gen) ? POSTER_SMALL_HEIGHT : 1);
  const heightOf = (gen: number) => Math.round(unitH(gen));
  // a plate with a places line is only as tall as its lines need (a person without any place stays a plain plate)
  const plateHeight = (p: Person, gen: number) => {
    if (!placesFor(gen, o)) return heightOf(gen);
    const own = plateLines({ id: "", gen, x: 0, y: 0, w: widthOf(gen), h: unitH(gen) }, p, o, measure, unitH(gen), true);
    return Math.max(heightOf(gen), Math.min(Math.round(unitH(gen) * POSTER_PLACES_HEIGHT), Math.ceil(linesHeight(own, 1.15) / PLATE_TEXT_SHARE)));
  };
  // the border and the tag of a plate follow its height
  const lookOf = (gen: number) => scaleOf(gen) * (small(gen) ? 0.7 : 1);
  return { scaleOf, widthOf, small, unitH, heightOf, plateHeight, lookOf };
}

/** The plates of a poster with their texts: one size for the names and one for the dates of a generation, and the "2×" tag of a person who stands on the poster more than once. */
export function drawPlates(plates: Plate[], people: Map<Plate, Person>, appearances: Map<string, number>, o: ChartOptions, measure: PosterFonts["width"], kit: ReturnType<typeof plateKit>) {
  const { unitH, lookOf, small } = kit;
  const C = POSTER_COLORS;
  const shapes: PosterShape[] = [], out: PosterText[] = [];
  const lines = new Map(plates.map((plate) => [plate, plateLines(plate, people.get(plate)!, o, measure, unitH(plate.gen), placesFor(plate.gen, o))]));
  // one size for the names and one for the dates of a generation, so a column reads evenly; a plate whose name wraps
  // to two lines keeps its own smaller sizes and does not pull the single-line plates of its generation down
  const wraps = (ls: Line[]) => ls.filter(([, , bold]) => bold).length > 1;
  const smallest = new Map<string, number>();
  for (const [plate, ls] of lines) {
    if (wraps(ls)) continue;
    for (const [, size, bold, role] of ls) {
      const key = `${plate.gen}${bold}${role}`;
      smallest.set(key, Math.min(smallest.get(key) ?? Infinity, size));
    }
  }
  for (const plate of plates) {
    const sex = people.get(plate)!.sex;
    const [outer, inner] = plateOutline(plate.x, plate.y, plate.w, plate.h, lookOf(plate.gen), small(plate.gen));
    shapes.push({ d: outer, fill: C.branchEdge, stroke: null, strokeWidth: 0 },
                     { d: inner, fill: C.plate, stroke: null, strokeWidth: 0 });
    const own = lines.get(plate)!;
    const same = own.map(([text, size, bold, role, parts]): Line => [text, Math.min(size, smallest.get(`${plate.gen}${bold}${role}`) ?? size), bold, role, parts]);
    out.push(...stack(plate, same, small(plate.gen) ? 1.05 : 1.15, sex === "M" ? C.male : sex === "F" ? C.female : C.ink, measure));
    // a person who stands on the poster more than once (both lines of the family lead to them) carries a small
    // brown tag with the number of places in the top right corner
    const times = appearances.get(plate.id)!;
    if (times > 1) {
      const k = lookOf(plate.gen), w = 24 * k, h = 15 * k, cx = plate.x + plate.w / 2 - 8 * k, cy = plate.y - plate.h / 2 + 2 * k;
      shapes.push({ d: roundedRect(cx, cy, w, h, 3 * k), fill: C.branchEdge, stroke: null, strokeWidth: 0 });
      out.push({ text: `${times}\u00D7`, x: cx, y: cy + h * 0.3, size: h * 0.85, bold: true, fill: C.plate });
    }
  }
  return { shapes, texts: out };
}

/** One line of a plate; `parts` are the pieces of a dates line, each in its own colour. */
type Line = [text: string, size: number, bold: boolean, role?: string, parts?: [text: string, fill: string][]];

/**
 * The name (one line, or two when it is long), the years and, when `withPlaces` is set and the person has a place, the
 * places of one plate, each shrunk until it fits. The birth year is green, the death year brown and the places grey.
 */
function plateLines(plate: Plate, p: Person, o: ChartOptions, measure: PosterFonts["width"], unit: number, withPlaces: boolean): Line[] {
  const C = POSTER_COLORS;
  const name = p.name || "?";
  const noPlaces = { ...o, showPlaces: false };
  // the age is only known (and worth printing) when both years are
  const by = yearOf(p.birth?.date), dy = yearOf(p.death?.date);
  const age = by !== null && dy !== null && dy >= by && dy - by < 130 ? `, ${dy - by} ${TEXTS[o.lang].ageAbbr}` : "";
  const dateParts: [string, string][] = [[formatEvent("birt", p.birth, noPlaces), C.birth], [formatEvent("deat", p.death, noPlaces) && formatEvent("deat", p.death, noPlaces) + age, C.death]];
  const parts = dateParts.filter(([t]) => t);
  const dates = parts.map(([t]) => t).join("  ");
  const home = withPlaces ? residencePlace(p, o) : "";
  const birthPlace = withPlaces && p.birth?.place ? formatPlace(p.birth.place) : "", deathPlace = withPlaces && p.death?.place ? formatPlace(p.death.place) : "";
  const hasPlaces = !!(birthPlace || deathPlace || home);
  const small = plate.gen >= POSTER_SMALL_FROM;
  // the double line of a big plate grows with it and needs more room than the usual margin
  // the places line is longer, so it keeps a wider margin to the border
  const avail = plate.w - (small ? 12 : 18 + 2 * Math.max(0, 6.5 * unit / 66 - 9) + (hasPlaces ? 12 * unit / 66 : 0));
  const minSize = small ? 5.5 : 9;
  const base = unit / 3.4;
  const fit = (text: string, size: number, bold: boolean) => {
    while (size > minSize && measure(text, size, bold) > avail) size -= 0.5;
    return size;
  };
  const lines: Line[] = [];
  let wrappedName = false;
  let nameSize = fit(name, base * 1.25, true);
  if (nameSize >= base * 0.95 || !name.includes(" ")) {
    lines.push([name, nameSize, true]);
  } else {
    // split at the space that makes the two halves most even
    const words = name.split(" ");
    let best = 1, diff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
      if (d < diff) { diff = d; best = i; }
    }
    const halves = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    nameSize = Math.min(fit(halves[0], base, true), fit(halves[1], base, true));
    lines.push([halves[0], nameSize, true], [halves[1], nameSize, true]);
    wrappedName = true;
  }
  if (dates) lines.push([dates, fit(dates, base * (wrappedName ? 0.75 : 0.95), false), false, "dates", parts]);
  if (hasPlaces) {
    // birth, residence and death place, each only when known; the residence only when it differs from the other two
    const mark = (kind: "birt" | "deat" | "resi") => o.labels === "symbols" ? { birt: "*", deat: "\u2020", resi: "\u2302" }[kind] : TEXTS[o.lang].abbr[kind].trim();
    const same = birthPlace && deathPlace && birthPlace.toLowerCase() === deathPlace.toLowerCase();
    const sep = "   ";
    const join = (items: string[]) => items.join(sep);
    let items = [same ? `${mark("birt")}${o.labels === "symbols" ? "" : "/"}${mark("deat")} ${birthPlace}` : birthPlace && `${mark("birt")} ${birthPlace}`,
                 home && `${mark("resi")} ${home}`, same ? "" : deathPlace && `${mark("deat")} ${deathPlace}`].filter(Boolean);
    const size = base * (wrappedName ? 0.7 : PLACES_SIZE);
    // too long: the residence goes first, then the line shrinks a little, then the longest place is cut with an ellipsis
    if (measure(join(items), size, false) > avail && home) items = items.filter((t) => !t.startsWith(mark("resi")));
    let fitted = size;
    while (fitted > size * PLACES_MIN && measure(join(items), fitted, false) > avail) fitted -= 0.5;
    while (measure(join(items), fitted, false) > avail) {
      let k = 0;
      items.forEach((t, i) => { if (t.length > items[k].length) k = i; });
      if (items[k].length <= 6) break;
      items[k] = items[k].slice(0, -2).trimEnd().replace(/…$/, "") + "…";
    }
    lines.push([join(items), fitted, false, "places"]);
  }
  return lines;
}

/** The lines centred one under the other on the plate; the second line of a wrapped name sits closer to the first. */
/** The share of a plate's height the text may fill. */
const PLATE_TEXT_SHARE = 0.8;
/** The height of the lines stacked as `stack` does. */
const linesHeight = (lines: Line[], spacing: number) => lines.reduce((a, [, size, bold], i) => a + size * (bold && lines[i - 1]?.[2] ? spacing - 0.22 : spacing), 0);

function stack(plate: Plate, lines: Line[], spacing: number, nameFill: string, measure: PosterFonts["width"]): PosterText[] {
  const room = plate.h * PLATE_TEXT_SHARE, total = linesHeight(lines, spacing);
  // a plate with a places line is shrunk to fit its height (the other plates keep their sizes)
  if (total > room && lines.some(([, , , role]) => role === "places")) lines = lines.map(([t, size, b, r, parts]): Line => [t, size * room / total, b, r, parts]);
  const heights = lines.map(([, size, bold], i) => size * (bold && lines[i - 1]?.[2] ? spacing - 0.22 : spacing));
  let y = plate.y - heights.reduce((a, b) => a + b, 0) / 2;
  return lines.flatMap(([text, size, bold, role, parts], i) => {
    y += heights[i];
    const at = { y: y - size * 0.22, size, bold };
    if (parts && parts.length > 1) {
      // the birth and the death year each in their colour, the two together centred on the plate
      const gap = measure("  ", size, false), widths = parts.map(([t]) => measure(t, size, false));
      let x = plate.x - (widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1)) / 2;
      return parts.map(([t, fill], k): PosterText => {
        const cx = x + widths[k] / 2;
        x += widths[k] + gap;
        return { ...at, text: t, x: cx, fill };
      });
    }
    return [{ ...at, text, x: plate.x, fill: bold ? nameFill : parts ? parts[0][1] : role === "places" ? POSTER_COLORS.place : POSTER_COLORS.ink }];
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The poster as one SVG document. With `fonts` the text is drawn as outlines, so the file looks the same on any
 * computer; without them it stays text in DejaVu Sans (or a similar font of the viewer).
 */
export function posterSvg(poster: Poster, fonts?: PosterFonts): string {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-poster.margin} ${-poster.margin} ${poster.width + 2 * poster.margin} ${poster.height + 2 * poster.margin}" width="${poster.width + 2 * poster.margin}" height="${poster.height + 2 * poster.margin}">`,
    `<title>${esc(poster.title)}</title>`];
  for (const s of poster.shapes) {
    out.push(`<path d="${s.d}"${s.fill ? ` fill="${s.fill}"` : ' fill="none"'}${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"` : ""}/>`);
  }
  if (fonts) {
    // every letter is drawn once in <defs> and placed wherever it is used, which keeps the file a fraction of the size
    const body: string[] = [], ids = new Map<string, number>();
    for (const t of poster.texts) {
      body.push(`<g fill="${t.fill}"><title>${esc(t.text)}</title>`);
      for (const g of fonts.place(t.text, t.size, t.bold, t.x, t.y)) {
        if (!ids.has(g.id)) ids.set(g.id, ids.size);
        body.push(`<use href="#g${ids.get(g.id)}" transform="matrix(${scale(g.scale)} 0 0 ${scale(-g.scale)} ${num(g.x)} ${num(g.y)})"/>`);
      }
      body.push("</g>");
    }
    out.push("<defs>", ...[...ids].map(([id, n]) => `<path id="g${n}" d="${fonts.glyph(id)}"/>`), "</defs>", "<g>", ...body);
  } else {
    out.push('<g font-family="DejaVu Sans, Verdana, Arial, sans-serif" text-anchor="middle">');
    for (const t of poster.texts) {
      out.push(`<text x="${num(t.x)}" y="${num(t.y)}" font-size="${t.size}"${t.bold ? ' font-weight="700"' : ""} fill="${t.fill}">${esc(t.text)}</text>`);
    }
  }
  out.push("</g></svg>");
  return out.join("\n");
}

type MarrLine = { symbol: "rings" | "children"; text: string };

/** The symbol before a marriage line: two interlocked rings, or two small figures; `left` is its left edge. */
export function symbolShapes(symbol: MarrLine["symbol"], left: number, cy: number, s: number): PosterShape[] {
  const gold = POSTER_COLORS.marriage;
  const circle = (x: number, y: number, r: number) => `M${num(x - r)},${num(y)}A${num(r)},${num(r)} 0 1 0 ${num(x + r)},${num(y)}A${num(r)},${num(r)} 0 1 0 ${num(x - r)},${num(y)}Z`;
  if (symbol === "rings") {
    const r = 0.31 * s, x0 = left + 0.05 * s + r;
    return [x0, x0 + 0.4 * s].map((x) => ({ d: circle(x, cy - 0.03 * s, r), fill: null, stroke: gold, strokeWidth: 0.1 * s }));
  }
  // a head over a rounded body, the second figure smaller and a little lower
  const figure = (x: number, y: number, k: number) => [
    circle(x, y - 0.3 * k, 0.21 * k),
    `M${num(x - 0.3 * k)},${num(y + 0.45 * k)}Q${num(x - 0.3 * k)},${num(y - 0.02 * k)} ${num(x)},${num(y - 0.02 * k)}Q${num(x + 0.3 * k)},${num(y - 0.02 * k)} ${num(x + 0.3 * k)},${num(y + 0.45 * k)}Z`,
  ];
  const cx = left + 0.57 * s;
  return [...figure(cx - 0.3 * s, cy, s * 0.9), ...figure(cx + 0.35 * s, cy + 0.08 * s, s * 0.72)].map((d) => ({ d, fill: gold, stroke: null, strokeWidth: 0 }));
}
