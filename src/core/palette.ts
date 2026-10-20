/**
 * The named colours Arbora uses in the tree poster, the coloured PDF and (light theme) the screen. One green stands for
 * birth and leaves, one brown for death and branches, one grey for places, so a year means the same colour everywhere.
 * `src/ui/styles.css` repeats `--c-birth`, `--c-death` and `--muted` of the light theme; `palette.test.ts` keeps them equal.
 */
export const PALETTE = {
  forest: "#1e6b44",     // birth year, the main leaf colour
  fern: "#2b8453",
  pine: "#17583a",
  clover: "#339058",
  spruce: "#247349",
  leafEdge: "#124a31",   // outline of a leaf
  chocolate: "#4e2a1a",  // death year, marriage year, branches
  espresso: "#2e180d",   // outline of branches and plates
  stone: "#62675f",      // places
  ink: "#2a1d12",        // names of people without a sex, dates
  ivory: "#fffcf3",      // plate
  parchment: "#efe3cc",  // poster paper
  lapis: "#2f5f9e",      // male name
  brick: "#a8322a",      // female name
} as const;

/** "#rrggbb" as red, green and blue between 0 and 1 (the PDF colour model). */
export const rgbOf = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
