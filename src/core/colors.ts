/** Colours of the dates and places in the coloured PDF (RGB 0-1), darker than on screen to read on paper.
    The screen uses --c-birth, --c-marr and --c-death in src/ui/styles.css, in the same hues.
    Sources and notes use --c-src (screen only). */

import type { SegKind } from "./format";

export const KIND_COLORS: Partial<Record<SegKind, [number, number, number]>> = {
  birt: [0.09, 0.45, 0.29], marr: [0.5, 0.39, 0.06], deat: [0.42, 0.24, 0.15], place: [0.4, 0.42, 0.45],
};
