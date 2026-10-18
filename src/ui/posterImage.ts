/** The tree poster as a PNG, drawn on a canvas: the shapes as paths, the text in the embedded DejaVu Sans. */
import type { Fonts } from "../core/pdf";
import type { Poster } from "../core/poster";

const FAMILY = "Arbora Poster";
/** the widest picture every browser still draws (Safari stops at about 16.7 million pixels) */
export const PNG_WIDTH = 4800;

async function loadFont(source: ArrayBuffer | Uint8Array, weight: string) {
  const face = new FontFace(FAMILY, source as BufferSource, { weight });
  document.fonts.add(await face.load());
}

export async function posterPng(poster: Poster, fonts: Fonts): Promise<Blob> {
  await loadFont(fonts.regular, "400");
  await loadFont(fonts.bold || fonts.regular, "700");
  const scale = PNG_WIDTH / poster.width;
  const canvas = document.createElement("canvas");
  canvas.width = PNG_WIDTH;
  canvas.height = Math.round(poster.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  for (const s of poster.shapes) {
    const path = new Path2D(s.d);
    if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(path); }
    if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; ctx.stroke(path); }
  }
  ctx.textAlign = "center";
  for (const t of poster.texts) {
    ctx.font = `${t.bold ? 700 : 400} ${t.size}px "${FAMILY}"`;
    ctx.fillStyle = t.fill;
    ctx.fillText(t.text, t.x, t.y);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}
