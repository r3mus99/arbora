# Tree poster

The tree poster (`src/core/poster.ts`; the SVG button in the top bar in `App.tsx`, a fresh seed per click) draws the ancestors of one person as a
decorative wall chart. This file records how it works and what is still open.

## How it works

- `buildPoster()` returns a flat drawing: shapes (SVG path data with fill and stroke) and centred text lines, in an area
  sized by the content. `posterSvg` writes it as SVG (Marek decided in the thread that SVG is the
  only export, next to GED and PDF in the top bar). The list is output-neutral, so PDF or PNG can be added later.
- Plates are rectangles with straight edges and rounded corners, a double brown line like the poster border (a single line from the 7th generation on), the name blue for men and red for women). The people the person may still have known
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
  they grow, and afterwards the spot nearest the usual one that touches no plate, branch, shoot or leaf is taken, searched up to 70 units sideways and 120 up or down: a spot between the two branches is preferred, one above or below them is the last resort.
- A person who is an ancestor on more than one branch (the family married within itself) keeps a plate on every
  branch, so the tree stays clean and symmetrical; each of those plates carries a small brown tag with the count ("2×")
  in its top right corner, drawn as a small rounded rectangle (not a circle), and the title counts every
  person once.
- Repeated people are always drawn in full (there is no setting to hide them), so the numbers in the corners and the
  count of known ancestors always agree with what is on the poster.
- Places and name statistics in the corners (`core/posterCorners.ts`) are always drawn once the poster really reaches 5 generations (`POSTER_CORNERS_MIN_GENERATIONS`; counted from the deepest plate, not from the number asked for, so a shallow tree asked for 8 generations gets none). A branch with fewer than 5 people (`CORNER_MIN_PEOPLE`) gets no block. There is no setting; a "no statistics" checkbox may come later. Each corner has a
  list, one per main branch: top left the father's father line, bottom left the father's mother line,
  top right the mother's father line, bottom right the mother's mother line (the people of that branch on the poster,
  each counted once). A list is a block in the same double-line frame as the title and the plates: a heading row with the label "Line" and the name and birth date of the head of the branch ("Rosa Brandt  ·  b. 7 Apr 1700  ·  62 ancestors", the date format follows the Dates setting;
  the birth and then the count are left out when they do not fit), a hairline, and up to three one-line rows labelled "Origin", "First names" and "Surnames" (no colon). The labels stand in one column, so the heading and the first values of all rows start at the same x. All four blocks are as wide as the widest content needs. The rows hold: birth municipalities (the part
  of the place before the first comma), first given names and surnames (only when the file separates them). Female and
  male forms of a surname (Nováková/Novák, Kowalska/Kowalski, Иванова/Иванов) are one entry shown in the male form. A row
  names the most common values first, at most 5 (up to 5 generations), 6 (6 and 7) or 7 (from 8), with the number of people ("Vienna (7)  ·  Prague (5)"); the rest
  is counted ("+ 13 more", with no dot before it). A trailing district number ("Prague 2") is dropped, so the municipality and its numbered forms are one entry. The left lists start at the leftmost plate edge and the right ones end at the rightmost. A row without values is left out. The poster grows: the top blocks stand under the ruler, the bottom ones under the lowest plates. A faint band on every second row was tried and dropped (Marek, 2026-10-20): with three rows it only highlights the middle one.
- With "Show places" on, the plates of generations 1 to 4 carry place rows instead of the date line (see open point 5); the poster text sizes are computed per role (names, dates, rows), and a plate with rows shrinks its text to fit its height.
- Names wrap to two lines when one line would be small; two-line names use a smaller font so the date line stays clear of the plate edge. A generation shares one name size and one date size, taken from its single-line plates; a plate with a wrapped name keeps its own smaller sizes and does not shrink the others.
- A ruler runs across the poster level with the middle of the title frame (drawn under the same rule as the corner lists, `posterHasStatistics`: from 5 filled generations); the frame covers the part of it beside the main person, so the labels of the columns it covers (usually generations 1 and 2) are left out. The corner lists stand under the ruler. It is only decoration, a line with ticks that mean nothing, with a larger tick and "N. generation" (`TEXTS.generation`) at the middle of each column of plates and under it how many people of that column are known out of how many it could hold ("12 of 16", `TEXTS.known`; a column on one side holds 2^(generation-2), the main person 1; every plate counts, so a person who stands on several branches counts each time). The father's side is on the left, the mother's on the right, the main person's "1." in the middle. A time scale in real years with a band per generation was tried and dropped (Marek, 2026-10-19): on real data the generations overlap too much (the ranges grow to about 100 years by the 10th generation), so the scale said little. 
- **Corner rule:** every box on the poster (plates, title frame, corner lists, the "2×" tag and the border of the whole poster) has rounded corners; lines (the ruler, the hairline under a list heading) have none. The statistics frames use the same radius as the title frame.
- A quiet double border of straight lines with rounded corners (radius 24, the inner line concentric) runs around the whole poster in a margin outside the tree (`Poster.margin`; the SVG view box starts at `-margin`, so `width` and `height` still describe the tree itself). It is always on.
- Text widths come from the real fonts (`posterFonts`), so plates and text fit exactly; without fonts (tests) an estimate is used.

## Open points

1. **Fine-tune the name plates.** Plates are plain labels with straight sides, rounded corners and a double line (single from the 7th generation on), drawn as
   two flat shapes (brown under paper colour); the name is blue for men and red for women (ink for unknown sex; the dates stay ink). An earlier variant coloured the border by sex. Later ideas: more characterful shapes (scroll ends, folded corners, branch
   frames, tried in prototypes under `arbora/tree-poster/nameplate` in the project files), border-width and waviness
   settings.
2. **Fixed decorations:** the title ribbon, the crown of the tree in the middle, roots under the person, a list of
   the person's children. They need drawn vectors; the branches stay generated.
3. **Leaf shape:** one drawn leaf (a plain path) would replace the generic one.
4. **Fonts:** the text is set in Alkatra (OFL, `public/fonts/Alkatra-*.woff`, Latin and Latin Extended) and written as outlines, so a print shop sees the same letters; what Alkatra lacks (Cyrillic) falls back to DejaVu Sans per character (`core/posterFont.ts`). Open: a Cyrillic font that matches Alkatra. Each letter is stored once in `<defs>` and reused with `<use>`, so the 7-generation sample SVG is about 1.1 MB.
5. **Places on plates.** Done for generations 1 to 4 (`POSTER_PLACES_UP_TO`) when "Show places" is on (Marek, 2026-10-20, option B of the
   mock-ups in `arbora/tree-poster/three-line-plates/`): name and up to three rows `*1865 Graz`, `⌂ Prague`, `†1906 Vienna` (the dates move into the
   rows, the format follows the Dates and Labels settings; a row with nothing known is left out; the residence only when it differs from the birth and
   death place). The plate is 75 % taller (`POSTER_PLACES_HEIGHT`); the poster keeps its height because the 7th generation decides it. Open, decide later:
   - generations 5 and 6 (100 % plates): one small row `* Graz  ⌂ Prague  † Vienna` was tried (variant C), the poster grew 15 % in height and the SVG 12 % and the text is tiny, so postponed; from the 7th generation the plates are too small;
   - merge birth and death into one row when the place is the same (`*1845 †1918 Hohenau`), because in village data birth, residence and death are often one place and a plate then shows a single row;
   - the age at death ("79 y.") is lost on these plates; it could be appended to the death row when it fits;
   - the residence has no abbreviation in the text-label mode (always `⌂`);
   - a shallow tree (5 generations) is higher than the generation 7 column normally leaves room for, so the taller plates may then make the poster higher;
   - sources are still not shown.
6. **More facts on the poster** (Marek liked all five, 2026-10-19; the number of children is done, see the
   marriage text under "Plates"):
   - the occupation under the name on the big plates (200 % to 125 %), only when known;
   - ~~the title with numbers~~ done: the title stands in a plate-like frame with "6 generations · 62 ancestors · 1722–1887" under it
     (the nouns follow the plural of the language: `generations`, `ancestors`; the years run from the oldest birth to the main
     person's and are left out when unknown);
   - ~~the age at death next to the years~~ done (*1907 †1986, 79 y.), only when both years are known (`ageAbbr`);
   - a footer with the date of creation and the author's name, for print.
7. **Density of side shoots:** an option (sparse, normal, dense).
8. **Colour themes** (paper, branch and leaf colours; black and white for a laser printer).
9. **A poster for descendants,** and more than ten generations (the width grows by one column per generation).
10. **Fixed paper size:** the poster now has the proportions of its content, not of A paper. A choice of paper (fit or pad to A3/A2/A1) and a print margin could be added.
11. **Pedigree collapse:** a repeated ancestor is drawn twice; mark the second plate or link them.
12. **Other outputs** (PDF via pdf-lib `drawSvgPath`, PNG via a canvas `Path2D`) were built and dropped; the SVG is enough for now.
13. **A preview** of the poster before the download.
