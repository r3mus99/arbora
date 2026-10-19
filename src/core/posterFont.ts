/**
 * Fonts of the tree poster: real glyph widths for the layout and glyph outlines for the SVG, so the file looks the
 * same without the font installed. A line is set with the first font of the list that has each character (the
 * fonts of one weight are Alkatra Latin, Alkatra Latin Extended and DejaVu Sans for what Alkatra lacks, such as Cyrillic).
 */

import fontkit from "@pdf-lib/fontkit";

type Source = ArrayBuffer | Uint8Array;

/** the part of a fontkit path that is used (its typings lack `transform`) */
interface PathLike { transform(a: number, b: number, c: number, d: number, e: number, f: number): { toSVG(): string } }

interface Glyphs {
  scale: number;
  /** [x of the glyph's origin, path in font units] for each glyph of a run */
  items: { x: number; path: PathLike; id: string }[];
  width: number;
}

export interface PosterFonts {
  /** the width of a line at `size` */
  width: (text: string, size: number, bold: boolean) => number;
  /** the outline of a line, centred on `x` with its baseline at `y`, as SVG path data */
  outline: (text: string, size: number, bold: boolean, x: number, y: number) => string;
  /**
   * The same line as glyphs to place: each is the id of a glyph (the same for every use of the letter), where it goes
   * and its scale; `glyph(id)` gives the outline once, in font units with the y axis pointing up.
   */
  place: (text: string, size: number, bold: boolean, x: number, y: number) => { id: string; x: number; y: number; scale: number }[];
  glyph: (id: string) => string;
}

const round = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10));

/** The poster fonts from the files of each weight, first choice first. */
export function posterFonts(regular: Source[], bold: Source[]): PosterFonts {
  const load = (list: Source[]) => list.map((s) => fontkit.create(s instanceof Uint8Array ? s : new Uint8Array(s)));
  const chains = { regular: load(regular), bold: load(bold) };

  /** the characters of `text` grouped into runs that one font sets */
  function runs(text: string, isBold: boolean) {
    const fonts = chains[isBold ? "bold" : "regular"];
    const out: { font: (typeof fonts)[number]; text: string; key: string }[] = [];
    for (const ch of text) {
      const font = fonts.find((f) => f.hasGlyphForCodePoint(ch.codePointAt(0)!)) || fonts[fonts.length - 1];
      const last = out[out.length - 1];
      if (last && last.font === font) last.text += ch;
      else out.push({ font, text: ch, key: `${isBold ? "b" : "r"}${fonts.indexOf(font)}` });
    }
    return out;
  }

  const paths = new Map<string, PathLike>();

  function set(text: string, size: number, isBold: boolean): Glyphs[] {
    return runs(text, isBold).map(({ font, text: run, key }) => {
      const scale = size / font.unitsPerEm;
      const { glyphs, positions } = font.layout(run);
      let x = 0;
      const items = glyphs.map((g, i) => {
        const item = { x: x + positions[i].xOffset * scale, path: g.path as unknown as PathLike, id: `${key}-${g.id}` };
        paths.set(item.id, g.path as unknown as PathLike);
        x += positions[i].xAdvance * scale;
        return item;
      });
      return { scale, items, width: x };
    });
  }

  return {
    width: (text, size, isBold) => set(text, size, isBold).reduce((sum, r) => sum + r.width, 0),
    outline(text, size, isBold, x, y) {
      const parts = set(text, size, isBold);
      let at = x - parts.reduce((sum, r) => sum + r.width, 0) / 2;
      const d: string[] = [];
      for (const run of parts) {
        for (const g of run.items) d.push(round(g.path.transform(run.scale, 0, 0, -run.scale, at + g.x, y).toSVG()));
        at += run.width;
      }
      return d.join("");
    },
    place(text, size, isBold, x, y) {
      const parts = set(text, size, isBold);
      let at = x - parts.reduce((sum, r) => sum + r.width, 0) / 2;
      const out: { id: string; x: number; y: number; scale: number }[] = [];
      for (const run of parts) {
        for (const g of run.items) out.push({ id: g.id, x: at + g.x, y, scale: run.scale });
        at += run.width;
      }
      return out;
    },
    glyph: (id) => round(paths.get(id)!.transform(1, 0, 0, 1, 0, 0).toSVG()),
  };
}
