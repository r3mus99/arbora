/**
 * A static apple tree for the poster, drawn from the same parts as the generated poster (tapered branches, leaves,
 * hand-cut name plates) plus a trunk and simple apples. The composition is fixed; a later step turns it into a
 * generator. The main person's name stands on the trunk, and the two long limbs reach the plates of the parents.
 */

import { POSTER_COLORS, dense, leafPath, num, plateOutline, random, tapered, type Poster, type PosterShape, type PosterText, type Point } from "./poster";

export const TREE_WIDTH = 1800;
export const TREE_HEIGHT = 1350;

const C = POSTER_COLORS;
const CX = TREE_WIDTH / 2;
const APPLE = "#d8261c";
const LEAVES = ["#2f8f1f", "#4fa526", "#7cc728", "#1f7a14", "#5cb82e"];

/** A plain apple centred at (x, y), `s` times 40 units wide: body with a dent on top, a stem and one small leaf. */
export function applePath(x: number, y: number, s: number): string {
  const p = ([px, py]: Point) => `${num(x + px * s)},${num(y + py * s)}`;
  const body = `M${p([0, -14])}C${p([6, -22])} ${p([22, -20])} ${p([22, -2])}C${p([22, 14])} ${p([12, 24])} ${p([6, 22])}` +
    `C${p([3, 21])} ${p([-3, 21])} ${p([-6, 22])}C${p([-12, 24])} ${p([-22, 14])} ${p([-22, -2])}` +
    `C${p([-22, -20])} ${p([-6, -22])} ${p([0, -14])}Z`;
  const stem = `M${p([-1, -14])}C${p([-1, -20])} ${p([1, -26])} ${p([4, -30])}L${p([6, -28])}C${p([3, -24])} ${p([2, -19])} ${p([2, -14])}Z`;
  return body + stem;
}

function appleLeaf(x: number, y: number, s: number): string {
  return leafPath(x + 3 * s, y - 24 * s, -0.4, 0.5 * s);
}

export interface TreeNames { main: string; father: string; mother: string }

export function buildTreeIllustration(names: TreeNames = { main: "Ján Novák", father: "Peter Novák", mother: "Anna Nováková" }): Poster {
  const rnd = random(2026);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const shapes: PosterShape[] = [];
  const texts: PosterText[] = [];
  const add = (d: string, fill: string | null, stroke: string | null = null, strokeWidth = 0) => shapes.push({ d, fill, stroke, strokeWidth });
  // the crown is drawn on a 1100-unit sketch; stretch it upward and move it down to make room for the crown
  const fy = (y: number) => (y < 790 ? 1000 - (790 - y) * 1.45 : y + 210);
  const spline = (pts: Point[]) => dense(pts.map(([x, y]): Point => [x, fy(y)]), 8);

  // ground and trunk: a broad base narrowing upward, with the limbs growing out of its top
  add(`M${CX - 280},1220 A280,28 0 1 0 ${CX + 280},1220 A280,28 0 1 0 ${CX - 280},1220Z`, "#2a7d1c");
  add(`M${CX - 125},1228 C${CX - 70},1160 ${CX - 66},1090 ${CX - 58},1010 L${CX - 50},950 L${CX + 50},950 L${CX + 58},1010` +
    ` C${CX + 66},1090 ${CX + 70},1160 ${CX + 125},1228 C${CX + 40},1214 ${CX - 40},1214 ${CX - 125},1228Z`, C.branch);

  const branches: Point[][] = [];
  const limb = (pts: Point[], w0: number, w1: number) => {
    const d = spline(pts);
    add(tapered(d, w0, w1), C.branch);
    branches.push(d);
  };
  const both = (pts: Point[], w0: number, w1: number) => {
    limb(pts, w0, w1);
    limb(pts.map(([x, y]): Point => [2 * CX - x, y]), w0, w1);
  };

  // the two long parent limbs end at the parent plates
  const left: Point[] = [[CX - 15, 790], [CX - 130, 735], [CX - 270, 740], [CX - 400, 680], [CX - 500, 580], [CX - 600, 470]];
  const right: Point[] = left.map(([x, y]): Point => [2 * CX - x, y]);
  limb(left, 56, 12);
  limb(right, 56, 12);
  // central trunk continues into the crown and forks
  limb([[CX, 790], [CX - 8, 640], [CX + 6, 520], [CX - 4, 400], [CX, 300]], 64, 10);
  both([[CX - 4, 620], [CX - 90, 560], [CX - 170, 470], [CX - 215, 360], [CX - 230, 270]], 34, 8);
  both([[CX - 120, 745], [CX - 200, 650], [CX - 260, 560], [CX - 330, 470], [CX - 400, 400]], 24, 7);
  // side limbs from the long parent limbs
  both([[CX - 300, 725], [CX - 340, 620], [CX - 330, 520], [CX - 290, 440]], 18, 6);
  both([[CX - 420, 665], [CX - 500, 650], [CX - 580, 640], [CX - 650, 590]], 14, 5);
  both([[CX - 540, 540], [CX - 600, 520], [CX - 700, 560]], 12, 4);

  // leaves along every limb, on both sides
  const leaves: PosterShape[] = [];
  for (const d of branches) {
    for (let i = 8; i < d.length - 2; i += 3) {
      const [x, y] = d[i];
      const a = d[Math.max(i - 1, 0)], b = d[Math.min(i + 1, d.length - 1)];
      const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const side = (Math.floor(i / 3) % 2 ? 1 : -1);
      const ang = dir + side * (0.7 + rnd() * 0.6);
      leaves.push({ d: leafPath(x, y, ang, 1.5 + rnd() * 0.9), fill: pick(LEAVES), stroke: null, strokeWidth: 0 });
    }
    const [x, y] = d[d.length - 1];
    const a = d[d.length - 2];
    leaves.push({ d: leafPath(x, y, Math.atan2(y - a[1], x - a[0]), 1.4), fill: pick(LEAVES), stroke: null, strokeWidth: 0 });
  }
  shapes.push(...leaves);

  // apples hang from points on the limbs
  const apples: [number, number, number][] = ([
    [CX - 190, 810, 1.7], [CX + 200, 815, 1.7], [CX - 345, 790, 2], [CX + 345, 790, 2],
    [CX - 250, 400, 1.5], [CX + 250, 400, 1.5], [CX - 80, 450, 1.5], [CX + 90, 380, 1.4],
    [CX - 170, 600, 1.6], [CX + 175, 590, 1.6], [CX - 520, 650, 1.8], [CX + 520, 650, 1.8],
    [CX - 440, 440, 1.5], [CX + 440, 440, 1.5], [CX, 250, 1.3], [CX - 620, 560, 1.6], [CX + 620, 560, 1.6],
  ] as [number, number, number][]).map(([x, y, k]): [number, number, number] => [x, fy(y), k * 1.15]);
  for (const [x, y, s] of apples) {
    add(appleLeaf(x, y, s), LEAVES[3]);
    add(applePath(x, y, s), APPLE);
  }

  // name plates: the person on the trunk, the parents at the ends of the long limbs
  const plate = (cx: number, cy: number, w: number, h: number, name: string, fill: string, size: number) => {
    const [outer, inner] = plateOutline(rnd, cx, cy, w, h, h / 45);
    add(outer, C.branchEdge);
    add(inner, C.plate);
    texts.push({ text: name, x: cx, y: cy + size * 0.32, size, bold: true, fill });
  };
  plate(CX, 1125, 300, 100, names.main, C.male, 32);
  plate(left[left.length - 1][0] - 140, fy(left[left.length - 1][1]), 280, 84, names.father, C.male, 28);
  plate(right[right.length - 1][0] + 140, fy(right[right.length - 1][1]), 280, 84, names.mother, C.female, 28);

  return {
    width: TREE_WIDTH, height: TREE_HEIGHT, shapes, texts, generations: 2, people: 3, plates: [],
    seed: 2026, title: names.main,
  };
}
