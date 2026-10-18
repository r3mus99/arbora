# Tree poster

The tree poster (`src/core/poster.ts`; the SVG button in the top bar in `App.tsx`, a fresh seed per click) draws the ancestors of one person as a
decorative wall chart. This file records how it works and what is still open.

## How it works

- `buildPoster()` returns a flat drawing: shapes (SVG path data with fill and stroke) and centred text lines, in a fixed
  3000-unit-wide area with the proportions of A paper. `posterSvg` writes it as SVG (Marek decided in the thread that SVG is the
  only export, next to GED and PDF in the top bar). The list is output-neutral, so PDF or PNG can be added later.
- Plates sit in fixed rows: the person at the bottom centre, the father's line left, the mother's right, one column per
  generation, each plate halfway between its two parents. A missing ancestor leaves its place empty.
- Branches are tapered filled shapes along a smooth curve with a seeded wiggle. Side shoots (two levels) and leaves
  grow along them; a shoot that would touch a plate, another shoot or the edge is not drawn. The seed combines the
  person's id with a random number picked at each download, so every download is a new tree; the same seed (the
  `posterSeed` option) always draws the same one, which the tests use.
- Names wrap to two lines when one line would be small; a generation shares one name size and one date size.
- Text widths are an estimate (`textWidth`), identical for every output, so the layout never depends on a font.

## Open points

1. **Name plate templates (SVG).** Marek will supply sample plates (scroll, ribbon, frame). Needed for the generator: a
   template with fixed decorative ends and a stretchable middle (9-slice style) of plain paths and flat colours (no
   gradients, filters or shadows, which pdf-lib does not draw); a safe text area inside; a licence that allows
   MIT use. Until then the plate is a rounded rectangle.
2. **Fixed decorations:** the title ribbon, the crown of the tree in the middle, roots under the person, a list of
   the person's children. They need drawn vectors; the branches stay generated.
3. **Leaf shape:** one drawn leaf (a plain path) would replace the generic one.
4. **Text as outlines in SVG,** so a print shop without DejaVu Sans sees the same letters (fontkit can give glyph paths).
5. **Places, sources and residence on plates** (the poster ignores places for now).
6. **Density of side shoots:** an option (sparse, normal, dense).
7. **Colour themes** (paper, branch and leaf colours; black and white for a laser printer).
8. **More than seven generations,** or a poster for descendants.
9. **Custom paper size** and a print margin.
10. **Pedigree collapse:** a repeated ancestor is drawn twice; mark the second plate or link them.
11. **Other outputs** (PDF via pdf-lib `drawSvgPath`, PNG via a canvas `Path2D`) were built and dropped; the SVG is enough for now.
12. **A preview** of the poster before the download.
