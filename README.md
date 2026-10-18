# Arbora

**Online: https://r3mus99.github.io/arbora/**

A web page to view, check and edit a family tree from a GEDCOM file and turn it
into a PDF chart of **ancestors** or **descendants**. The edited tree can be
downloaded again as GEDCOM. Everything runs in your browser; the file is never
uploaded anywhere.

Current version: **2.0.0**, see [CHANGELOG.md](CHANGELOG.md).

### Ancestors

The root person is no. 1 at the left edge. Each further generation is indented
to the right, the father's line above the person and the mother's below. After
the name, the years of birth (`*`), the parents' marriage (`∞`) and death (`†`)
are in parentheses:

```
            ┌ 3. Karol Ľudovít Habsburský (*1833, ∞1862, †1896)
      ┌ 2. Otto František Jozef Habsburský (*1865, ∞1886, †1906)
      │     └ 3. Marie Annunziata Neapolsko-Sicilská (*1843, †1871)
1. Karol I. (*1887, †1922)
      │     ┌ 3. Jiří I. Saský (*1832, ∞1859, †1904)
      └ 2. Mária Jozefa Saská (*1867, †1944)
            └ 3. …
```

Sample: [public/sample_ancestors.pdf](public/sample_ancestors.pdf).

### Descendants

The chosen ancestor is no. 1. Below them is the spouse with the year of
marriage, and below both the children, indented and sorted by birth, then the
grandchildren and so on. With several marriages the children are grouped by the
spouse they had them with:

```
1. František I. (*1708, †1765)
∞1736 Mária Terézia (*1717, †1780)
   ├ 2. …
   ├ 2. Leopold II. (*1747, †1792)
   │  ∞1765 Mária Ludovika Španielska (*1745, †1792)
   │     ├ 3. František II. (*1768, †1835)
   │     │  ∞1788 Alžbeta Wilhelmína Württemberská (*1767, †1790)
   │     │     └ 4. …
   │     │  ∞1790 Mária Terézia Neapolsko-sicílska (*1772, †1807)
   │     │     ├ 4. Mária Lujza Habsbursko-lotrinská (*1791, †1847)
   │     │     └ 4. Ferdinand I. (*1793, †1875)
   │     └ 3. …
   └ 2. …
```

Sample: [public/sample_descendants.pdf](public/sample_descendants.pdf).

A person who appears in the tree more than once (for example after marriages
between relatives) is written out only once; later occurrences refer to it.

## Usage

1. Open the page and choose (or drop) your `.ged` file, or try the built-in
   sample. The page then switches to a compact top bar: the Arbora title, the
   file name with the number of people (click it or drop a file on it to open
   another one), the tool buttons and the language. The tools are icons with a
   tooltip: file overview, file check, undo, redo, download GEDCOM, **PDF**, **SVG** (tree poster) and
   settings.
2. After loading, the **file overview** shows the number of people (men and
   women), families and generations (the longest parent–child line), the years
   the file covers, the oldest ancestor (click to make them no. 1 of the chart),
   the number of problems found by the file check, and the most common surnames
   and places. A surname is a link to the search. The overview closes with the
   cross and opens again with its icon in the top bar.
3. The main part of the page is the chart, laid out the same way as the PDF.
   Switch between **Ancestors** and **Descendants** above it and find person
   no. 1 by name or ID in the search field of the chart header. At first it is
   the person chosen last time, otherwise the first person in the file.
4. Clicking a person shows their details next to the chart (below it on narrow
   screens), with icons and in the same order as the edit form: birth,
   christening, religion, parents, marriages with children, occupations, note,
   death and burial. Relatives are links; the crosshair button makes the person
   no. 1 of the chart and the pencil opens the edit form.
5. A repeated ancestor shows a link **see no. X** instead of their branch (with
   Ahnentafel or d'Aboville numbering, otherwise **see above / below**) that
   jumps to the written-out branch and highlights it. The arrows next to the
   title (or Alt+← / Alt+→) go back and forward through the people you viewed.
6. The **−** on the connector before a name collapses that person's branch and
   **+** expands it again; with Shift, the whole generation. The chart and the
   PDF share all settings, so the PDF matches the chart (collapsed branches are
   not carried into the PDF).
7. The gear icon in the top bar opens the **Settings** window.
8. **PDF** creates the PDF and downloads it at once.

### Editing and GEDCOM export

The edit form changes the data of existing people, in this order: given name and
surname (surnames from the file are suggested), other forms of the name ("also
known as", stored as `NAME` with `TYPE aka`; also shown in small text before the ID in the details and found by
the search), sex, birth and christening (date
and place; christening can copy them from birth), religion (values from the file
are suggested), the date and place of each marriage and whether the couple
divorced, occupations (each with its own date and place), a note, and last
**Died**: ticking it shows death and burial (burial can copy date and place from
death). Ticked without any details it is stored as `1 DEAT Y`; unticking it and
saving clears death and burial. Place fields suggest the places already in the
file. **Save** (Ctrl+Enter; also the tick icon at the top right) shows the change at once in the chart and the PDF,
**Cancel** (Esc) drops it. Adding and deleting people is not possible yet.

A date can be typed as `14.5.1891`, `5/1891`, `1891`, `~1890`, `<1890`, `>1890`,
`1890–1895`, with the "about / before / after" words of the page language, or
directly in GEDCOM form (`ABT 1890`, `14 MAY 1891`). Below the field you see how
the date will be stored. Any other text is stored as a date phrase in
parentheses.

The arrows in the top bar (or Ctrl+Z / Ctrl+Y) undo and redo saved changes.
**Download GEDCOM** downloads the edited file; while there are changes not yet
downloaded, a dot on the download button marks "unsaved changes". Changed records are
written anew; every other line stays exactly as it was, including tags Arbora
does not know (sources, notes on events, `_UID`, coordinates…). Even in a
changed record only the edited lines change. The header records Arbora as the
program that saved the file (`HEAD SOUR ARBORA` with its version) and the date and
time of saving (`HEAD DATE`). The file is saved as UTF-8. Before
you leave the page with unsaved changes, the browser asks.

### File check

The shield button in the top bar shows the number of problems found
(GEDCOM 5.5.1). When there are none it only says so in its tooltip; otherwise a
click lists them, and the names in the list open the person's details. It checks:

- the `HEAD` header and the `TRLR` end of the file, and duplicate IDs;
- links to people or families that are not in the file, and links without a
  link back (`FAMS`/`FAMC` against `HUSB`/`WIFE`/`CHIL`);
- dates not in GEDCOM form (e.g. `1885-12-12`), and sex against the role in a family;
- impossible dates: death before birth, a child born before a parent, a parent
  younger than 12, birth after the mother's death or more than a year after the
  father's. Approximate dates (`ABT`) are compared only when they are years apart;
- surname endings that do not fit the sex, in languages where they differ:
  Slovak and Czech (Horváth / Horváthová, Nový / Nová) and Polish (-ski / -ska),
  only in files that show the habit and only for people with a known sex.

What can be fixed safely has a magic wand on the right; each fix is one step
that can be undone. A missing header or `TRLR` is added, a link to nothing is
removed, a missing link back is added and a date like `1885-12-12` is rewritten
as `12 DEC 1885`, and a surname gets the form that fits the sex when that is certain (Nový → Nová, or a form the file already has). The list closes once everything is fixed.

### Bulk data fix

Part of the file check, in its **Surnames** and **Places** tabs: spellings of
one surname or town that differ only in accents, doubled letters or the old
Hungarian spelling (Pavlovský / Pavlovszký, Kubíček / Kubiček, Lieskovice /
Lieszkovicz) are shown as groups. The most used spelling is offered; click
another one or type your own, use × to leave a spelling out, and **Unify**
renames it in every record as one step that can be undone. For surnames the
old spelling is kept as another name of the person (`1 NAME …` with
`2 TYPE aka`, "also known as") unless you untick that option. The number of
records that change opens a list of them. A man's and a woman's form
(Kováčik / Kováčiková) are never put together. For places only the town, the
first part of the place, is renamed; the district and country stay. A group
that is not the same name can be hidden (the **Hidden** tab shows it again),
and **Batch rename** changes any one spelling to another.

**Privacy:** everything runs only in your browser. The GEDCOM file is not sent
anywhere and the page has no server; you download the edited file yourself. The
browser remembers only the settings and the ID of the last person
(localStorage), never the file's content.

### Language

The language is switched with the flag in the top right: Slovak, Czech, Polish,
Hungarian, German, English, French, Italian, Spanish, Portuguese, Dutch and
Ukrainian. The chosen language applies to the page and to the PDF (title,
abbreviations, date format, page numbers). On the first visit it follows the
browser's language.

### Settings

The first part of the Settings window applies to both the chart and the PDF:

| Option | Choices |
|---|---|
| Labels | symbols `* ∞ †` or abbreviations (`b. m. d.` in English) |
| Dates | year only, or the full date |
| Places | none, first part only (village), full place |
| Numbering | generation (1, 2, 3…); Ahnentafel for ancestors (father = 2n, mother = 2n+1), d'Aboville for descendants (1.2.1); none |
| Parents' marriage | for ancestors: next to the father, next to both parents, not shown |
| Generations | maximum number including the root (0 = all) |
| Spouses | for descendants: show the spouse with the year of marriage, or blood descendants only |

**Print settings** (PDF only): page size (A4, A3, A5, Letter, Legal),
orientation, font size, custom title and the print date in the header.

If the longest line does not fit the page width, the generation indent and then
the font size are reduced automatically.

### Tree poster

The **SVG** button in the top bar, next to GED and PDF, downloads the ancestors of the chart's root person as a
decorative wall chart for large-format printing: the person at the bottom, the father's line unfolding to the left and
the mother's to the right, with branches and leaves between the name plates. The plates have exact positions, the
branches are drawn from a seeded random generator, so every download draws a different, unique tree. The generations (2 to 7; "all" draws seven), the title, labels and
dates follow the settings. The SVG is vector, with the text set in Alkatra and written as outlines, so it prints sharply at any size and looks the same without the font; its proportions are those of A paper.
The plan and the open points are in [docs/tree-poster.md](docs/tree-poster.md).

### Notes on the data

- `ABT`, `EST`, `CAL` dates are shown as "about", `BEF` as "before", `AFT` as
  "after" (in the page language), ranges `BET … AND …` / `FROM … TO …` as
  "1903–1905".
- A divorce is shown ("∞1991 (div.)") when the family has a `1 DIV` line.
- In the chart and the PDF a missing birth falls back to christening
  (`CHR`/`BAPM`) and a missing death to burial (`BURI`/`CREM`).
- File encoding: UTF-8 (with or without BOM), UTF-16, otherwise Windows-1250.

## Structure

The page is written in TypeScript with React and built with Vite.

```
src/core/           core without UI: GEDCOM → chart rows → PDF (pdf-lib + fontkit)
  gedcom.ts         reading GEDCOM (encoding, records, people, families), search
  date.ts           GEDCOM dates: their valid form, years, ISO dates
  edit.ts           editing records, typed dates, writing GEDCOM
  check.ts          file check and safe fixes
  variants.ts       bulk fix: spelling variants of surnames and places
  format.ts         options, dates, places, the text of a person's line
  chart.ts          ancestor and descendant chart rows
  collapse.ts       collapsed branches: which rows stay visible
  pdf.ts            page layout and PDF
  poster.ts         tree poster: plates, seeded branches and leaves, SVG (posterFont.ts: glyph widths and outlines)
  texts.ts          PDF texts in 12 languages
  *.test.ts         tests on the sample and made-up data
src/ui/             the React page: chart (TreeView), person details (PersonDetail),
                    edit form (PersonEditor), file check and bulk fix (CheckPanel, Variants), language
                    menu, settings dialog, UI translations (i18n.ts) and flags; the logic that
                    needs no DOM is in history.ts (undo, back/forward) and options.ts, with tests
public/             static files: DejaVu Sans font, sample GEDCOM and PDFs, licenses
```

Development (Node.js 22):

```
npm install
npm run dev       # http://localhost:5173
npm test          # tests
npm run coverage  # tests with the coverage of the core
npm run lint      # oxlint
npm run build     # the page into dist/
```

GitHub Actions (`.github/workflows/pages.yml`) runs the linter and the tests, builds the page
and deploys it to GitHub Pages on every push to `main`; the repository setting
is *Pages → Source: GitHub Actions*.

## Test data

`public/sample.ged` is the Habsburg family tree from
[Wikidata](https://www.wikidata.org) (CC0): the ancestors of Emperor Charles I
(I1) and the male-line descendants of Francis I of Lorraine (I52) with their
spouses, 1714 people in all. Nobody in it was born in 1950 or later, and from
1900 on only people with a known date of death, so there are no living persons.
Names and places come from the Slovak Wikidata labels, where missing from the
Czech, German or English ones; every person carries their Wikidata ID
(`REFN … TYPE Wikidata`). It has approximate dates, several marriages, a divorce
(e.g. Henry IV, I416), children with an unknown mother and many repeated
ancestors.

`.gitignore` ignores every other `.ged` and `.pdf` file so that a real family
tree does not end up in the repository by mistake.

## License

MIT, see [LICENSE](LICENSE). Third-party libraries and fonts:
[public/LICENSES.md](public/LICENSES.md).
