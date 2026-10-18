/** The tree poster as a vector PDF: one page of the chosen paper size. */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { ChartOptions } from "./format";
import type { GedcomData } from "./gedcom";
import type { Fonts } from "./pdf";
import { POSTER_PAPER, buildPoster, type Poster } from "./poster";

const color = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255);
};

export interface PosterResult { bytes: Uint8Array; poster: Poster }

/** Build the poster for rootId as a PDF. */
export async function generatePoster(data: GedcomData, rootId: string, options: Partial<ChartOptions>,
                                     fonts: Fonts): Promise<PosterResult> {
  const poster = buildPoster(data, rootId, options);
  const [w, h] = POSTER_PAPER[options.posterPaper || "a2"] || POSTER_PAPER.a2;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold || fonts.regular, { subset: true });
  doc.setTitle(poster.title);
  doc.setCreator("Arbora");
  doc.setProducer("Arbora (pdf-lib)");
  const page = doc.addPage([w, h]);
  const scale = w / poster.width;
  for (const s of poster.shapes) {
    page.drawSvgPath(s.d, {
      x: 0, y: h, scale,
      ...(s.fill ? { color: color(s.fill) } : {}),
      ...(s.stroke ? { borderColor: color(s.stroke), borderWidth: s.strokeWidth * scale } : {}),
    });
  }
  for (const t of poster.texts) {
    const font = t.bold ? bold : regular, size = t.size * scale;
    page.drawText(t.text, { x: t.x * scale - font.widthOfTextAtSize(t.text, size) / 2, y: h - t.y * scale, size, font,
                            color: color(t.fill) });
  }
  return { bytes: await doc.save(), poster };
}
