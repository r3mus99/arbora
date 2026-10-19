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
  a little more (an S bend), but never beyond a small cap (`POSTER_MAX_SWING`), so there are no big waves; a bend that
  would run over a plate is tried again with less swing. The length of the side shoots follows the length of the branch (proportionally, 0.8 to 2 times the usual). Side shoots (two levels) and leaves
  grow along them; a shoot that would touch a plate, another shoot or the edge is not drawn. The seed combines the
  person's id with a random number picked at each download, so every download is a new tree; the same seed (the
  `posterSeed` option) always draws the same one, which the tests use.
- The year of a marriage and the number of children of the couple (two lines, each led by a drawn symbol: two rings
  before the year, two small figures before the number; the number is left out for an only child, the year when
  unknown, and nothing needs translating) are a small brown text where the branches of the two parents meet: in the gap between
  a person and the parents, or beside the fork under the main person's parents. It has no plate of its own, its size
  follows the generation of the child (12 units times the plate scale), the gap between two columns is widened to fit
  it, and nothing is shown when a parent is missing. The room is kept free of side shoots before
  they grow, and afterwards the spot nearest the usual one that touches no plate, branch, shoot or leaf is taken.
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
5. **Places, sources and residence on plates** (the poster ignores places for now). Tried as a preview and postponed
   (Marek, 2026-10-19): an extra small line inside the plate, `* Graz  ⌂ Prague  † Vienna` (birth place, residence,
   death place, only what is known), only for the generations with the big plates (200 % to 125 %), none for the
   100 % ones. Findings: the plates need to be about 30 % higher (a separate residence line needs 55 % and two-line
   names then touch the border); long place names shrink the line to small type, mostly on the 125 % plates, so a
   long line would have to wrap or the places would be limited to 200 % to 150 %; the residence shows only when it
   differs from the birth and death places. A residence line is better as an opt-in setting.
6. **More facts on the poster** (Marek liked all five, 2026-10-19; the number of children is done, see the
   marriage text under "Plates"):
   - the occupation under the name on the big plates (200 % to 125 %), only when known;
   - ~~the title with numbers~~ done: the title stands in a hand-cut frame with "Ancestors: 62 · Generations: 6" under it
     (`posterStats`); maybe the oldest known ancestor and the year;
   - ~~the age at death next to the years~~ done (*1907 †1986, 79 y.), only when both years are known (`ageAbbr`);
   - a footer with the date of creation and the author's name, for print.
7. **Density of side shoots:** an option (sparse, normal, dense).
8. **Colour themes** (paper, branch and leaf colours; black and white for a laser printer).
9. **A poster for descendants,** and more than ten generations (the width grows by one column per generation).
10. **Fixed paper size:** the poster now has the proportions of its content, not of A paper. A choice of paper (fit or pad to A3/A2/A1) and a print margin could be added.
11. **Pedigree collapse:** a repeated ancestor is drawn twice; mark the second plate or link them.
12. **Other outputs** (PDF via pdf-lib `drawSvgPath`, PNG via a canvas `Path2D`) were built and dropped; the SVG is enough for now.
13. **A preview** of the poster before the download.
