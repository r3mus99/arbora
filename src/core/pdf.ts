/** PDF layout and rendering of chart rows with pdf-lib. */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import { chartRows, normalize, type Row } from "./chart";
import { KIND_COLORS } from "./colors";
import { fmt, formatDMY, type ChartOptions, type SegKind } from "./format";
import type { GedcomData } from "./gedcom";
import { TEXTS, type Lang } from "./texts";

/** the size the text starts at; it shrinks when a line does not fit the page */
export const PDF_FONT_SIZE = 8.5;

/** page sizes in points (portrait) */
const PAGE_SIZES: Record<ChartOptions["pageSize"], [number, number]> = {
  a4: [595.2756, 841.8898], a3: [841.8898, 1190.5512],
  a5: [419.5276, 595.2756], letter: [612, 792], legal: [612, 1008],
};

class Layout {
  top: number;
  bottom: number;
  perPage: number;

  constructor(public pageW: number, public pageH: number, public margin: number,
              public font: PDFFont, public bold: PDFFont, public italic: PDFFont, public size: number,
              public step: number, public lineH: number) {
    const header = size * 1.6 + 22;
    this.top = pageH - margin - header;
    this.bottom = margin + 14;
    this.perPage = Math.max(1, Math.floor((this.top - this.bottom) / lineH) + 1);
  }
  get tick() { return Math.min(10, this.step * 0.6); }
  x(gen: number) { return this.margin + (gen - 1) * this.step; }
  textX(gen: number) { return this.x(gen) + (gen > 1 ? this.tick + 2 : 0); }
  y(row: number) { return this.top - (row % this.perPage) * this.lineH; }
  /** names are bold and places italic */
  fontOf(kind: SegKind) { return kind === "name" ? this.bold : kind === "place" ? this.italic : this.font; }
  with(size: number, step: number, baseRatio: number) {
    return new Layout(this.pageW, this.pageH, this.margin, this.font, this.bold, this.italic,
                      size, step, size * baseRatio);
  }
}

/** Shrink indent and then font size until the widest line fits on the page. */
function fitLayout(rows: Row[], base: Layout, seeText: string) {
  const ratio = base.lineH / base.size;
  let lay = base;
  for (let i = 0; i < 200; i++) {
    let width = 0;
    for (const r of rows) {
      const w = lay.textX(r.gen) + r.parts.reduce((sum, p) => sum + lay.fontOf(p.kind).widthOfTextAtSize(p.text, lay.size), 0) +
        (r.dup ? lay.font.widthOfTextAtSize(` (${seeText})`, lay.size) : 0);
      if (w > width) width = w;
    }
    if (width <= lay.pageW - lay.margin) return { lay, fits: true };
    let size, step;
    if (lay.step > lay.size * 1.8) {
      step = Math.max(lay.size * 1.8, lay.step * 0.92); size = lay.size;
    } else if (lay.size > 5) {
      size = Math.max(5, lay.size - 0.25); step = size * 1.8;
    } else {
      return { lay, fits: false };
    }
    lay = lay.with(size, step, ratio);
  }
  return { lay, fits: false };
}

function render(doc: PDFDocument, rows: Row[], title: string, lang: Lang, lay: Layout,
                stamp: string, lineWidth: number, colors: boolean): number {
  const t = TEXTS[lang];
  const total = Math.floor((rows.length - 1) / lay.perPage) + 1;
  rows.forEach((r, i) => { r.page = Math.floor(i / lay.perPage) + 1; });
  const black = rgb(0, 0, 0);
  const mid = lay.size * 0.32;
  const gap = lay.lineH * 0.45;
  const today = new Date();
  const dateStr = `${stamp} · ${formatDMY(lang, today.getDate(), today.getMonth() + 1, today.getFullYear())}`;

  const pageRange = (pg: number) => [lay.y(pg * lay.perPage) + lay.lineH * 0.5,
                                     lay.y(pg * lay.perPage + lay.perPage - 1) - lay.lineH * 0.5];

  for (let pg = 0; pg < total; pg++) {
    const page = doc.addPage([lay.pageW, lay.pageH]);
    const line = (x1: number, y1: number, x2: number, y2: number, th = lineWidth) =>
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th,
                      color: black });
    const vline = (x: number, rowA: number, rowB: number, trimA: number, trimB: number) => {
      const [topLim, botLim] = pageRange(pg);
      const pa = Math.floor(rowA / lay.perPage), pb = Math.floor(rowB / lay.perPage);
      if (pg < pa || pg > pb) return;
      const y1 = pa === pg ? lay.y(rowA) + mid - trimA : topLim;
      const y2 = pb === pg ? lay.y(rowB) + mid + trimB : botLim;
      if (y1 > y2) line(x, y1, x, y2);
    };

    // header
    const ts = lay.size * 1.6;
    const tw = lay.bold.widthOfTextAtSize(title, ts);
    page.drawText(title, { x: (lay.pageW - tw) / 2, y: lay.pageH - lay.margin - ts,
                           size: ts, font: lay.bold, color: black });
    const small = lay.size * 0.85;
    page.drawText(dateStr, { x: lay.margin, y: lay.pageH - lay.margin - ts - 6,
                             size: small, font: lay.font, color: black });
    const pageText = fmt(t.page, { n: pg + 1, total });
    page.drawText(pageText, {
      x: lay.pageW - lay.margin - lay.font.widthOfTextAtSize(pageText, small),
      y: lay.margin - 2, size: small, font: lay.font, color: black });
    const hy = lay.pageH - lay.margin - ts - 9;
    line(lay.margin, hy, lay.pageW - lay.margin, hy, 1.2);
    line(lay.margin, hy - 2, lay.pageW - lay.margin, hy - 2, 1.2);

    // people
    const startRow = pg * lay.perPage;
    const endRow = Math.min(rows.length, startRow + lay.perPage);
    for (let i = startRow; i < endRow; i++) {
      const r = rows[i];
      const y = lay.y(i);
      if (r.tick) line(lay.x(r.gen), y + mid, lay.x(r.gen) + lay.tick, y + mid);
      let x = lay.textX(r.gen);
      for (const part of r.parts) {
        const font = lay.fontOf(part.kind);
        const c = colors ? KIND_COLORS[part.kind] : undefined;
        page.drawText(part.text, { x, y, size: lay.size, font, color: c ? rgb(...c) : black });
        x += font.widthOfTextAtSize(part.text, lay.size);
      }
      if (r.dup && r.target) {
        page.drawText(`  (${fmt(t.see, { page: r.target.page })})`, { x, y, size: lay.size, font: lay.font,
                                                                     color: black });
      }
    }

    // vertical connectors; a trimmed end stops short of that row's text
    for (const r of rows) {
      for (const l of r.links) {
        vline(lay.x(l.gen), l.a, l.b, l.trimA ? gap : 0, l.trimB ? gap : 0);
      }
    }
  }
  return total;
}

export interface Fonts {
  regular: ArrayBuffer | Uint8Array;
  bold?: ArrayBuffer | Uint8Array;
  italic?: ArrayBuffer | Uint8Array;
}

export interface ChartResult {
  bytes: Uint8Array;
  pages: number;
  rows: number;
  generations: number;
  /** font size after shrinking to fit */
  fontSize: number;
  /** the font had to be shrunk noticeably */
  shrunk: boolean;
  title: string;
}

/** Build the chart for rootId as a PDF. */
export async function generate(data: GedcomData, rootId: string, options: Partial<ChartOptions>,
                               fonts: Fonts, version = ""): Promise<ChartResult> {
  const o = normalize(options);
  const root = data.people[rootId];
  if (!root) throw new Error(`Person ${rootId} does not exist.`);

  const desc = o.chart === "descendants";
  const rows = chartRows(data, rootId, o);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold || fonts.regular, { subset: true });
  const italic = await doc.embedFont(fonts.italic || fonts.regular, { subset: true });

  let [w, h] = PAGE_SIZES[o.pageSize] || PAGE_SIZES.a4;
  if (o.orientation === "landscape") [w, h] = [Math.max(w, h), Math.min(w, h)];
  const base = new Layout(w, h, o.margin, font, bold, italic, PDF_FONT_SIZE, PDF_FONT_SIZE * 2.6,
                          PDF_FONT_SIZE * o.lineHeight);
  const { lay } = fitLayout(rows, base, fmt(TEXTS[o.lang].see, { page: 99 }));
  const title = fmt(TEXTS[o.lang][desc ? "titleDesc" : "title"], { name: root.name });
  doc.setTitle(title);
  doc.setCreator("Arbora");
  doc.setProducer("Arbora (pdf-lib)");
  const pages = render(doc, rows, title, o.lang, lay, `Arbora${version && ` ${version}`}`, 0.6, o.colorPdf);
  const bytes = await doc.save();
  return {
    bytes, pages, rows: rows.length, generations: Math.max(...rows.map((r) => r.gen)),
    fontSize: lay.size, shrunk: lay.size < PDF_FONT_SIZE * 0.85, title,
  };
}
