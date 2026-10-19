/**
 * Tree poster: the ancestors of one person as a decorative wall chart. The person stands in the centre below the parents, the father's line unfolds to the left and the mother's to the right, one generation per column. Name plates have exact
 * positions; the branches between them are drawn from a seeded random generator, so one seed always gives the same
 * tree and every seed a different one.
 *
 * The result is a flat list of shapes (SVG path data with fill and stroke) and text lines, written out as SVG by
 * `posterSvg`; other outputs can draw the same list.
 */

import type { GedcomData, Person } from "./gedcom";
import { formatDate, formatEvent, type ChartOptions } from "./format";
import { normalize } from "./chart";
import { TEXTS } from "./texts";
import type { PosterFonts } from "./posterFont";

export const POSTER_MIN_GENERATIONS = 3;
export const POSTER_MAX_GENERATIONS = 10;
/** what 0 ("all") draws */
export const POSTER_BASE_GENERATIONS = 7;
/** Plate size by generation (person, parents, grandparents, great-grandparents): the people the person may still have
 * known stand out; every further generation is 100 %. */
/** The most a branch swings sideways from the straight line between its ends, in drawing units. */
const POSTER_MAX_SWING = 24;
export const POSTER_PLATE_SCALE = [2, 1.75, 1.5, 1.25];

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

export const POSTER_COLORS = {
  paper: "#efe3cc", plate: "#fffcf3", male: "#2f5f9e", female: "#a8322a", ink: "#2a1d12", line: "#3a2a1a", branch: "#6b4626", branchEdge: "#4a2f18",
  leafEdge: "#2f4a1c", leaves: ["#4f7a2e", "#5d8a34", "#3f6b28", "#6b9a3c", "#4a7a3a"],
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

type Point = [number, number];

const num = (n: number) => String(Math.round(n * 10) / 10);

/** Width of a text as the layout assumes it without the poster fonts; the real fonts are narrower, so a line never overflows its plate. */
export const textWidth = (text: string, size: number, bold: boolean) => text.length * size * (bold ? 0.62 : 0.56);

/** Points of a Catmull-Rom spline through `pts`, `k` per segment. */
function dense(pts: Point[], k = 6): Point[] {
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

/** A closed Catmull-Rom curve through `pts`. */
function closedDense(pts: Point[], k = 6): Point[] {
  const n = pts.length;
  return dense([pts[n - 1], ...pts, pts[0], pts[1]], k).slice(k, k * (n + 1) + 1);
}

/**
 * A hand-cut plate: edges that are slightly uneven and a border whose width changes along the way. Returns the outer
 * shape (drawn in the ink colour) and the inner shape (drawn over it in the paper colour) around the centre (cx, cy); the border grows with the plate (`scale`).
 */
function plateOutline(rnd: () => number, cx: number, cy: number, w: number, h: number, scale = 1): [string, string] {
  const u = (a: number) => (rnd() * 2 - 1) * a;
  const base = 2 + rnd();
  const border = () => Math.max(1.3, base + u(1.1)) * scale;
  const wob = h * 0.022;
  const xs = (n: number) => Array.from({ length: n }, (_, i) => w * (i + 0.5) / n);
  const ys = (n: number) => Array.from({ length: n }, (_, i) => h * (i + 0.5) / n);
  // clockwise from the top left corner: [x, y, inward x, inward y]
  const seq: [number, number, number, number][] = [[u(wob), u(wob), 1, 1]];
  for (const x of xs(4)) seq.push([x, u(wob * 1.3) + h * 0.01 * Math.sin(x / w * 6), 0, 1]);
  seq.push([w + u(wob), u(wob), -1, 1]);
  for (const y of ys(2)) seq.push([w + u(wob * 1.3), y, -1, 0]);
  seq.push([w + u(wob), h + u(wob), -1, -1]);
  for (const x of xs(4).reverse()) seq.push([x, h + u(wob * 1.3) + h * 0.015 * Math.sin(x / w * 5 + 1), 0, -1]);
  seq.push([u(wob), h + u(wob), 1, -1]);
  for (const y of ys(2).reverse()) seq.push([u(wob * 1.3), y, 1, 0]);
  const outer: Point[] = [], inner: Point[] = [];
  for (const [x, y, nx, ny] of seq) {
    const t = border();
    outer.push([cx - w / 2 + x, cy - h / 2 + y]);
    inner.push([cx - w / 2 + x + nx * t, cy - h / 2 + y + ny * t]);
  }
  const path = (pts: Point[]) => "M" + closedDense(pts, 5).map(([x, y]) => `${num(x)},${num(y)}`).join("L") + "Z";
  return [path(outer), path(inner)];
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

interface Plate { id: string; gen: number; x: number; y: number; w: number; h: number }

/** The ancestors of `rootId` as a poster; `options.generations` generations including the person (0 = seven); the poster is as wide as the generations need and as high as the people need. */
export function buildPoster(data: GedcomData, rootId: string, options: Partial<ChartOptions>, fonts?: PosterFonts): Poster {
  const o = normalize(options);
  const measure = fonts ? fonts.width : textWidth;
  const root = data.people[rootId];
  if (!root) throw new Error(`Person ${rootId} does not exist.`);
  const gens = Math.min(POSTER_MAX_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(o.generations) || POSTER_BASE_GENERATIONS));
  const seed = posterSeed(rootId, o.posterSeed);
  const rnd = random(seed);
  const uniform = (a: number, b: number) => a + (b - a) * rnd();
  const int = (a: number, b: number) => Math.floor(uniform(a, b + 1));
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];

  // ------------------------------------------------------------ plates
  // the plates keep one size; the columns are one generation each and the drawing is as high as the people need
  // The closest generations, whom the person may still have known, get bigger plates (see POSTER_PLATE_SCALE).
  const baseH = 66, rowGap = 24, minGap = 70;
  const baseW = gens <= 4 ? 280 : gens <= 6 ? 230 : 200;
  const scaleOf = (gen: number) => POSTER_PLATE_SCALE[gen - 1] ?? 1;
  const widthOf = (gen: number) => Math.round(baseW * scaleOf(gen));
  const heightOf = (gen: number) => Math.round(baseH * scaleOf(gen));
  // The year of a marriage is a small brown text where the branches of the two parents meet; its size follows the
  // generation of the child, and the gap between the child's column and the parents' is wide enough for it.
  const marrSize = (gen: number) => 12 * scaleOf(gen);
  const marrText = (pid: string | null): string => {
    const f = pid && data.people[pid]?.famc.length ? data.families[data.people[pid].famc[0]] : null;
    const date = f?.marriage ? formatDate(f.marriage.date, o.dates === "full", o.lang) : "";
    return date ? `\u26AD ${date}` : "";
  };
  const needed = new Map<number, number>();
  const survey = (pid: string | null, gen: number) => {
    const f = pid && gen < gens && data.people[pid]?.famc.length ? data.families[data.people[pid].famc[0]] : null;
    if (!f || !f.husb || !f.wife || !data.people[f.husb] || !data.people[f.wife]) return;
    const text = marrText(pid);
    if (text && gen > 1) needed.set(gen, Math.max(needed.get(gen) ?? 0, measure(text, marrSize(gen), false)));
    survey(f.husb, gen + 1);
    survey(f.wife, gen + 1);
  };
  survey(rootId, 1);
  const gapAfter = (gen: number) => Math.max(minGap, Math.ceil((needed.get(gen) ?? 0) + 80));
  // column centres, measured from the middle line: the first column starts 40 away from it
  const colX = new Map<number, number>();
  let edge = 40;
  for (let g = 2; g <= gens; g++) {
    colX.set(g, edge + widthOf(g) / 2);
    edge += widthOf(g) + gapAfter(g);
  }
  const W = Math.max(1400, Math.round(2 * (edge - gapAfter(gens) + 20)));
  const top = 190, bottom = 70;
  const plates: Plate[] = [];
  const kids = new Map<Plate, Plate[]>();
  const people = new Map<Plate, Person>();

  // y is set below, once the packing of the people is known
  const place = (pid: string | null, gen: number, side: -1 | 1): Plate | null => {
    const p = pid ? data.people[pid] : null;
    if (!p) return null;
    const plate: Plate = { id: pid!, gen, w: widthOf(gen), h: heightOf(gen), x: W / 2 + side * colX.get(gen)!, y: 0 };
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

  const rootPlate: Plate = { id: rootId, gen: 1, x: W / 2, y: 0, w: widthOf(1), h: heightOf(1) };
  plates.push(rootPlate);
  people.set(rootPlate, root);
  const fam = root.famc.length ? data.families[root.famc[0]] : null;
  const rootKids: [Plate, -1 | 1][] = [];
  if (fam && gens > 1) {
    const f = place(fam.husb, 2, -1), m = place(fam.wife, 2, 1);
    if (f) rootKids.push([f, -1]);
    if (m) rootKids.push([m, 1]);
  }

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
    for (let i = 0; i < Math.min(a.length, b.length); i++) delta = Math.max(delta, a[i][1] - b[i][0] + rowGap);
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
  const rootY = levelY + heightOf(2) / 2 + 140 + rootPlate.h / 2;
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
  const branches: PosterShape[] = [], leaves: PosterShape[] = [];
  const occupied: Point[] = [];

  const limbPts: Point[] = [], leafPts: Point[] = [];

  // The marriage years: a small brown text where the branches of the two parents meet, in the gap between the
  // person and the parents (beside the fork for the main person). The room is kept free of shoots before they grow;
  // afterwards the spot closest to the usual one that touches no plate, branch, shoot or leaf is taken.
  const labels = plates.flatMap((plate) => {
    if ((plate === rootPlate ? rootKids : kids.get(plate) || []).length !== 2) return [];
    const text = marrText(plate.id);
    if (!text) return [];
    const size = marrSize(plate.gen), width = measure(text, size, false), height = size * 1.1;
    let x: number, y: number;
    if (plate === rootPlate) {
      x = plate.x + 30 + width / 2;
      y = Math.max(...rootKids.map(([q]) => q.y + q.h / 2)) + 70 + 40;
    } else {
      const side = Math.sign(plate.x - W / 2);
      x = plate.x + side * (plate.w / 2 + gapAfter(plate.gen) * 0.6);
      y = plate.y;
    }
    for (let px = x - width / 2; px <= x + width / 2; px += 6) {
      for (let py = y - height / 2; py <= y + height / 2; py += 6) occupied.push([px, py]);
    }
    return [{ text, size, width, height, x, y }];
  });
  const reserved = occupied.length;


  const blocked = (pts: Point[], radius: number) => pts.slice(1).some(([x, y]) =>
    x < 20 || x > W - 20 || y < 20 || y > H - 20 ||
    plates.some((p) => Math.abs(x - p.x) < p.w / 2 + 12 && Math.abs(y - p.y) < p.h / 2 + 12) ||
    occupied.some(([ox, oy]) => (x - ox) ** 2 + (y - oy) ** 2 < radius * radius));

  const branch = (d: string, width: number) => branches.push({ d, fill: C.branch, stroke: C.branchEdge, strokeWidth: width });
  const leaf = (x: number, y: number, ang: number, s: number) => {
    leafPts.push([x, y]);
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
    if (blocked(pts, depth < 2 ? 34 : 20)) return false;
    const d = dense(pts);
    occupied.push(...dense(pts, 2));
    branch(tapered(d, width, Math.max(0.6, width * 0.25)), 0.8);
    if (depth < 2) {
      for (let i = int(1, 3); i > 0; i--) {
        const k = int(Math.floor(d.length / 3), d.length - 2);
        twig(d[k][0], d[k][1], a + pick([-1, 1]) * uniform(35, 65) * Math.PI / 180, length * uniform(0.45, 0.7), width * 0.5, depth + 1);
      }
    }
    for (let k = Math.floor(d.length / 3); k < d.length; k += int(3, 5)) {
      for (const side of [-1, 1]) {
        if (rnd() < 0.4) leaf(d[k][0], d[k][1], angleAt(d, k) + side * uniform(35, 80) * Math.PI / 180, uniform(0.3, 0.5));
      }
    }
    for (const da of [-30, 0, 30]) {
      if (rnd() < 0.55 || da === 0) leaf(d[d.length - 1][0], d[d.length - 1][1], a + (da + uniform(-10, 10)) * Math.PI / 180, uniform(0.5, 0.75));
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

  /** A limb along `pts` of the given thickness class, with side shoots and leaves. */
  const limb = (pts: Point[], thick: number) => {
    const d = dense(pts);
    limbPts.push(...dense(pts, 3));
    branch(tapered(d, 5 + 2.2 * thick, 2.5 + 1.2 * thick), 1);
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(2, Math.round(len / 95));
    // the side shoots grow with the branch: 1 at 260 units, proportionally longer on a longer branch (0.8 to 2)
    const reach = Math.min(2, Math.max(0.8, len / 260));
    let side2 = pick([-1, 1]);
    for (let i = 0; i < count; i++) {
      const k = Math.min(Math.max(Math.floor(d.length * (i + 0.5 + uniform(-0.2, 0.2)) / count), 3), d.length - 4);
      side2 = -side2;
      for (let tries = 0; tries < 4; tries++) {
        if (twig(d[k][0], d[k][1], angleAt(d, k) + side2 * uniform(40, 70) * Math.PI / 180, uniform(34, 60) * reach, 3.4, 1)) break;
      }
    }
  };

  const grow = (child: Plate, parent: Plate, side: -1 | 1) => {
    limb(curve([child.x + side * child.w / 2, child.y], [parent.x - side * parent.w / 2, parent.y]), gens - parent.gen);
    for (const q of kids.get(parent) || []) grow(parent, q, side);
  };
  // one limb rises from the person and splits in two, one for each parent
  if (rootKids.length) {
    const lowest = Math.max(...rootKids.map(([plate]) => plate.y + plate.h / 2));
    const fork: Point = [rootPlate.x, lowest + 70];
    limb(curve([rootPlate.x, rootPlate.y - rootPlate.h / 2], fork, true), gens - 1);
    for (const [plate, side] of rootKids) {
      limb(curve(fork, [plate.x - side * plate.w * 0.2, plate.y + plate.h / 2], true), gens - 2);
      for (const q of kids.get(plate) || []) grow(plate, q, side);
    }
  }

  const marriages: PosterText[] = [];
  const free = (x: number, y: number, w: number, h: number) =>
    !plates.some((q) => Math.abs(x - q.x) < q.w / 2 + w / 2 + 6 && Math.abs(y - q.y) < q.h / 2 + h / 2 + 6) &&
    !limbPts.some(([px, py]) => Math.abs(px - x) < w / 2 + 10 && Math.abs(py - y) < h / 2 + 10) &&
    !leafPts.some(([px, py]) => Math.abs(px - x) < w / 2 + 10 && Math.abs(py - y) < h / 2 + 10);
  for (const label of labels) {
    const { text, size, width, height, x, y } = label;
    const near: [number, number, number][] = [];
    for (let dx = -40; dx <= 40; dx += 4) for (let dy = -30; dy <= 30; dy += 4) near.push([x + dx, y + dy, Math.abs(dx) + 2 * Math.abs(dy)]);
    near.sort((a, b) => a[2] - b[2]);
    const spot = near.find(([px, py]) => free(px, py, width, height) && !occupied.slice(reserved).some(([ox, oy]) =>
      Math.abs(ox - px) < width / 2 + 6 && Math.abs(oy - py) < height / 2 + 6)) ?? [x, y];
    marriages.push({ text, x: spot[0], y: spot[1] + size * 0.3, size, bold: false, fill: C.branch });
  }

  // ------------------------------------------------------------ plates and texts
  const texts: PosterText[] = [];
  const plateShapes: PosterShape[] = [];
  const lines = new Map(plates.map((plate) => [plate, plateLines(plate, people.get(plate)!, o, measure)]));
  // one size for the names and one for the dates of a generation, so a column reads evenly
  const smallest = new Map<string, number>();
  for (const [plate, ls] of lines) {
    for (const [, size, bold] of ls) {
      const key = `${plate.gen}${bold}`;
      smallest.set(key, Math.min(smallest.get(key) ?? Infinity, size));
    }
  }
  for (const plate of plates) {
    const sex = people.get(plate)!.sex;
    const [outer, inner] = plateOutline(rnd, plate.x, plate.y, plate.w, plate.h, scaleOf(plate.gen));
    plateShapes.push({ d: outer, fill: C.branchEdge, stroke: null, strokeWidth: 0 },
                     { d: inner, fill: C.plate, stroke: null, strokeWidth: 0 });
    const same = lines.get(plate)!.map(([text, , bold]): Line => [text, smallest.get(`${plate.gen}${bold}`)!, bold]);
    texts.push(...stack(plate, same, sex === "M" ? C.male : sex === "F" ? C.female : C.ink));
  }

  const title = o.title || TEXTS[o.lang].title.replace("{name}", root.name || "?");
  texts.push(...marriages, { text: title, x: W / 2, y: 92, size: 58, bold: true, fill: C.ink });

  shapes.push({ d: `M0,0L${W},0L${W},${H}L0,${H}Z`, fill: C.paper, stroke: null, strokeWidth: 0 },
              ...branches, ...leaves, ...plateShapes);
  return { width: W, height: H, shapes, texts, generations: gens, people: plates.length, plates: plates.map(({ id, gen, x, y, w, h }) => ({ id, gen, x, y, w, h })), seed, title };
}

type Line = [text: string, size: number, bold: boolean];

/** The name (one line, or two when it is long) and the dates of one plate, each shrunk until it fits. */
function plateLines(plate: Plate, p: Person, o: ChartOptions, measure: PosterFonts["width"]): Line[] {
  const name = p.name || "?";
  const dates = [formatEvent("birt", p.birth, { ...o, places: "none" }), formatEvent("deat", p.death, { ...o, places: "none" })]
    .filter(Boolean).join("  ");
  const avail = plate.w - 18;
  const base = plate.h / 3.4;
  const fit = (text: string, size: number, bold: boolean) => {
    while (size > 9 && measure(text, size, bold) > avail) size -= 0.5;
    return size;
  };
  const lines: Line[] = [];
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
    nameSize = Math.min(fit(halves[0], base * 1.1, true), fit(halves[1], base * 1.1, true));
    lines.push([halves[0], nameSize, true], [halves[1], nameSize, true]);
  }
  if (dates) lines.push([dates, fit(dates, base * 0.95, false), false]);
  return lines;
}

/** The lines centred one under the other on the plate. */
function stack(plate: Plate, lines: Line[], nameFill: string): PosterText[] {
  const heights = lines.map(([, size]) => size * 1.15);
  let y = plate.y - heights.reduce((a, b) => a + b, 0) / 2;
  return lines.map(([text, size, bold], i) => {
    y += heights[i];
    return { text, x: plate.x, y: y - size * 0.22, size, bold, fill: bold ? nameFill : POSTER_COLORS.ink };
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The poster as one SVG document. With `fonts` the text is drawn as outlines, so the file looks the same on any
 * computer; without them it stays text in DejaVu Sans (or a similar font of the viewer).
 */
export function posterSvg(poster: Poster, fonts?: PosterFonts): string {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${poster.width} ${poster.height}" width="${poster.width}" height="${poster.height}">`,
    `<title>${esc(poster.title)}</title>`];
  for (const s of poster.shapes) {
    out.push(`<path d="${s.d}"${s.fill ? ` fill="${s.fill}"` : ' fill="none"'}${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"` : ""}/>`);
  }
  if (fonts) {
    out.push("<g>");
    for (const t of poster.texts) {
      out.push(`<path d="${fonts.outline(t.text, t.size, t.bold, t.x, t.y)}" fill="${t.fill}"><title>${esc(t.text)}</title></path>`);
    }
  } else {
    out.push('<g font-family="DejaVu Sans, Verdana, Arial, sans-serif" text-anchor="middle">');
    for (const t of poster.texts) {
      out.push(`<text x="${num(t.x)}" y="${num(t.y)}" font-size="${t.size}"${t.bold ? ' font-weight="700"' : ""} fill="${t.fill}">${esc(t.text)}</text>`);
    }
  }
  out.push("</g></svg>");
  return out.join("\n");
}
