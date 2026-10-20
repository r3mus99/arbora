/**
 * Tree poster of the descendants of one person: the person stands at the left, every generation is a column to the
 * right of it, each person with the partners to the right of the plate and the children of that partnership in the next
 * column. The plates, the branches, the rounding and the border are those of the ancestors poster (`poster.ts`); only
 * the layout is new. A branch with many children grows one trunk beside the column of children, and every child leaves it
 * where its plate is, so the branches do not bundle in one point.
 */

import type { GedcomData, Family, Person } from "./gedcom";
import { formatDate, type ChartOptions } from "./format";
import { normalize } from "./chart";
import { yearOf } from "./date";
import { TEXTS } from "./texts";
import type { PosterFonts } from "./posterFont";
import { CORNER_HEAD_H, CORNER_HEAD_SIZE, CORNER_LABEL_SIZE, CORNER_PAD, CORNER_STEP, CORNER_VALUE_SIZE, cornerBlocks, cornerHeight } from "./posterCorners";
import {
  dense, drawPlates, makeGrower, plateKit, plateOutline, posterBorder, posterHasStatistics, posterSeed, POSTER_COLORS, POSTER_MIN_GENERATIONS, random, symbolShapes, textWidth,
  type Plate, type Point, type Poster, type PosterShape, type PosterText,
} from "./poster";

/**
 * The most generations (including the person) the descendants poster shows. The width is not the limit (one more column
 * pair is about 750 units), the height is: it grows with the number of people of the last generation, about 100 units each.
 * Measurements in docs/tree-poster.md.
 */
export const POSTER_MAX_DESCENDANT_GENERATIONS = 6;
/** Plate size by generation: the leaves of the last column decide the height of the poster, so the plates shrink faster than on the ancestors poster. */
export const POSTER_DESCENDANT_PLATE_SCALE = [2, 1.5, 1.25, 1];

/**
 * The most plates (people with their partners) a descendants poster holds, which keeps the height to about 25 000 units. A family
 * with 4 children and 3 for each of them has 970 plates in the 6th generation: a poster 29 000 units high and a 7 MB file; with 30 children who have 5 each,
 * the 4th generation alone is 1900 plates and half a minute of drawing. Over this number the last generation is left out (never below
 * POSTER_MIN_GENERATIONS); the title says how many generations the poster really shows.
 */
export const POSTER_MAX_DESCENDANT_PLATES = 500;

/** The number of generations the generations setting asks the descendants poster for (0 = all): at least the minimum, at most the descendants limit. */
export const descendantPosterGenerations = (setting: number) =>
  Math.min(POSTER_MAX_DESCENDANT_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(setting) || POSTER_MAX_DESCENDANT_GENERATIONS));

class TooMany extends Error {}

interface Union { fam: Family; partner: Plate | null; kids: Node[]; top: number; height: number }
interface Node { plate: Plate; unions: Union[]; height: number }

/** The descendants of `rootId` as a poster, in the same drawing format as the ancestors poster. */
export function buildDescendantsPoster(data: GedcomData, rootId: string, options: Partial<ChartOptions>, fonts?: PosterFonts): Poster {
  const o = normalize(options);
  const measure = fonts ? fonts.width : textWidth;
  const gapY = 24, unionGap = 24, gapGen = 110;
  const root = data.people[rootId];
  if (!root) throw new Error(`Person ${rootId} does not exist.`);
  const seed = posterSeed(rootId, o.posterSeed);
  const rnd = random(seed);
  const asked = descendantPosterGenerations(o.generations);

  // ------------------------------------------------------------ the people
  // Every person with the partners of his or her families (in the order of the file) and the children of each of them, down to
  // `gens`. A person met on the way back to the root (a loop in bad data) is not followed again; a person who is in the family
  // twice (cousins who married) is drawn twice, with the "2×" tag.
  const gather = (gens: number, limit: number) => {
    const kit = plateKit(o, measure, gens, POSTER_DESCENDANT_PLATE_SCALE);
    const plates: Plate[] = [];
    const people = new Map<Plate, Person>();
    const plateOf = (id: string, gen: number): Plate => {
      if (plates.length > limit) throw new TooMany();
      const p = data.people[id];
      const plate: Plate = { id, gen, w: kit.widthOf(gen), h: kit.plateHeight(p, gen), x: 0, y: 0 };
      plates.push(plate);
      people.set(plate, p);
      return plate;
    };
    const build = (id: string, gen: number, trail: ReadonlySet<string>): Node => {
      const plate = plateOf(id, gen);
      const here = new Set(trail).add(id);
      const unions: Union[] = [];
      for (const fid of data.people[id].fams) {
        const fam = data.families[fid];
        if (!fam) continue;
        const other = fam.husb === id ? fam.wife : fam.husb;
        const partner = other && other !== id && data.people[other] ? plateOf(other, gen) : null;
        const kids = gen < gens ? fam.children.filter((c) => data.people[c] && !here.has(c)).map((c) => build(c, gen + 1, here)) : [];
        if (partner || kids.length) unions.push({ fam, partner, kids, top: 0, height: 0 });
      }
      return { plate, unions, height: 0 };
    };
    return { kit, plates, people, tree: build(rootId, 1, new Set()) };
  };
  // asked for too many generations: draw one fewer until the plates fit (a family too big even for the minimum is drawn as it is)
  let gens = asked, got: ReturnType<typeof gather> | null = null;
  while (!got) {
    try { got = gather(gens, gens > POSTER_MIN_GENERATIONS ? POSTER_MAX_DESCENDANT_PLATES : Infinity); } catch (e) { if (!(e instanceof TooMany)) throw e; gens--; }
  }
  const { kit, plates, people, tree } = got;
  const { widthOf, lookOf } = kit;
  const depth = Math.max(...plates.map((q) => q.gen));

  // ------------------------------------------------------------ columns
  // a column pair (person, partner) exists only for generations that have a partner; the gap between the two holds the year of the marriage
  const hasPartner = new Set<number>();
  const walk = (n: Node, f: (n: Node) => void) => { f(n); n.unions.forEach((u) => u.kids.forEach((k) => walk(k, f))); };
  const marrSize = (gen: number) => 12 * lookOf(gen);
  const marrText = (fam: Family) => fam.marriage ? formatDate(fam.marriage.date, o.dates === "full", o.lang) : "";
  const symbolW = (size: number) => size * 1.14;
  const marrW = (fam: Family, gen: number) => { const t = marrText(fam); return t ? symbolW(marrSize(gen)) + marrSize(gen) * 0.3 + measure(t, marrSize(gen), false) : 0; };
  const partnerGap = new Map<number, number>();
  // the branches to three or more partners fan out of one point and cross the gap, which takes more room for the years
  walk(tree, (n) => n.unions.forEach((u) => {
    if (!u.partner) return;
    hasPartner.add(n.plate.gen);
    const crowd = n.unions.filter((x) => x.partner).length >= 3 ? 80 : 0;
    partnerGap.set(n.plate.gen, Math.max(partnerGap.get(n.plate.gen) ?? 90, Math.ceil(marrW(u.fam, n.plate.gen) + 50 + crowd)));
  }));
  const personX = new Map<number, number>(), partnerX = new Map<number, number>();
  let cursor = 0;
  for (let g = 1; g <= depth; g++) {
    personX.set(g, cursor + widthOf(g) / 2);
    cursor += widthOf(g);
    if (hasPartner.has(g)) {
      cursor += partnerGap.get(g)!;
      partnerX.set(g, cursor + widthOf(g) / 2);
      cursor += widthOf(g);
    }
    cursor += gapGen;
  }
  const contentW = cursor - gapGen;

  // ------------------------------------------------------------ title and statistics
  const appearances = new Map<string, number>();
  for (const q of plates) appearances.set(q.id, (appearances.get(q.id) ?? 0) + 1);
  const descendants = new Set<string>();
  walk(tree, (n) => { if (n !== tree) descendants.add(n.plate.id); });
  const born = [rootId, ...descendants].map((id) => yearOf(data.people[id].birth?.date)).filter((y): y is number => y !== null);
  const plural = new Intl.PluralRules(o.lang);
  const counted = (n: number, forms: string[]) => `${n} ${forms[{ one: 0, few: 1 }[plural.select(n) as "one" | "few"] ?? 2]}`;
  const title = TEXTS[o.lang].titleDesc.replace("{name}", root.name || "?");
  const figures = [counted(depth, TEXTS[o.lang].generations), counted(descendants.size, TEXTS[o.lang].descendants),
    born.length > 1 ? `${Math.min(...born)}\u2013${Math.max(...born)}` : ""].filter(Boolean).join(" \u00B7 ");
  const frameW = Math.max(measure(title, 58, true), measure(figures, 26, false)) + 120, frameH = 150;
  const W = Math.max(1400, Math.round(contentW + 80), Math.round(frameW + 80));
  const shift = (W - contentW) / 2;
  // Statistics (as on the ancestors poster, from 5 filled generations): a ruler of the generations and one list of the places and
  // names of all descendants (the same frame as the title and the plates), together under the tree.
  const withStats = posterHasStatistics(depth);
  const tx = TEXTS[o.lang].corners;
  const labelW = Math.max(...[tx.line, tx.origin, tx.given, tx.surnames].map((l) => measure(l, CORNER_LABEL_SIZE, true))) + CORNER_PAD + 22;
  const blockRoom = Math.min(1500, contentW);
  const list = withStats ? cornerBlocks({ fatherFather: [root, ...[...descendants].map((id) => data.people[id])], fatherMother: [], motherFather: [], motherMother: [] },
    o, measure, () => blockRoom - 2 * CORNER_PAD, depth, labelW, { nouns: TEXTS[o.lang].descendants })[0] : undefined;
  const blockW = list ? Math.min(blockRoom, labelW + 16 + Math.max(measure(list.heading, CORNER_HEAD_SIZE, true), ...list.rows.map((r) => measure(r.value, CORNER_VALUE_SIZE, false))) + CORNER_PAD) : 0;
  const blockH = list ? cornerHeight(list.rows.length) : 0;

  // ------------------------------------------------------------ rows
  // Every person owns a band of rows as high as the plate, or as the partnerships need: the children of a partnership stand
  // one under the other in the band of that partnership, the partner level with the middle of its children, the person
  // level with the middle of its partners. Bands of siblings follow each other, so nothing overlaps whatever the numbers.
  const measureNode = (n: Node): number => {
    for (const u of n.unions) {
      const kids = u.kids.map(measureNode);
      const span = kids.reduce((a, b) => a + b, 0) + Math.max(0, kids.length - 1) * gapY;
      u.height = Math.max(u.partner?.h ?? 0, span);
    }
    const content = n.unions.reduce((a, u) => a + u.height, 0) + Math.max(0, n.unions.length - 1) * unionGap;
    n.height = Math.max(n.plate.h, content);
    return n.height;
  };
  measureNode(tree);
  const settle = (n: Node, top: number) => {
    const content = n.unions.reduce((a, u) => a + u.height, 0) + Math.max(0, n.unions.length - 1) * unionGap;
    let y = top + (n.height - content) / 2;
    const anchors: number[] = [];
    for (const u of n.unions) {
      let ky = y + (u.height - (u.kids.reduce((a, k) => a + k.height, 0) + Math.max(0, u.kids.length - 1) * gapY)) / 2;
      for (const k of u.kids) {
        settle(k, ky);
        ky += k.height + gapY;
      }
      const centre = u.kids.length ? (u.kids[0].plate.y + u.kids[u.kids.length - 1].plate.y) / 2 : y + u.height / 2;
      if (u.partner) {
        u.partner.x = partnerX.get(n.plate.gen)! + shift;
        u.partner.y = Math.min(Math.max(centre, y + u.partner.h / 2), y + u.height - u.partner.h / 2);
      }
      u.top = y;
      anchors.push(u.partner?.y ?? centre);
      y += u.height + unionGap;
    }
    n.plate.x = personX.get(n.plate.gen)! + shift;
    const mid = anchors.length ? (anchors[0] + anchors[anchors.length - 1]) / 2 : top + n.height / 2;
    n.plate.y = Math.min(Math.max(mid, top + n.plate.h / 2), top + n.height - n.plate.h / 2);
  };
  const frameY = 100, bottom = 70;
  const topY = 190;
  settle(tree, topY);
  // the statistics stand together under the tree: the ruler of the generations, under it the list
  const left = shift;
  const treeBottom = topY + tree.height;
  const rulerBase = treeBottom + 110, blockY = rulerBase + 90;
  const H = Math.round(withStats ? blockY + blockH + 70 : treeBottom + bottom);

  // ------------------------------------------------------------ branches
  const C = POSTER_COLORS;
  const { branches, leaves, occupied, curve, limb, free } = makeGrower(rnd, plates, W, H);
  // the year of a marriage stands in the gap between the two, its room kept free of shoots; once the branches have grown the
  // spot nearest to the middle that touches no plate, branch or leaf is taken
  const marriages: PosterText[] = [], symbols: PosterShape[] = [];
  const labels: { text: string; size: number; width: number; height: number; x: number; y: number }[] = [];
  walk(tree, (n) => n.unions.forEach((u) => {
    const text = marrText(u.fam);
    if (!u.partner || !text) return;
    const size = marrSize(n.plate.gen), width = marrW(u.fam, n.plate.gen), height = size * 1.15;
    const x = (n.plate.x + n.plate.w / 2 + u.partner.x - u.partner.w / 2) / 2;
    const y = (n.plate.y + u.partner.y) / 2 - size * 0.6 - 10;
    for (let px = x - width / 2; px <= x + width / 2; px += 6) {
      for (let py = y - height / 2; py <= y + height / 2; py += 6) occupied.push([px, py]);
    }
    labels.push({ text, size, width, height, x, y });
  }));
  const growNode = (n: Node) => {
    const thick = Math.max(0, depth - n.plate.gen);
    for (const u of n.unions) {
      const from = u.partner ?? n.plate;
      if (u.partner) limb(curve([n.plate.x + n.plate.w / 2, n.plate.y], [u.partner.x - u.partner.w / 2, u.partner.y]), thick + 1, true, true);
      const a: Point = [from.x + from.w / 2, from.y];
      const kids = u.kids.map((k) => k.plate);
      if (kids.length < 3) {
        for (const k of kids) limb(curve(a, [k.x - k.w / 2, k.y]), thick, true, true);
      } else {
        // one trunk beside the column of children, from the first child to the last; the stem from the parent ends on it
        // and every child leaves it level with its plate
        const xt = (a[0] + kids[0].x - kids[0].w / 2) / 2;
        const trunk = dense(curve([xt, kids[0].y], [xt + 0.01, kids[kids.length - 1].y], true), 6);
        const at = (y: number): Point => trunk.reduce((best, p) => Math.abs(p[1] - y) < Math.abs(best[1] - y) ? p : best);
        limb(curve(a, at(a[1])), thick + 1, true, true, false);
        limb(trunk.filter((_, i) => i % 6 === 0 || i === trunk.length - 1), thick, false, false, false);
        for (const k of kids) limb(curve(at(k.y), [k.x - k.w / 2, k.y]), thick, true, true);
      }
    }
    n.unions.forEach((u) => u.kids.forEach(growNode));
  };
  growNode(tree);
  const taken: { x: number; y: number; width: number; height: number }[] = [];
  for (const { text, size, width, height, x, y } of labels) {
    const near: [number, number, number][] = [];
    for (let dx = -50; dx <= 50; dx += 4) for (let dy = -130; dy <= 130; dy += 4) near.push([x + dx, y + dy, Math.abs(dx) + 2 * Math.abs(dy)]);
    near.sort((a, b) => a[2] - b[2]);
    const spot = near.find(([px, py]) => free(px, py, width, height) &&
      !taken.some((t) => Math.abs(px - t.x) < (width + t.width) / 2 + 4 && Math.abs(py - t.y) < (height + t.height) / 2 + 2)) ?? [x, y];
    taken.push({ x: spot[0], y: spot[1], width, height });
    const left = spot[0] - width / 2;
    symbols.push(...symbolShapes("rings", left, spot[1], size));
    marriages.push({ text, x: left + symbolW(size) + size * 0.3 + measure(text, size, false) / 2, y: spot[1] + size * 0.3, size, bold: false, fill: C.marriage });
  }

  // ------------------------------------------------------------ plates and texts
  const drawn = drawPlates(plates, people, appearances, o, measure, kit);
  const [frameOuter, frameInner] = plateOutline(W / 2, frameY, frameW, frameH, 2);
  const plateShapes: PosterShape[] = [...drawn.shapes,
    { d: frameOuter, fill: C.branchEdge, stroke: null, strokeWidth: 0 }, { d: frameInner, fill: C.plate, stroke: null, strokeWidth: 0 }];
  const texts: PosterText[] = [...drawn.texts, ...marriages,
    { text: title, x: W / 2, y: frameY - 4, size: 58, bold: true, fill: C.ink },
    { text: figures, x: W / 2, y: frameY + 40, size: 26, bold: false, fill: C.branch }];

  // The ruler: a decorative line under the tree with a tick at the middle of every generation's column pair, "Nth
  // generation" over it and under it how many descendants of that generation are on the poster (every plate counts).
  if (withStats) {
    const bar = (x0: number, y0: number, x1: number, y1: number) => `M${x0},${y0}L${x1},${y0}L${x1},${y1}L${x0},${y1}Z`;
    const fit = (x: number, text: string, size: number, bold: boolean) => Math.min(W - 10 - measure(text, size, bold) / 2, Math.max(10 + measure(text, size, bold) / 2, x));
    const perGen = new Map<number, number>();
    walk(tree, (n) => perGen.set(n.plate.gen, (perGen.get(n.plate.gen) ?? 0) + 1));
    const edge = (g: number) => [personX.get(g)! - widthOf(g) / 2 + shift, (partnerX.get(g) ?? personX.get(g)!) + widthOf(g) / 2 + shift];
    const first = edge(1)[0], last = edge(depth)[1];
    let d = bar(first, rulerBase - 1.5, last, rulerBase + 1.5);
    for (let x = first; x <= last; x += 25) d += bar(x - 0.75, rulerBase - 7, x + 0.75, rulerBase);
    for (let g = 1; g <= depth; g++) {
      const [x0, x1] = edge(g), cx = (x0 + x1) / 2;
      const label = TEXTS[o.lang].generation.replace("{n}", String(g));
      d += bar(cx - 2, rulerBase - 26, cx + 2, rulerBase + 18);
      texts.push({ text: label, x: fit(cx, label, 26, true), y: rulerBase - 38, size: 26, bold: true, fill: C.branchEdge });
      if (g > 1) {
        const n = counted(perGen.get(g) ?? 0, TEXTS[o.lang].descendants);
        texts.push({ text: n, x: fit(cx, n, 22, false), y: rulerBase + 44, size: 22, bold: false, fill: C.ink });
      }
    }
    plateShapes.unshift({ d, fill: C.branchEdge, stroke: null, strokeWidth: 0 });
  }
  if (list) {
    const x0 = left, x1 = left + blockW, cx = (x0 + x1) / 2, y0 = blockY;
    const [outer, inner] = plateOutline(cx, y0 + blockH / 2, blockW, blockH, 1.3, false, 14);
    plateShapes.push({ d: outer, fill: C.branchEdge, stroke: null, strokeWidth: 0 }, { d: inner, fill: C.plate, stroke: null, strokeWidth: 0 },
      { d: `M${x0 + CORNER_PAD},${y0 + CORNER_HEAD_H - 0.7}L${x1 - CORNER_PAD},${y0 + CORNER_HEAD_H - 0.7}L${x1 - CORNER_PAD},${y0 + CORNER_HEAD_H + 0.7}L${x0 + CORNER_PAD},${y0 + CORNER_HEAD_H + 0.7}Z`, fill: C.branchEdge, stroke: null, strokeWidth: 0 });
    const put = (text: string, size: number, bold: boolean, y: number, fill: string, from: number) =>
      texts.push({ text, x: from + measure(text, size, bold) / 2, y, size, bold, fill });
    const headY = y0 + CORNER_HEAD_H / 2 + 11;
    put(list.headLabel, CORNER_LABEL_SIZE, true, headY, C.branch, x0 + CORNER_PAD);
    put(list.heading, CORNER_HEAD_SIZE, true, headY, C.branchEdge, x0 + labelW + 16);
    list.rows.forEach((r, i) => {
      const y = y0 + CORNER_HEAD_H + i * CORNER_STEP + CORNER_STEP * 0.68;
      put(r.label, CORNER_LABEL_SIZE, true, y, C.branch, x0 + CORNER_PAD);
      put(r.value, CORNER_VALUE_SIZE, false, y, C.ink, x0 + labelW + 16);
    });
  }

  const { margin, frameShapes } = posterBorder(W, H);
  const shapes: PosterShape[] = [
    { d: `M${-margin},${-margin}L${W + margin},${-margin}L${W + margin},${H + margin}L${-margin},${H + margin}Z`, fill: C.paper, stroke: null, strokeWidth: 0 },
    ...frameShapes, ...branches, ...leaves, ...symbols, ...plateShapes];
  return { width: W, height: H, margin, shapes, texts, generations: depth, people: plates.length, plates: plates.map(({ id, gen, x, y, w, h }) => ({ id, gen, x, y, w, h })), seed, title };
}
