# Changelog

## 1.27.0 – 2026-10-13

- The app **remembers the last opened file** and opens it again when the page starts. The file is kept only in this
  browser (IndexedDB); it is never sent anywhere. Unsaved edits are not kept, only the file as it was opened.
- A click on **Arbora** (top left) goes back to the welcome screen, after asking when there are unsaved changes. The
  remembered file stays; the welcome screen offers **Continue with <file>** and a small button to **forget** the file.
- The privacy note of the welcome screen says that the browser keeps the last opened file (all 12 languages).

## 1.26.0 – 2026-10-13

- **Light / dark mode switch** in the top bar, right next to the language menu (sun / moon icon). By default the app
  follows the system setting; once you choose, your choice is kept in your browser and wins over the system. The
  tooltip is translated into all 12 languages.

## 1.25.0 – 2026-10-13

- The **GED** save button now shows the number of unsaved changes in an orange badge in its corner, like a notification
  badge (99+ above 99), instead of the plain dot. The tooltip says what the number is ("unsaved changes: 3"). The count
  is the number of edit steps since the file was loaded or saved; undo lowers it.
- The badge is one component for the save button and the problem count of the file check; it is described in
  `docs/design-guidelines.md`.

## 1.24.0 – 2026-10-13

- New tool in the tool bar: **Recent** (clock icon). It lists the people you visited last (30 are kept), the latest
  on top; a click opens the person. A star on each row, here and in the list of people, marks a **favourite**: favourites are always at the top of
  the list.
- The star also shows next to a favourite's name in the chart and in the person detail, where the star button next to
  the name switches it. It is on screen only and never printed to the PDF.
- Recent people and favourites are kept in your browser for each file separately; they are never written into the
  GEDCOM file.
- Without a person in the detail, the chart uses the full width. Panel titles use the font of the person's name in the
  detail (Spectral, 19 px), and the chart has a title too ("Family tree").
- A click on the selected person deselects it and closes the detail; it works on a name in the chart, in the list
  of people and in Recent. The two lists use one shared row, so they look exactly alike.
- The generic event in the person timeline has a calendar icon now, so the star means only "favourite".

## 1.23.0 – 2026-10-13

- New tool in the tool bar: **Places** (map pin icon). It opens a panel next to the bar with every place of the file,
  the number of people and events that use it, and a filter box. Village and house number stay together: "Dolná 22,
  Okres" and "Dolná 7, Okres" are two places. A click on a place shows the people connected to it, and a click on a
  person opens them. Read-only; no map yet.

## 1.22.3 – 2026-10-13

- All side panels of the tool bar (people, overview, sources and notes, settings) have the same width, 320 px, set by
  one token (`--panel-w`); the design guidelines say so.

## 1.22.2 – 2026-10-13

- The list of people has the same fixed title row ("People") above the search box as the other tool panels.

## 1.22.1 – 2026-10-13

- Every tool panel (file overview, sources and notes, settings, file check, list of people) has the same fixed title
  row: the title no longer scrolls with the content and sits on one line with the chart bar and the person header.
  The title row is one shared component, and the design guidelines now require it.

## 1.22.0 – 2026-10-13

- The chart and PDF settings moved from a dialog to the tool bar: a sliders icon opens them in the left panel, and
  the chart changes while you change a setting. The settings button of the top bar is gone.

## 1.21.0 – 2026-10-13

- New tool in the tool bar: **Sources and notes** (book icon). It opens a panel next to the bar with every source of
  the file and the number of times it is cited, and a second tab with every note. A filter box narrows both lists;
  a click on an entry shows the people who cite it, and a click on a person opens them. Read-only.
- The top bar is now the first row of the frame, in the same height and line as the headers of the panels below it:
  app name, open file, status message, undo / redo, save GED and PDF, settings and language. The page no longer
  has a separate sticky header.
- The welcome screen is the same frame with the app name and the language, and one centred column with the
  description, the drop zone, the privacy note and the sample button, built from the same tokens as the rest.

## 1.20.0 – 2026-10-13

- The design guidelines (`docs/design-guidelines.md`) are now a complete guide: layout, tokens, typography, colours,
  icons, controls and states, and how to add a new tool to the tool bar.
- The interface follows them: new tokens for control and icon sizes, radii, warning and sex colours (no literal
  colours left in the rules), two text sizes (14 and 12px) instead of twelve, three corner radii instead of eleven.
- The person form uses the same fields, buttons and focus ring as the rest of the app; the sex choice is the same
  switch as Ancestors/Descendants. The top bar icons, the language button and the file chip share one height and hover.
- The tool panel is a little wider so the search hint is not cut off.

## 1.19.0 – 2026-10-13

- The file overview (counts, most common surnames and places) moved from the top of the page to the tool bar: a tiles
  icon between the magnifier and the shield opens it in the left panel next to the chart and the detail. After a
  file is loaded the list of people with the search box opens as before; the icon of the open panel is highlighted and
  a second click closes it. The tiles for
  problems and the oldest ancestor still open the file check and make that person the root of the chart.
- The two save buttons in the top bar look alike: GED (the edited file) and PDF, both flat like the other icons of the bar, with an icon and a label.

## 1.18.0 – 2026-10-13

- The file check moved to the tool bar: a shield icon under the magnifier (with the number of problems on it) opens it
  across the whole width of the frame in place of the chart and the detail, with the tabs (Issues, Surnames, Places,
  Hidden) as a list on the left. The icon of the open panel is highlighted and a second click closes it. Only one
  panel is open at a time. The shield is gone from the top bar.

## 1.17.0 – 2026-10-13

- A narrow bar of tools sits at the left edge (for now with one icon, a magnifier; more will follow). Clicking an icon
  opens its panel next to the bar, here the list of people with the search box; the icon of the open panel is
  highlighted and a second click on it closes the panel. The panel starts closed and the choice is remembered between visits.
- The app is one frame in the style of a trading terminal: the tool bar, the list, the chart and the detail sit side by
  side divided by thin lines instead of separate cards. The first row of every panel has the same height with one line
  under it, controls (search box, switches, icon buttons) share one height, icon size and corner radius, and the
  scrollbars are thin and quiet. The rules and size tokens are in `docs/design-guidelines.md`.

## 1.16.0 – 2026-10-13

- The person detail is built from a small set of blocks (`src/ui/Section.tsx`): every block is a Section with a title
  row, and every line with an icon is a Row. Sizes, spacing, icon column and colours are tokens in one place in
  styles.css, so parents, timeline, employment, religion, note and sources line up the same way (icons in one
  column, text in another, one icon size, 14px text and 12px titles) and a new block needs no extra CSS. Sections are separated by a thin line and the icons of the lines inside a section
  are a little smaller than the icon in the section title. The parents are a small timeline: the parent born first,
  then the other parent, and the marriage last.
- The sources button of a timeline event sits at the right end of the first line of the event.

- The birth of a child on the timeline shows the place in the brackets after the child's name, like every other
  reference to a person, instead of after a dot. The name in such a reference is bold and in the text colour, like in the tree.
- On the timeline the first line of an event is the date, what happened and the age (for example "14.5.1991 · Birth of a
  son · at 25"); the second line is the person or the place. The label no longer sits before the name with a colon.
- The detail uses only two text sizes: 14px for the content and 12px for titles, labels and small print (the 13px and
  13.5px variants are gone).
- The timeline has its title again (room for a future "add" button). Employment, religion, attributes and associates
  are sections with the same title style as parents, note and sources, with no circled icons; there is more space
  between the sections.

## 1.15.1 – 2026-10-13

- The parents are a section with a title (icon and "Parents") and one parent per row, with the sex icon.
- Each parent shows the place of birth, and the date and place of the parents' marriage sit between them when known.
- The detail shows only the municipality of a place (the part before the first comma). The marriage icon of the
  parents is coloured like the marriage on the timeline.
- A reference to a person (parent, spouse, child, witness, associate) reads like the middle panel: name and, in one pair of
  brackets, the year of birth (green) and the municipality of birth (muted italics), as in the overview.
- Parents, note and sources and notes share one section title style.
- The icon of a child's birth in the timeline is coloured by the child's sex.

## 1.15.0 – 2026-10-13

- Person detail is more compact. The timeline has no heading and no dot on the line: each event has one
  coloured icon (birth, residence, marriage, children, death and so on). The parents sit in one bar under
  the name and the years of life are shown before the ID.

## 1.14.0 – 2026-10-13

- The Ancestors / Descendants choice is now a compact switch above the tree. The two large cards, the
  back and forward arrows, the chart title and the line of hints above the tree are gone to save space.
  Alt+Left and Alt+Right still walk through the history.
- The search box says what it finds: name, place, year.
- The number of generations moved from the settings to a switch (3, 4, 5, all; all by default) next to the
  Ancestors/Descendants switch. It still applies to both the chart on screen and the PDF. A value set
  earlier (for example 7) stays available as an extra button. Each button has a tooltip, for example
  "children and grandchildren" for 3 generations of descendants.

## 1.13.0 – 2026-10-13

- New layout on wide screens: the page uses the full width and has three columns. On the left is an
  always-visible list of all people (sex, name, years), in the middle the tree, on the right the detail.
  Each column scrolls on its own. Clicking a person in the list makes them the root of the chart, as the
  search does. The list is hidden on narrow screens for now.
- The search box moved from above the tree to the top of the people list and filters that list directly,
  without a popup. It finds people by name, place of birth or death, and year; words can be combined
  (for example "anna graz 1894").

## 1.12.0 – 2026-10-12

- Fixed: when a record is written anew after an edit, values that were not changed keep their line breaks
  (CONC/CONT) and the spaces at their edges exactly as in the file. Before, long lines were re-split and
  leading spaces were dropped.
- New tests: saving with the program stamp changes only the header, and Windows line endings survive.
- This completes the integrity checks of editing (phase 2).

## 1.11.2 – 2026-10-12

- New tests: unifying surnames and places changes only NAME and PLAC lines (aka names, notes, sources and
  unknown tags stay), every one-click fix of the file check changes at most a line or two, and checking the
  file or looking for variants changes nothing.

## 1.11.1 – 2026-10-12

- Fixed: changing the given name of a person whose name has no slashes (for example `Karol I.`) wrote `//`
  after it. A name without a surname now stays without slashes; one already written with `//` keeps them.
- New tests: every change in the person and family forms touches only its own lines, and every person and
  family of the sample, changed and changed back, gives the file exactly as it was.

## 1.11.0 – 2026-10-12

- A collapsed "Record" line at the end of the person detail shows the technical lines of the record: when it
  was last changed (CHAN), reference numbers (REFN, RIN), a unique ID (_UID) and linked media files (OBJE).
- New tests keep the promise that showing a file never changes it: a made-up file with every tag the
  detail shows, and tags Arbora does not know, is written back as it was, and changing a person or a family
  keeps all their other lines. This completes the viewer: the detail now shows the important GEDCOM tags.

## 1.10.0 – 2026-10-12

- A name prefix such as "Dr." is shown before the name in the heading. Under the name come the nickname, called name, surname prefix and suffix, and any
  other names that are not aka names (for example a married name, with its type).
- A place with coordinates (MAP, or a linked _LOC record) gets a small pin on its timeline row that opens
  the point on a map in a new tab.
  Display only: editing is unchanged and all lines are kept when a record is edited.

## 1.9.0 – 2026-10-12

- Associations (ASSO) are shown in an "Associations" block: the people a person names, such as godparents
  and witnesses, and in the other direction the people who name them (the godchildren of a godparent).
  Each is a link to the person. Display only: editing is unchanged and all lines are kept when a record
  is edited.

## 1.8.0 – 2026-10-12

- Family events are shown. Engagement, banns, marriage contract, licence and settlement, annulment, a
  divorce with a date or place and any custom family event (EVEN) join the timeline of both spouses.
  A marriage shows its witnesses (as links to the people) and the agency or address written on it.
  Display only: editing is unchanged and all lines are kept when a record is edited.

## 1.7.0 – 2026-10-12

- More of a person's life is shown. Standard events (baptism, blessing, cremation, adoption, confirmation,
  first communion, ordination, census, emigration, immigration, naturalisation, graduation, retirement,
  probate, will) join the timeline. Under any event the age, cause, agency and address written on it are shown.
  Education, nationality, title, property, social rank, description, number of children, ID number and
  other facts get their own blocks under the timeline. Display only: editing is unchanged and all lines
  are kept when a record is edited.

## 1.6.0 – 2026-10-12

- Residences (RESI) and custom events (EVEN, titled by their TYPE) are now on the person's timeline, with
  date, place, age, an address written on the line, and their sources and notes. Display only: editing is
  unchanged and these lines are kept as they are when a record is edited.

## 1.5.0 – 2026-10-12

- Sources and notes are now shown. A birth, christening, death, burial or marriage that carries a source
  or a note gets a small icon with the count on its timeline row; click it to read them below the row.
  Notes and sources of the person as a whole (the record, its names and other lines such as occupation)
  are in a "Sources and notes" block under the timeline. Cited source records are resolved to their title,
  page, author, publication and repository; notes may be written inline or be NOTE records.
  Web addresses in them are clickable links and simple HTML tags such as <i> are not shown. Display only: editing is unchanged and all source and note lines are kept when a record is edited.

## 1.4.0 – 2026-10-12

- Person form: the given name field now offers the given names already in the file, like the surname field.
  Suggestions for both come only from main names; aka names are no longer offered.

## 1.3.4 – 2026-10-12

- Bulk fix: the manual rename bar reads "Original… → New…" and every group is now a small card with three lines that read without
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
