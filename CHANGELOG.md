# Changelog

## Unreleased

- Search also finds people by other forms of their name (aka); the list then
  shows which one matched.
- Compact top bar once a file is open: title, file name with the number of
  people, tool buttons as icons with tooltips (file check with the number of
  problems, undo, redo, download GEDCOM with a dot for unsaved changes, PDF,
  settings) and the language on one line, leaving more room for the chart.
- File overview after loading: people (men and women), families, generations,
  years covered, oldest ancestor, number of problems, and the most common
  surnames and places. Clicking a surname searches for it.
- Bulk data fix in the file check: tabs for issues, surnames, places and hidden
  groups. Spelling variants of one surname or town (Pavlovský / Pavlovszký,
  Lieskovice / Lieszkovicz) are grouped and can be unified into one chosen
  spelling in all records at once, as one undo step. Men's and women's forms
  are kept apart; for places only the town is renamed. Groups can be hidden,
  and a batch rename changes any spelling to another. The overview splits
  problems into issues, surnames and places. A unified surname keeps its old
  spelling as another name of the person (`NAME` with `TYPE aka`); an option
  above the list turns it off.
- Other forms of a name (`NAME` with `TYPE aka`) are shown in small text
  before the ID in the person's details and can be added, changed and removed
  in the edit form. The main name is the first one that is not an aka.
- While editing, save and cancel are also icons at the top right of the details.
- The edit form no longer stores a date that the file check then reports as
  wrong: a day the month does not have (31.2.1890, 30 FEB 1890) or INT without
  its phrase is kept as a date phrase and the form says so.
- Faster after every edit: finding spelling variants takes about 0.1 s instead
  of 1.4 s on the sample (and stays under a second for 10 000 people instead of
  minutes), and the file check no longer slows down with the square of the
  number of issues.

### Development
- One set of helpers for GEDCOM records (`childOf`, `childrenOf`, `gedNode`,
  `rewritten` in `src/core/gedcom.ts`) instead of copies in five files.
- GEDCOM dates are read in one place (`src/core/date.ts`) by the edit form, the
  file check, the chart order and the overview.
- Regression tests that must keep passing through the 1.1 refactoring: GEDCOM
  written anew is the same as the original, an edit undone gives the same file,
  every one-click fix removes its issue without adding another, unified
  spellings stay unified, long lines shrink the PDF font, and every UI language
  has every text.
- Linting with oxlint and a coverage threshold for the core, both run in CI.

## 1.0.0 – 2026-10-11

First release under the name Arbora (the earlier gedcom-to-pdf versions are
not counted).

### Viewing and PDF
- Ancestor and descendant charts on screen, laid out the same way as the PDF,
  with generation, Ahnentafel or d'Aboville numbering.
- Person details next to the chart with icons, in the same order as the edit form.
- Navigation: search by name or ID, jump to a repeated branch, back and forward,
  collapsing and expanding branches or whole generations.
- Multi-page PDF (A4, A3, A5, Letter, Legal) with automatic shrinking of wide charts.
- Settings in a window opened by the gear icon, shared by the chart and the PDF,
  plus print settings for the PDF only.
- 12 languages for the page and the PDF.

### Editing
- Edit form for existing people: names, sex, birth, christening, religion,
  marriages and divorce, occupations with dates and places, note, death and burial.
- Suggestions of surnames, places and religions already in the file.
- Dates typed in the local form (`14.5.1891`, `~1890`, ranges) are stored as GEDCOM.
- Undo and redo; download of the edited GEDCOM that keeps every unchanged line.
- The downloaded GEDCOM names Arbora and its version in `HEAD SOUR`, with the date
  and time of saving in `HEAD DATE`.

### File check
- Check of the header, IDs, links between people and families, date form and
  impossible dates (GEDCOM 5.5.1).
- One-click fixes for missing header or trailer, links to nothing, missing links
  back and dates like `1885-12-12`.

### Sample
- The Habsburg family tree from Wikidata (CC0, no living persons) as
  `public/sample.ged`, with sample PDFs.
