/** Colours of the dates and places in the coloured PDF (RGB 0-1), the birth, death and place colours are the ones of palette.ts, the same as the light theme of the screen
    (--c-birth, --c-death and --muted in src/ui/styles.css).
    Sources and notes use --c-src (screen only). */

import type { SegKind } from "./format";
import { PALETTE, rgbOf } from "./palette";

export const KIND_COLORS: Partial<Record<SegKind, [number, number, number]>> = {
  birt: rgbOf(PALETTE.forest), marr: [0.5, 0.39, 0.06], deat: rgbOf(PALETTE.chocolate), place: rgbOf(PALETTE.stone),
};
