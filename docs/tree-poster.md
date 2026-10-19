# Tree poster

The tree poster (`src/core/poster.ts`; the SVG button in the top bar in `App.tsx`, a fresh seed per click) draws the ancestors of one person as a
decorative wall chart. This file records how it works and what is still open.

## How it works

- `buildPoster()` returns a flat drawing: shapes (SVG path data with fill and stroke) and centred text lines, in an area
  sized by the content. `posterSvg` writes it as SVG (Marek decided in the thread that SVG is the
  only export, next to GED and PDF in the top bar). The list is output-neutral, so PDF or PNG can be added later.
- Plates are hand-cut labels (uneven edges, border width varies, brown border, the name blue for men and red for women). The people the person may still have known
  stand out: the person is drawn at 200 %, the parents at 175 %, the grandparents at 150 %, the great-grandparents at 125 %,
  every further generation at 100 % (`POSTER_PLATE_SCALE`); the text and the border grow with the plate, and the packing and the column
  widths take the plate sizes into account. The person is in the centre below the two parents (one limb rises from them and splits in two; the parents are level and close to the middle, which keeps the poster narrow), the father's line left, the mother's right, one column per
  generation. Within a side the people are packed like a tidy tree (Reingold-Tilford): each plate sits halfway between its
  two parents (level with a lone parent), and the father's branch is pushed against the mother's only as far as plates of
  one column need to stay apart. Only people who exist take room, so the poster height follows the family, not the
  generations; a missing ancestor leaves no gap.
- Branches are tapered filled shapes along a smooth curve with a seeded wiggle across the chord; a longer branch swings
  more (an S bend), so no long straight run remains, and a bend that would run over a plate is tried again with less swing. Side shoots (two levels) and leaves
  grow along them; a shoot that would touch a plate, another shoot or the edge is not drawn. The seed combines the
  person's id with a random number picked at each download, so every download is a new tree; the same seed (the
  `posterSeed` option) always draws the same one, which the tests use.
- Names wrap to two lines when one line would be small; a generation shares one name size and one date size.
- Text widths come from the real fonts (`posterFonts`), so plates and text fit exactly; without fonts (tests) an estimate is used.

## Open points

1. **Fine-tune the name plates.** Plates are plain hand-cut labels: uneven sides and a border of changing width, drawn as
   two flat shapes (brown under paper colour); the name is blue for men and red for women (ink for unknown sex; the dates stay ink). An earlier variant coloured the border by sex. Every plate is
   different because the seed drives its edges. Later ideas: more characterful shapes (scroll ends, folded corners, branch
   frames, tried in prototypes under `arbora/tree-poster/nameplate` in the project files), border-width and waviness
   settings.
2. **Fixed decorations:** the title ribbon, the crown of the tree in the middle, roots under the person, a list of
   the person's children. They need drawn vectors; the branches stay generated.
3. **Leaf shape:** one drawn leaf (a plain path) would replace the generic one.
4. **Fonts:** the text is set in Alkatra (OFL, `public/fonts/Alkatra-*.woff`, Latin and Latin Extended) and written as outlines, so a print shop sees the same letters; what Alkatra lacks (Cyrillic) falls back to DejaVu Sans per character (`core/posterFont.ts`). Open: a Cyrillic font that matches Alkatra, kerning, and smaller files (the outlines make an SVG about 1 MB at five generations).
5. **Places, sources and residence on plates** (the poster ignores places for now).
6. **Density of side shoots:** an option (sparse, normal, dense).
7. **Colour themes** (paper, branch and leaf colours; black and white for a laser printer).
8. **A poster for descendants,** and more than nine generations (the width grows by one column per generation).
9. **Fixed paper size:** the poster now has the proportions of its content, not of A paper. A choice of paper (fit or pad to A3/A2/A1) and a print margin could be added.
10. **Pedigree collapse:** a repeated ancestor is drawn twice; mark the second plate or link them.
11. **Other outputs** (PDF via pdf-lib `drawSvgPath`, PNG via a canvas `Path2D`) were built and dropped; the SVG is enough for now.
12. **A preview** of the poster before the download.
