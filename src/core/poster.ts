/**
 * Tree poster: the ancestors of one person as a decorative wall chart. The person stands at the bottom centre, the
 * father's line unfolds to the left and the mother's to the right, one generation per column. Name plates have exact
 * positions; the branches between them are drawn from a seeded random generator, so one seed always gives the same
 * tree and every seed a different one.
 *
 * The result is a flat list of shapes (SVG path data with fill and stroke) and text lines, written out as SVG by
 * `posterSvg`; other outputs can draw the same list.
 */

import type { GedcomData, Person } from "./gedcom";
import { formatEvent, type ChartOptions } from "./format";
import { normalize } from "./chart";
import { TEXTS } from "./texts";

/** The drawing is as wide as it is high times the A-series ratio, so it prints on any A paper without cropping. */
const RATIO = Math.SQRT2;

export const POSTER_MIN_GENERATIONS = 2;
export const POSTER_MAX_GENERATIONS = 7;

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
  seed: number;
  title: string;
}

export const POSTER_COLORS = {
  paper: "#efe3cc", plate: "#f7efdf", ink: "#2a1d12", line: "#3a2a1a", branch: "#6b4626", branchEdge: "#4a2f18",
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

const W = 3000;
const num = (n: number) => String(Math.round(n * 10) / 10);

/** Width of a text as the layout assumes it; the real fonts are narrower, so a line never overflows its plate. */
export const textWidth = (text: string, size: number, bold: boolean) => text.length * size * (bold ? 0.62 : 0.56);

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = r * 0.5523;
  const [x2, y2] = [x + w, y + h];
  return `M${num(x + r)},${num(y)}L${num(x2 - r)},${num(y)}C${num(x2 - r + k)},${num(y)} ${num(x2)},${num(y + r - k)} ${num(x2)},${num(y + r)}` +
    `L${num(x2)},${num(y2 - r)}C${num(x2)},${num(y2 - r + k)} ${num(x2 - r + k)},${num(y2)} ${num(x2 - r)},${num(y2)}` +
    `L${num(x + r)},${num(y2)}C${num(x + r - k)},${num(y2)} ${num(x)},${num(y2 - r + k)} ${num(x)},${num(y2 - r)}` +
    `L${num(x)},${num(y + r)}C${num(x)},${num(y + r - k)} ${num(x + r - k)},${num(y)} ${num(x + r)},${num(y)}Z`;
}

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

/** The ancestors of `rootId` as a poster; `options.generations` generations including the person (0 = as many as fit, at most seven). */
export function buildPoster(data: GedcomData, rootId: string, options: Partial<ChartOptions>): Poster {
  const o = normalize(options);
  const root = data.people[rootId];
  if (!root) throw new Error(`Person ${rootId} does not exist.`);
  const gens = Math.min(POSTER_MAX_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(o.generations) || POSTER_MAX_GENERATIONS));
  const H = Math.round(W / RATIO);
  const seed = posterSeed(rootId, o.posterSeed);
  const rnd = random(seed);
  const uniform = (a: number, b: number) => a + (b - a) * rnd();
  const int = (a: number, b: number) => Math.floor(uniform(a, b + 1));
  const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];

  // ------------------------------------------------------------ plates
  // each side has 2^(gens-2) rows at the outermost generation; a plate sits in the middle of its two parents
  const rows = 2 ** Math.max(0, gens - 2);
  const top = 190, bottom = 150;
  const rowH = (H - top - bottom) / rows;
  const plateH = Math.min(78, rowH * 0.78);
  const rootW = 400;
  // the columns share the half width between the person and the edge, with at least 50 units between plates
  const plateW = Math.min(280, (W / 2 - 80 - rootW / 2 - 50 * (gens - 2)) / (gens - 1));
  const firstX = rootW / 2 + 60 + plateW / 2, lastX = W / 2 - 20 - plateW / 2;
  const colStep = gens > 2 ? (lastX - firstX) / (gens - 2) : 0;
  const plates: Plate[] = [];
  const kids = new Map<Plate, Plate[]>();
  const people = new Map<Plate, Person>();

  const place = (pid: string | null, gen: number, side: -1 | 1, index: number): Plate | null => {
    const p = pid ? data.people[pid] : null;
    if (!p) return null;
    const span = rows / 2 ** (gen - 2);
    const plate: Plate = {
      id: pid!, gen, w: plateW, h: plateH,
      x: W / 2 + side * (firstX + (gen - 2) * colStep), y: top + (index + 0.5) * span * rowH,
    };
    plates.push(plate);
    people.set(plate, p);
    const fam = p.famc.length ? data.families[p.famc[0]] : null;
    const next: Plate[] = [];
    if (gen < gens && fam) {
      for (const [k, parent] of [fam.husb, fam.wife].entries()) {
        const q = place(parent, gen + 1, side, index * 2 + k);
        if (q) next.push(q);
      }
    }
    kids.set(plate, next);
    return plate;
  };

  const rootPlate: Plate = { id: rootId, gen: 1, x: W / 2, y: H - bottom + 20, w: rootW, h: Math.min(96, plateH * 1.25) };
  plates.push(rootPlate);
  people.set(rootPlate, root);
  const fam = root.famc.length ? data.families[root.famc[0]] : null;
  const rootKids: [Plate, -1 | 1][] = [];
  if (fam && gens > 1) {
    const f = place(fam.husb, 2, -1, 0), m = place(fam.wife, 2, 1, 0);
    if (f) rootKids.push([f, -1]);
    if (m) rootKids.push([m, 1]);
  }

  // ------------------------------------------------------------ branches
  const shapes: PosterShape[] = [];
  const C = POSTER_COLORS;
  const branches: PosterShape[] = [], leaves: PosterShape[] = [];
  const occupied: Point[] = [];

  const blocked = (pts: Point[], radius: number) => pts.slice(1).some(([x, y]) =>
    x < 20 || x > W - 20 || y < 20 || y > H - 20 ||
    plates.some((p) => Math.abs(x - p.x) < p.w / 2 + 12 && Math.abs(y - p.y) < p.h / 2 + 12) ||
    occupied.some(([ox, oy]) => (x - ox) ** 2 + (y - oy) ** 2 < radius * radius));

  const branch = (d: string, width: number) => branches.push({ d, fill: C.branch, stroke: C.branchEdge, strokeWidth: width });
  const leaf = (x: number, y: number, ang: number, s: number) =>
    leaves.push({ d: leafPath(x, y, ang, s), fill: pick(C.leaves), stroke: C.leafEdge, strokeWidth: 1.2 });

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

  /** A smooth curve from `a` to `b` with a seeded wiggle; it leaves `a` sideways or, with `up`, upwards. */
  const curve = (a: Point, b: Point, up: boolean): Point[] => {
    const N = 14, [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(dx, dy) || 1;
    const phase = uniform(0, Math.PI * 2), freq = uniform(1, 1.8), amp = uniform(0.03, 0.07) * len + 6;
    const pts: Point[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, s = t * t * (3 - 2 * t);
      const wob = Math.sin(phase + t * freq * Math.PI * 2) * amp * Math.sin(Math.PI * t) ** 0.8;
      pts.push(up ? [a[0] + dx * s + wob, a[1] + dy * t] : [a[0] + dx * t, a[1] + dy * s + wob]);
    }
    return pts;
  };

  const grow = (child: Plate, parent: Plate, side: -1 | 1, trunk: boolean) => {
    const from: Point = trunk ? [child.x + side * child.w * 0.4, child.y - child.h / 2] : [child.x + side * child.w / 2, child.y];
    const to: Point = [parent.x - side * parent.w / 2, parent.y];
    const pts = curve(from, to, trunk);
    const thick = gens - parent.gen;
    const d = dense(pts);
    branch(tapered(d, 5 + 2.2 * thick, 2.5 + 1.2 * thick), 1);
    const count = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 95));
    let side2 = pick([-1, 1]);
    for (let i = 0; i < count; i++) {
      const k = Math.min(Math.max(Math.floor(d.length * (i + 0.5 + uniform(-0.2, 0.2)) / count), 3), d.length - 4);
      side2 = -side2;
      for (let tries = 0; tries < 4; tries++) {
        if (twig(d[k][0], d[k][1], angleAt(d, k) + side2 * uniform(40, 70) * Math.PI / 180, uniform(34, 60), 3.4, 1)) break;
      }
    }
    for (const q of kids.get(parent) || []) grow(parent, q, side, false);
  };
  for (const [plate, side] of rootKids) grow(rootPlate, plate, side, true);

  // ------------------------------------------------------------ plates and texts
  const texts: PosterText[] = [];
  const plateShapes: PosterShape[] = [];
  const lines = new Map(plates.map((plate) => [plate, plateLines(plate, people.get(plate)!, o)]));
  // one size for the names and one for the dates of a generation, so a column reads evenly
  const smallest = new Map<string, number>();
  for (const [plate, ls] of lines) {
    for (const [, size, bold] of ls) {
      const key = `${plate.gen}${bold}`;
      smallest.set(key, Math.min(smallest.get(key) ?? Infinity, size));
    }
  }
  for (const plate of plates) {
    plateShapes.push({ d: roundedRect(plate.x - plate.w / 2, plate.y - plate.h / 2, plate.w, plate.h, 6),
                       fill: C.plate, stroke: C.line, strokeWidth: plate === rootPlate ? 3 : 2.2 });
    const same = lines.get(plate)!.map(([text, , bold]): Line => [text, smallest.get(`${plate.gen}${bold}`)!, bold]);
    texts.push(...stack(plate, same));
  }

  const title = o.title || TEXTS[o.lang].title.replace("{name}", root.name || "?");
  texts.push({ text: title, x: W / 2, y: 92, size: 58, bold: true, fill: C.ink });

  shapes.push({ d: `M0,0L${W},0L${W},${H}L0,${H}Z`, fill: C.paper, stroke: null, strokeWidth: 0 },
              ...branches, ...leaves, ...plateShapes);
  return { width: W, height: H, shapes, texts, generations: gens, people: plates.length, seed, title };
}

type Line = [text: string, size: number, bold: boolean];

/** The name (one line, or two when it is long) and the dates of one plate, each shrunk until it fits. */
function plateLines(plate: Plate, p: Person, o: ChartOptions): Line[] {
  const name = p.name || "?";
  const dates = [formatEvent("birt", p.birth, { ...o, places: "none" }), formatEvent("deat", p.death, { ...o, places: "none" })]
    .filter(Boolean).join("  ");
  const avail = plate.w - 18;
  const base = plate.h / 3.4;
  const fit = (text: string, size: number, bold: boolean) => {
    while (size > 9 && textWidth(text, size, bold) > avail) size -= 0.5;
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
function stack(plate: Plate, lines: Line[]): PosterText[] {
  const heights = lines.map(([, size]) => size * 1.15);
  let y = plate.y - heights.reduce((a, b) => a + b, 0) / 2;
  return lines.map(([text, size, bold], i) => {
    y += heights[i];
    return { text, x: plate.x, y: y - size * 0.22, size, bold, fill: POSTER_COLORS.ink };
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The poster as one SVG document. The text keeps its font family, so a viewer without DejaVu Sans uses a similar one. */
export function posterSvg(poster: Poster): string {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${poster.width} ${poster.height}" width="${poster.width}" height="${poster.height}">`,
    `<title>${esc(poster.title)}</title>`];
  for (const s of poster.shapes) {
    out.push(`<path d="${s.d}"${s.fill ? ` fill="${s.fill}"` : ' fill="none"'}${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linejoin="round"` : ""}/>`);
  }
  out.push('<g font-family="DejaVu Sans, Verdana, Arial, sans-serif" text-anchor="middle">');
  for (const t of poster.texts) {
    out.push(`<text x="${num(t.x)}" y="${num(t.y)}" font-size="${t.size}"${t.bold ? ' font-weight="700"' : ""} fill="${t.fill}">${esc(t.text)}</text>`);
  }
  out.push("</g></svg>");
  return out.join("\n");
}
