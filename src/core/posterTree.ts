/**
 * The apple tree in the middle of the ancestor poster (preview): a trunk with roots, a pyramid-shaped crown of tiered
 * limbs with side twigs, leaves and apples, all grown from a seeded generator inside a box. Each part is its own
 * function (trunk, limb, leaf, apple) and returns plain poster shapes in the palette; `appleTree` only composes them.
 * The geometry follows a standalone SVG generator (width, height, number of apples, leaf density) and scales with the
 * box: `s` is the size of the box relative to a 530 by 530 tree.
 */

import { PALETTE } from "./palette";
import { Point, PosterShape, leafPath, num, tapered } from "./poster";

export interface TreeBox {
  /** left, top, width and height of the box the tree fills; the ground line is its bottom edge */
  x: number; y: number; w: number; h: number;
  /** where the trunk ends and the crown starts, as a fraction of the height measured from the top */
  trunkTop: number;
}

export interface TreeOptions { apples: number; density: number }

const BARK = PALETTE.chocolate, BARK_EDGE = PALETTE.espresso, LEAVES = [PALETTE.forest, PALETTE.fern, PALETTE.pine, PALETTE.clover, PALETTE.spruce];

type Bezier = [Point, Point, Point, Point];
interface Sample { x: number; y: number; tx: number; ty: number; w: number; t: number; d: number }
interface Limb { P: Bezier; w0: number; w1: number; t0: number; main: boolean; leader?: boolean; pts: Sample[]; len: number }

/** Point and unit tangent of a cubic Bezier at t. */
function cubic(P: Bezier, t: number) {
  const u = 1 - t;
  const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
  const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
  const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
  const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
  const l = Math.hypot(dx, dy) || 1;
  return { x, y, tx: dx / l, ty: dy / l };
}

/** The trunk: a tapered column that flares into roots at the ground (`gy`), as one filled outline. */
export function trunkShape(cx: number, yTop: number, gy: number, wt: number, wb: number): PosterShape {
  const bw = wb / 2, th = gy - yTop;
  const half = (sg: -1 | 1) => {
    const X = (v: number) => cx + sg * v;
    return {
      top: [X(wt / 2), yTop], c1: [X(wt / 2), yTop + th * 0.45], c2: [X(bw), gy - th * 0.45], p1: [X(bw), gy - wb * 1.05],
      c3: [X(bw), gy - wb * 0.35], c4: [X(bw * 1.7), gy - wb * 0.02], tip: [X(bw * 3.3), gy + 1.5],
      c5: [X(bw * 2.1), gy - wb * 0.12], c6: [X(bw * 1.2), gy - wb * 0.28], mid: [X(bw * 0.7), gy - wb * 0.08],
    } as Record<string, Point>;
  };
  const A = half(-1), B = half(1), p = (v: Point) => `${num(v[0])} ${num(v[1])}`;
  const d = `M${p(A.top)}C${p(A.c1)} ${p(A.c2)} ${p(A.p1)}C${p(A.c3)} ${p(A.c4)} ${p(A.tip)}` +
    `C${p(A.c5)} ${p(A.c6)} ${p(A.mid)}Q${num(cx)} ${num(gy - wb * 0.55)} ${p(B.mid)}` +
    `C${p(B.c6)} ${p(B.c5)} ${p(B.tip)}C${p(B.c4)} ${p(B.c3)} ${p(B.p1)}C${p(B.c2)} ${p(B.c1)} ${p(B.top)}Z`;
  return { d, fill: BARK, stroke: BARK_EDGE, strokeWidth: 1.2 };
}

/** A limb or twig along its sampled centre line, narrowing from `w0` to `w1`. */
export function limbShape(pts: Sample[], w0: number, w1: number): PosterShape {
  return { d: tapered(pts.map((q) => [q.x, q.y] as Point), w0, w1), fill: BARK, stroke: BARK_EDGE, strokeWidth: 1 };
}

/** One leaf from its stalk at (x, y), `len` long, pointing `ang` radians. */
export function leafShape(x: number, y: number, ang: number, len: number, colour: string): PosterShape {
  return { d: leafPath(x, y, ang, len / 34), fill: colour, stroke: PALETTE.leafEdge, strokeWidth: 1 };
}

/** An apple of radius `r` hanging on a stalk from (x, top): the stalk, the red body and a small leaf. */
export function appleShapes(x: number, top: number, r: number, s: number): PosterShape[] {
  const y = top + 5 * s + r * 0.8;
  const q = (px: number, py: number) => `${num(x + px)} ${num(y + py)}`;
  const body = `M${q(0, -r * 0.62)}C${q(r * 0.45, -r * 1.05)} ${q(r * 1.05, -r * 0.8)} ${q(r, -r * 0.1)}C${q(r * 1.05, r * 0.65)} ${q(r * 0.55, r)} ${q(0, r * 0.9)}` +
    `C${q(-r * 0.55, r)} ${q(-r * 1.05, r * 0.65)} ${q(-r, -r * 0.1)}C${q(-r * 1.05, -r * 0.8)} ${q(-r * 0.45, -r * 1.05)} ${q(0, -r * 0.62)}Z`;
  const stalk = (w: number) => `M${num(x - w)} ${num(top)}L${num(x - w + r * 0.08)} ${num(y - r * 0.72)}L${num(x + w + r * 0.08)} ${num(y - r * 0.72)}L${num(x + w)} ${num(top)}Z`;
  return [
    { d: stalk(1.1 * s), fill: BARK, stroke: null, strokeWidth: 0 },
    { d: body, fill: PALETTE.brick, stroke: BARK_EDGE, strokeWidth: 1 },
    leafShape(x + r * 0.08, y - r * 0.72, -0.5, r * 1.5, PALETTE.fern),
  ];
}

/**
 * The whole tree in `box`. Returns the parts in drawing order: trunk and limbs, leaves, apples. `rnd` is a seeded
 * generator, so one seed always grows the same tree.
 */
export function appleTree(box: TreeBox, o: TreeOptions, rnd: () => number): { wood: PosterShape[]; leaves: PosterShape[]; apples: PosterShape[] } {
  const rng = (a: number, b: number) => a + rnd() * (b - a);
  const { x: ox, y: oy, w: W, h: H } = box;
  const s = Math.sqrt(W * H) / 530, cx = ox + W / 2, gy = oy + H;
  // the outline of the crown is a cone with slightly bulging sides
  const margin = 34 * s, rx = W / 2 - margin, topY = oy + margin;
  const yTop = oy + H * box.trunkTop;          // the end of the trunk, where the first tier of limbs starts
  const yBase = yTop + 8 * s;
  const hw = (y: number) => {
    const u = (y - topY) / (yBase - topY);
    if (u < 0) return 0;
    if (u > 1) return rx * Math.max(0, 1 - (u - 1) * 4);
    return rx * Math.pow(u, 0.72);
  };
  const inside = (x: number, y: number, k: number) => y >= topY && Math.abs(x - cx) <= hw(y) * k;
  const wb = Math.min(20 * s + W * 0.018, W * 0.1), wt = wb * 0.62;
  const limbs: Omit<Limb, "pts" | "len">[] = [];

  // the leader: the trunk carries on to the top of the crown
  const lead0: Point = [cx, yTop + (gy - yTop) * 0.06], leadT: Point = [cx + rng(-4, 4) * s, topY + 16 * s], LH = lead0[1] - leadT[1];
  limbs.push({ P: [lead0, [cx + rng(-6, 6) * s, lead0[1] - LH * 0.35], [cx + rng(-6, 6) * s, lead0[1] - LH * 0.7], leadT], w0: wt * 0.92, w1: 2.4 * s, t0: 0.25, main: true, leader: true });
  const leaderW = (y: number) => wt * 0.92 * (1 - 0.8 * Math.min(1, Math.max(0, (lead0[1] - y) / LH)));

  // tiers of main limbs: the lowest are the longest and flattest, higher ones shorter and steeper
  const nT = Math.max(2, Math.min(4, Math.round(1.4 + 1.3 * H / W)));
  const fr = [0, 0.36, 0.6, 0.78].slice(0, nT);
  const grow = (O: Point, a: number, side: number, k: number) => {
    const dx = Math.sin(a) * side, dy = -Math.cos(a);
    let L = 10 * s;
    while (L < W * 2 && inside(O[0] + dx * L, O[1] + dy * L, k)) L += 3 * s;
    return { dx, dy, L };
  };
  fr.forEach((q, ti) => {
    const oyT = yTop - (yTop - topY) * q, w = leaderW(oyT);
    const first = rnd() < 0.5 ? -1 : 1;
    for (const side of [first, -first]) {
      const a = (68 - ti * 9 + rng(-5, 5)) * Math.PI / 180;
      const O: Point = [cx + side * w * 0.2, oyT + (side === first ? 0 : rng(4, 10) * s)];
      const g = grow(O, a, side, 0.92), L = g.L * rng(0.92, 1);
      const T: Point = [O[0] + g.dx * L, O[1] + g.dy * L];
      limbs.push({ P: [O, [O[0] + g.dx * L * 0.35, O[1] + g.dy * L * 0.35 + L * 0.04], [O[0] + g.dx * L * 0.72, O[1] + g.dy * L * 0.72 + L * 0.03], T], w0: w * 0.72, w1: 2.2 * s, t0: 0.2, main: true });
    }
    if (ti < nT - 1) {
      // a shorter pair between the tiers fills the gap
      const ny = yTop - (yTop - topY) * fr[ti + 1], my = oyT + (ny - oyT) * 0.5, mw = leaderW(my);
      for (const side of [-first, first]) {
        const a = (52 - ti * 8 + rng(-5, 5)) * Math.PI / 180;
        const O: Point = [cx + side * mw * 0.2, my + (side === first ? rng(4, 9) * s : 0)];
        const g = grow(O, a, side, 0.88), L = g.L * rng(0.68, 0.78);
        const T: Point = [O[0] + g.dx * L, O[1] + g.dy * L];
        limbs.push({ P: [O, [O[0] + g.dx * L * 0.35, O[1] + g.dy * L * 0.35 + L * 0.03], [O[0] + g.dx * L * 0.7, O[1] + g.dy * L * 0.7 + L * 0.02], T], w0: mw * 0.55, w1: 2 * s, t0: 0.2, main: true });
      }
    }
  });

  // side twigs
  const mains = limbs.slice();
  for (const b of mains) {
    const bl = Math.hypot(b.P[3][0] - b.P[0][0], b.P[3][1] - b.P[0][1]);
    const nTw = Math.max(3, Math.min(9, Math.round(bl / (55 * s)))), spots: [number, number][] = [];
    for (let k = 0; k < nTw; k++) spots.push([0.28 + 0.56 * (k + rng(0.2, 0.8)) / nTw, k % 2 ? 1 : -1]);
    for (const [tt, side] of spots) {
      const p = cubic(b.P, tt), sd = side * (rnd() < 0.5 ? 1 : -1);
      const ang = Math.atan2(p.ty, p.tx) + sd * rng(0.55, 0.85);
      let len = bl * (b.leader ? rng(0.09, 0.14) : rng(0.26, 0.36));
      let ex = 0, ey = 0;
      for (let k = 0; k < 8; k++) {
        ex = p.x + Math.cos(ang) * len; ey = p.y + Math.sin(ang) * len;
        if (inside(ex, ey, 0.92) && ey < gy - 60 * s) break;
        len *= 0.8;
      }
      if (len < 18 * s) continue;
      const nx = -Math.sin(ang), ny = Math.cos(ang), cv = rng(-0.12, 0.12) * len;
      const P: Bezier = [[p.x, p.y], [p.x + Math.cos(ang) * len * 0.33 + nx * cv, p.y + Math.sin(ang) * len * 0.33 + ny * cv],
        [p.x + Math.cos(ang) * len * 0.66 + nx * cv, p.y + Math.sin(ang) * len * 0.66 + ny * cv], [ex, ey]];
      const w = b.w0 + (b.w1 - b.w0) * Math.pow(tt, 0.8);
      limbs.push({ P, w0: w * 0.62, w1: 1.8 * s, t0: 0.12, main: false });
    }
  }

  const all: Limb[] = limbs.map((b) => {
    const pts: Sample[] = [];
    let acc = 0, prev: Sample | null = null;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, c = cubic(b.P, t);
      const q: Sample = { ...c, t, w: b.w0 + (b.w1 - b.w0) * Math.pow(t, 0.8), d: 0 };
      if (prev) acc += Math.hypot(q.x - prev.x, q.y - prev.y);
      q.d = acc;
      pts.push(q); prev = q;
    }
    return { ...b, pts, len: acc };
  });
  const at = (b: Limb, d: number): Sample => {
    const ps = b.pts;
    for (let i = 1; i < ps.length; i++) {
      if (ps[i].d >= d) {
        const a = ps[i - 1], c = ps[i], k = (d - a.d) / ((c.d - a.d) || 1);
        return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k, tx: c.tx, ty: c.ty, w: a.w + (c.w - a.w) * k, t: a.t + (c.t - a.t) * k, d };
      }
    }
    return ps[ps.length - 1];
  };

  const wood: PosterShape[] = [trunkShape(cx, yTop, gy, wt, wb), ...all.map((b) => limbShape(b.pts, b.w0, b.w1))];

  const leaves: PosterShape[] = [];
  const LL = 25 * s * 0.95;
  const leaf = (x: number, y: number, ang: number, len: number) => leaves.push(leafShape(x, y, ang, len, LEAVES[Math.floor(rnd() * LEAVES.length)]));
  for (const b of all) {
    const step = (b.main ? 13 : 11.5) * s / o.density;
    let side = 1;
    for (let d = b.len * b.t0; d < b.len - step * 0.5; d += step * rng(0.8, 1.2)) {
      const q = at(b, d), base = Math.atan2(q.ty, q.tx), ang = base + side * rng(0.6, 1.05);
      leaf(q.x - q.ty * side * q.w * 0.45, q.y + q.tx * side * q.w * 0.45, ang, LL * rng(0.85, 1.15));
      side = -side;
    }
    const e = b.pts[b.pts.length - 1], ba = Math.atan2(e.ty, e.tx);
    leaf(e.x, e.y, ba, LL * 1.1); leaf(e.x, e.y, ba - 0.5, LL * 0.95); leaf(e.x, e.y, ba + 0.5, LL * 0.95);
  }

  // apples hang from the limbs, never into each other or onto the roots
  const cand: Sample[] = [];
  for (const b of all) for (const q of b.pts) if (q.t >= (b.main ? 0.45 : 0.25) && q.t <= 0.96) cand.push(q);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const ar = 12.5 * s, placed: { x: number; y: number; r: number; top: number }[] = [];
  for (const q of cand) {
    if (placed.length >= o.apples) break;
    const r = ar * rng(0.88, 1.12), top = q.y + q.w / 2, ay = top + 5 * s + r * 0.8;
    if (ay + r > yTop + (gy - yTop) * 0.3 && q.x !== cx && ay + r > gy - 40 * s) continue;
    if (placed.some((p) => Math.hypot(p.x - q.x, p.y - ay) < (p.r + r) * 1.25)) continue;
    placed.push({ x: q.x, y: ay, r, top });
  }
  const apples = placed.flatMap((p) => appleShapes(p.x, p.top, p.r, s));
  return { wood, leaves, apples };
}
