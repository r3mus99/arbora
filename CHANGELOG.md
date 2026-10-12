# Changelog

## 1.3.4 – 2026-10-12

- Bulk fix: every group is now a small card with three lines that read without
  knowing the software: the spelling variants as chips (check = will be unified,
  X = excluded), below them the text everything changes into ("Change to", editable)
  with the Unify and hide buttons at the end of that line, and the affected records
  (collapsed, expandable) on the last line.

## 1.3.3 – 2026-10-12

- Bulk fix: spelling variants that will be merged are now drawn normally with a
  check mark, variants that are excluded (they keep their own spelling) are dimmed
  with an X. Previously it was the other way round, with arrow and x icons.
- The "to" fields of the bulk fix (and the batch rename bar) are wider, so long
  place names are readable.

## 1.3.2 – 2026-10-12

- Fixed the order of the person timeline: a death without a date ("Died") no longer
  lands between the children's births but comes after all dated events, an undated
  burial comes last and an undated birth or christening comes first.

## 1.3.1 – 2026-10-12

- Bulk fix of places no longer merges different house numbers: "Ostbach 19",
  "Ostbach 22" and "Ostbach 49" are three separate places, never merged into
  each other or into the bare town. Only spellings of the same house number
  (e.g. "Ostbach 22" and "Ostbach 22, District, Country") are grouped, and the
  town itself ("Ostbach", "Ostbach, District, Country") is grouped on its own.

## 1.3.0 – 2026-10-12

- The tree view is easier to scan: names are bold, birth dates green, marriages
  gold, deaths dark brown and places muted italics, and every second line is
  slightly tinted. Row height and layout stay the same.
- The PDF takes over the bold names and italic places.
- New print setting "coloured PDF" puts the dates and places in the same colours
  on paper. It is off by default, so printouts stay black and white.
- Bulk fix of places now covers the whole place, not just the town: "Ostbach",
  "Ostbach 19" and "Ostbach, District, Region, Country" (also with the region or
  country in another language) are grouped as one place and unified as a whole.
  Spellings with another house number or another known country (e.g. Czechoslovakia
  next to Slovakia) are kept unless you choose to replace them.
- Search also finds people by year: typing 1894 (or just 189) matches the year of
  birth or death, alone or together with a name.

## 1.2.0 – 2026-10-12

- The top bar stays at the top of the window while the page scrolls.
- Dates with a month but no day show the month name, e.g. "Oct 1961" instead
  of "10/1961", in all 12 languages, on screen and in the PDF. The edit form
  also accepts month names ("Oct 1961", "1961. okt.").
- The person detail shows the person's life as a timeline: birth, christening,
  marriages, births of sons and daughters, death and burial in date order, each with a
  coloured dot, an icon, the place and the person's age at the time.
  Parents, religion, occupation and notes stay above and below it.

## 1.1.1 – 2026-10-12

- Lines that are not GEDCOM (a comment from another program, a blank or damaged
  line inside a record) are no longer lost when that record is edited or fixed:
  they are written back at the same place.

## 1.1.0 – 2026-10-12

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
- Seven page texts that no code used any more are gone from all twelve
  languages, `step3` is now `settings`, and the error for an unknown person
  in the PDF is in English like the rest of the code.
- The browser tab keeps the title from `index.html` instead of replacing it.
- `App.tsx` is smaller: the undo/redo and back/forward histories are plain
  functions (`src/ui/history.ts`), the chart options and how they are read
  from the browser are in `src/ui/options.ts` (a stored option with a value
  that is no longer valid now falls back to its default instead of reaching
  the PDF), and the settings dialog and the file box are components of their
  own. Behaviour is unchanged.
- No lint warnings are left: the page no longer sets state in effects or writes
  refs while rendering.
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
