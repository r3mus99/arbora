# Changelog

## 2.119.0 – 2026-11-03

- **Teal accent colour.** Buttons, links, the logo, selected rows and the active tab and rail icon are teal instead of purple, in both light and dark mode.

## 2.118.0 – 2026-11-03

- **A source button on a person's event now shows that person's sources.** The Sources panel lists only the sources cited for that person (with a × to show all again), and the clicked source stays opened.

## 2.117.0 – 2026-11-03

- **A residence in the timeline shows its address next to the date.** "1930 · Mill Road 4" on the first line, like the birth shows its place, and "Residence · aged 42" below.

## 2.116.0 – 2026-11-03

- **The timeline no longer has a note button.** An event note is always written under the event, so the note icon and the click to unfold it are gone; the sources button stays.

## 2.115.0 – 2026-11-03

- **People and Recent lists show "Surname, Given name" and the People list is sorted by surname.** Sorting follows Slovak letter order (Č after C, Ch after H); people without a surname are listed last.

## 2.114.0 – 2026-11-02

- **The sources button of an event opens the source in the Sources panel.** The sources are no longer listed under the event in a person's detail (and their title is no longer edited there); the button opens the Sources panel with the source marked in the list and opened in the window, where it is read and edited. The notes of an event still unfold under it.

## 2.113.0 – 2026-11-02

- **Sources: names in citations are links, and a magic wand writes the title.** A click on a person's name in a source's citations selects that person; the wand next to the title writes it from a citation (for example "Baptism Jan Novak 1850"), preferring a citation of a concrete event.

- **Sources and notes: the filters are gone.** The list shows the whole file and only the search box narrows it; the filter button with "Selected person / Whole file" and the kinds of event is removed. The sources of one person are in that person's timeline.

## 2.112.1 – 2026-11-02

- **The event of a citation added in the source window can be changed.** A citation just added (for example with "Add also") shows an event choice instead of fixed text, so a parent can be cited for the birth instead of "Person". Saved citations keep their event, as their page text and address belong to it.

## 2.112.0 – 2026-11-02

- **Sources and notes: one place to read and edit a source.** A click on a source in the list opens it in the middle of the screen, in place of the tree, and the person's detail stays on the right; the unfold in the list and the "Edit source" button are gone. Delete source moved to the footer next to Cancel and Save, and the filters (selected person / whole file, kind of event) sit behind one button next to the search field. Switching to another source asks before it drops unsaved changes.

## 2.111.1 – 2026-11-02

- **The "Add also" parent buttons stay in place.** A parent that was added stays in the row, marked, so a second click cannot add the other parent by accident; the suggested title of a christening or burial source now also has the year.

## 2.111.0 – 2026-11-02

- **A new source is easier to fill in.** The source window offers the selected person as the first citation, suggests the title from the first citation (for example "Birth Jan Novak 1755") until you type your own, and a new link or note row is added with the + at the end of the row instead of appearing by itself.

## 2.110.0 – 2026-11-02

- **The source window offers to cite the parents too.** Under a citation of a birth or christening, the parents who are in the file and do not cite the source yet appear as "Add also" buttons; one click adds a citation for that parent (after Save).

- **The source window always shows the link and note rows.** The "Add link" and "Add note" buttons are gone: an empty link row and an empty note row are always there, and filling the last one makes room for the next.

- **The person search in the source window has its caption.** "Find person" in the new citation form shows the "Person" caption on the left like the "Event" row below it.

## 2.109.0 – 2026-11-02

- **Notes are edited only in the edit window.** Clicking a note in the detail no longer turns it into a text area that shrinks; short one-line values (name, date, place) are still edited in place.
- **The "back to list" arrow in the person detail is gone.** It showed on every narrow window and did not work properly on phones.

## 2.108.1 – 2026-11-02

- **A removed citation disappears from the source window.** After the trash button was pressed, a citation that had a web address stayed in the list until saving; it is now hidden at once and counted as an unsaved change.

## 2.108.0 – 2026-11-02

- **The source window shows the page text of a citation.** A citation that has no web address but a page text (for example "Chronicle, line 12") shows that text instead of an empty row, and it can be edited there.

## 2.107.1 – 2026-11-02

- **A citation under a marriage can be removed from the source window.** Citations written directly under a family (shown with two people) had no trash button; they now have one and are removed like any other citation.

## 2.107.0 – 2026-11-02

- **The death in the edit window has no hidden "Details".** The cause of death is a normal row and the note is added with "+ Add note" in the death's title row, like the birth. The "Details" button and its styles are gone from the editor.

## 2.106.0 – 2026-11-02

- **Godparents and witnesses are easier to read in the edit window.** The "Associations" part is renamed, its button is a short "Add a person", and the role is a labelled row ("Role") instead of a cut-off placeholder. Several of them are shown as separate cards.

- **The "Notes and sources" part of the edit window is now called "Note".** It only ever held the person's note (sources are edited in the Sources app), so the name now says what it contains.

- **Occupation in the edit window is laid out like a residence.** The section is called "Occupation", "Add occupation" sits in its header, and each occupation shows labelled rows for the occupation, date and place (no hidden "Details"). Several occupations are separate numbered cards.

- **The "Other" section of the edit window is gone.** Access restriction and the address of a person are no longer shown or edited (the residence keeps its own address). Existing restriction and address lines stay in the file unchanged.

- **Switches are smaller and read like the other rows.** The deceased and divorced switches (and the one for a new child) are now 36 px wide, and their name sits in the label column like the other fields, with the switch in the value column.

## 2.105.0 – 2026-11-02

- **Residences are cards and the "copy" shortcuts sit in the field row.** When a person has several residences, each is its own numbered card, like several marriages, so they no longer run together. "Copy from birth", "Copy from death" and "Copy from parents" moved from the title row into the place row they fill, so the title row always holds the same actions in the same place.

## 2.104.0 – 2026-11-02

- **Marriage and divorce have fewer fields.** The marriage date and place are always shown, age, cause and agency are gone, a note is added with "+ Add note" on the marriage only, and the divorce keeps just date and place. Engagements, banns, contracts, other family events and the marriage witnesses are no longer shown on the timeline; they stay in the file.

## 2.103.0 – 2026-11-02

- **The birth, christening, death, burial and residence have fewer fields in the edit window.** Age and agency are gone everywhere, the cause stays only at the death, the burial and christening keep just date and place (and religion), and a note is added with "+ Add note" at the birth, death and residence and shown in italics under the event. The residence address is always visible as "Street, number". Existing lines in a GEDCOM file are left untouched.

## 2.102.0 – 2026-11-02

- **Other names (aka) are rows like the rest of the edit window.** The label "Also known as" stands on the first row, the given name and surname are fields next to it, and adding another form of the name is a row below.

- **The edit window no longer offers the title, name suffix, nickname and surname prefix.** The Person section keeps given name, surname, sex and other names; these four parts of a name are not shown in the person detail either, and existing GEDCOM lines stay in the file untouched.

## 2.101.0 – 2026-11-02

- **The sex choice in the editor uses icons.** Male, female and unknown are shown as ♂, ♀ and a question mark with the name as a tooltip, the chosen one in the same blue or red as the people list.

## 2.100.0 – 2026-11-02

- **The Sources panel has no field labels.** The author sits under the source title, the count moves into the "Citations" heading once a source is open, publication, notes and links are told apart by style instead of labels, each citation is one line "person · event" with its address below, and "Edit source" is a full-width button at the bottom of an opened source.

## 2.99.0 – 2026-11-02

- **The source window and the Sources panel are tidier and consistent.** Links and notes of a source are rows of the Source part, every citation in the source window is a block of labelled rows (Person, Event, Link) with one divider between citations and the part is called Citations. In the Sources panel an opened source shows labelled fields (Author, Publication, Notes, Links), the citations as Person, Event and Link, and Edit source as a pencil.

## 2.98.0 – 2026-11-02

- **Every citation of a source has its own address row in the source window.** The "Cited for" part now follows the file: the person, under it the event, under it a Link row, also when the citation has no address yet, so an address can be added there; the separate "Links in citations" part is gone.

## 2.97.0 – 2026-11-02

- **Links that sit in citations can be seen and edited in the source window.** The source window has a new "Links in citations" part that lists the web addresses written in the citations of the source (for example the FamilySearch links of each person) and lets you change or remove each one; only the address changes, the rest of the line stays.

## 2.96.4 – 2026-11-01

- **Cleanup after the removed features.** The README no longer mentions the keyboard shortcuts for undo and redo, six lint warnings are gone, and a new test checks that editing a person keeps contact, reference number, pedigree, event and fact lines that the editor no longer shows.

## 2.96.3 – 2026-11-01

- **The file overview and the list of places are gone.** The icon rail no longer has the Overview and Places tools; the file check, sources and notes, and everything else stay as they were.

## 2.96.2 – 2026-11-01

- **The back and forward history through viewed people is gone.** Alt+← / Alt+→ no longer step through earlier people; undo and redo of edits are unchanged.

- **Keyboard shortcuts are gone.** Undo, redo, save, search and settings are reached with their buttons only; a text field keeps its own undo, and the browser keeps its keys.

## 2.96.1 – 2026-11-01

- **The map link is gone.** Events no longer show a pin that opened the place on a map; the places in the file, including any coordinates, are kept untouched.

## 2.96.0 – 2026-11-01

- **The tree no longer has collapsible branches.** The − / + on the connector, the "+N" count and Shift-click for a whole generation are gone; the chart always shows the whole tree, as the PDF does.

## 2.95.0 – 2026-11-01

- **The person editor and detail are simpler.** The origin type (birth, adopted, foster) of a parent family, other events (baptism, census, custom events…) and other facts (education, nationality, title…) are no longer shown or edited; residences stay. The lines stay in the file unchanged, and merging two people still carries them over.

## 2.94.0 – 2026-11-01

- **The edit window no longer has contacts and reference numbers.** Phone, e-mail, fax, web, reference numbers (REFN), AFN and RFN are gone from the edit window, and reference numbers are gone from the record details. The lines stay in the file untouched, and merging two people still keeps them.

## 2.93.5 – 2026-11-01

- **Merging two people is covered by a safety test.** Contacts, reference numbers, extra events and facts, and parents with their pedigree type are checked to survive a merge.

## 2.93.4 – 2026-11-01

- **The file check no longer suggests moving a parent's source to the child's event.** The sources in the file are untouched.

## 2.93.3 – 2026-11-01

- **Internal cleanup of the surname ending rule code.**

## 2.93.2 – 2026-11-01

- **The file check no longer looks at Polish surname endings.** The Slovak and Czech rules (-ová, -á) stay.

## 2.93.1 – 2026-11-01

- **The bulk rename of sources is gone.** The Sources list no longer offers to rename all sources at once; a single source is still renamed from the Sources panel.

## 2.93.0 – 2026-11-01

- **The bulk spelling fix is gone.** The Bulk fix tool (its toolbar icon, the groups of spellings of surnames, given names and places, and the country-name translations behind it) was removed to keep Arbora simple. The file check, the overview and the edit window are unchanged, and no data in a file is touched.

## 2.92.1 – 2026-11-01

- **Arbora now speaks only Slovak and English.** The other ten interface languages are gone, together with their page texts, PDF texts and flags. A language saved in the browser that no longer exists is replaced by the browser's language (Slovak, otherwise English). Gendered surname suggestions follow the Slovak interface or the surnames in the file; the Polish rule that depended on the interface language is removed.

## 2.92.0 – 2026-11-01

- **Sources have their own wide edit window.** The Sources panel opens it with + for a new source and with "Edit source" for an existing one. It edits the title, author, publication, web links and notes, shows and changes the people and events the source is cited for (including marriages, divorces and residences), and deletes the source with its citations. The person's edit window no longer lists sources.

## 2.91.0 – 2026-11-01

- **Sources can be cited for a marriage, a divorce or a residence from the Sources panel.** A marriage or divorce is cited under one of the person's families.

## 2.90.0 – 2026-11-01

- **Sources are edited in the Sources panel only.** A source's title, author, publication, notes and web links are changed there, and the timeline shows the same text. The person's edit window no longer lists sources; a source is cited for a person or for their birth, christening, death or burial from the panel. Citations already in the file are kept as they are.

## 2.89.0 – 2026-11-01

- **One selection for the whole screen.** The person you select in the list, the recent panel, the tree or a link in the detail is the centre of the tree, the one shown in the detail, the one highlighted in the list, and the one the home person box sets. A click on the selected person changes nothing.

## 2.88.0 – 2026-11-01

- **Web links of a source can be added and removed in the Sources panel.** The timeline shows the same links on every event that cites the source.

## 2.87.0 – 2026-11-01

- **The home person box sets the selected person as the home person, with one click.** The house button beside it appears once a home person is set and goes to that person.

## 2.86.0 – 2026-11-01

- **The magic wand beside a source title in the person detail is gone.** Renaming a source stays one click on its title, and the suggested names remain available in the Sources list.

## 2.85.0 – 2026-11-01

- **The return-home house sits right after the home person box in the top bar.** It is no longer among the undo and save buttons.
- **Clicking the home person box sets the selected person at once when no home person is set yet.** With a home person set, the click opens the list of people to choose another.

## 2.84.0 – 2026-11-01

- **Sources in the edit window start folded and are visually separated.** Each source is its own bordered card showing just the source and its link; Page and Reliability open with the Details button. Editing, removing and "Add source" work as before.

## 2.83.0 – 2026-11-01

- **The home person sits in the top bar, next to the file.** Its name is shown in a box like the file name. A click opens the list of people, and the next person you click becomes the home person. The house button beside it goes to that person.

## 2.82.0 – 2026-11-01

- **The person header shows only the name and the edit pencil.** The sex symbol, the favourite star and the centring button are gone from the header. Sex is set in the edit window, favourites in the people list and recent panel. The home-person button moved to the top bar, next to the return-home button.

## 2.81.0 – 2026-11-01

- **A person's sources and notes moved from the detail to the sources and notes panel.** The detail is shorter and the name gets more room. When a person is selected, the panel starts filtered to that person; a chip with the name switches the filter off.

## 2.80.1 – 2026-11-01

- **A source shown at an event is no longer repeated in "Sources and notes".** The card under the timeline keeps only the sources that are not shown at any event of the person.

## 2.80.0 – 2026-11-01

- **Sources can be filtered by the kind of event they are cited under.** In Sources and notes, chips for birth and baptism, death and burial, marriage and other (also citations on the person themselves) show only the sources cited under those events; a source cited under several kinds appears under each.

## 2.79.0 – 2026-11-01

- **Source titles are named by the event and the year.** A source cited under one event gets "Birth Jan Novak (1900)", "Christening …", "Wedding …" with the year of that event in brackets. The title is edited in place in the person detail, with a pencil, and a suggested name is offered when it differs. The bulk rename in the Sources list is gone.

## 2.78.0 – 2026-11-01

- **Renaming all sources is easier to find and to control.** The Sources panel shows a full-width "Rename all" button with the count, and the preview says "N of M selected" with "Select all" and "Select none".

## 2.77.0 – 2026-11-01

- **Sources show every filled field, no Details fold-out.** Under the source title the person detail and the Sources panel list the page, author, publication, repository and quality as short labelled lines, web addresses as chips, and skip text that only repeats another line; the file itself is never changed.

## 2.76.0 – 2026-11-01

- **The person heading looks the same however long the name is.** A long name that wraps keeps the sex symbol right after its last word, the dashed underline runs under every line, and the icons stay aligned with the first line.

## 2.75.0 – 2026-11-01

- **Sources can be renamed like a new source.** In the Sources panel a magic wand renames all sources cited exactly once to the event and people ("Birth Jan Novak") after a preview, or one source from its opened row; one undo step, the old title stays in a note of the source.

## 2.74.0 – 2026-11-01

Sources and notes of an occupation, religion or other fact (education, title, …) now appear on that fact instead of in the general "Sources and notes" section.

## 2.73.0 – 2026-11-01

- **A new source under an event is named after it.** Adding a source to a marriage fills in "Wedding Jan Novak & Eva Novak", to a birth "Birth Jan Novak", and so on in all 12 languages (in Slovak "Svadba…", "Narodenie…"); the name stays editable, and a source of that name already in the file is cited instead of a duplicate.

## 2.72.0 – 2026-11-01

Sources under an event are shorter: the title, the page or detail, and web addresses as small link chips named after the site. The publication text, retrieval times and the full original wording are kept under "Details".

## 2.71.0 – 2026-11-01

- **Notes under events can be edited.** The Details of a birth, christening, death, burial, other event, marriage or divorce now has a multi-line Note field; a link to a shared note record is left untouched.

## 2.70.1 – 2026-11-01

- **A source with a page or link but no source title is no longer lost on Save.** Save now waits and marks the empty source field, instead of silently dropping the citation.

## 2.70.0 – 2026-11-01

- **The file check finds sources written on a parent that are really about a child.** When a church-book style source ("Entry for …, 11 May 1753") on a parent has the day of a child's christening (or birth, when there is no christening), the check offers one click to cite it under that child's christening and on the other parent too. The parent keeps the citation, and the parent's own timeline now shows the source on the child's line. Nothing is offered for vague dates, twins or sources the child already has.

## 2.69.0 – 2026-11-01

- **Sources in the edit window show more.** A cited source now wraps its full title instead of cutting it, and shows the source's web link or publication line and the citation's note under it (read only).

## 2.68.0 – 2026-11-01

Source citations can now be added and edited under the marriage and the divorce in the edit window, the same way as under other events.

## 2.67.1 – 2026-11-01

- **Adding a source no longer dumps the whole list of sources.** The source field is now a text field that offers at most 8 matching sources while you type, and still accepts the text of a new source.

## 2.67.0 – 2026-11-01

- **The sex symbol stays beside the name in the person detail heading.** It no longer drops onto a line of its own; a long name wraps and the symbol stays next to it.

## 2.66.0 – 2026-11-01

- **Add a source to any event.** In the edit window, birth, christening, death, burial and every other event now have an "Add source" button: pick a source and put the page or a web link to the record in the Page field. Existing citations under events can be edited too; everything else in the file stays untouched.

## 2.65.0 – 2026-11-01

- **A date shows its weekday on hover.** Point at a full date in the detail (for example 3 Mar 1842) and the tooltip names the day of the week, in the language of the app. Dates before 1582 are read as Julian. Years, months, "about" and ranges show nothing.

## 2.64.0 – 2026-11-01

- **A baby's age is shown in months or days.** Between birth and baptism, or at death, an age under one year is shown in months, and under one month in days, instead of "0 years", in the person's events and on the poster. When the dates cannot tell (a year or a month alone), no age is shown.

## 2.63.0 – 2026-11-01

- **Parents and children in the person detail show Father/Mother and Son/Daughter.** The timeline rows now read "Father · place", "Mother · place", "Son", "Daughter" (in all 12 languages) instead of "Groom's birth", "Bride's birth", "Son born" and "Daughter born".

## 2.62.0 – 2026-10-22

- **Downloaded PDF and poster file names now contain the person, ancestors or descendants and the number of generations** (e.g. `maria-theresia_ancestors_7g.pdf`).

## 2.61.0 – 2026-10-21

- **The app has a purple accent.** Buttons, the selected person, links and focus are purple instead of green; birth stays green, and the poster and PDF colours are unchanged.

## 2.60.1 – 2026-10-21

- **Poster with 10 generations is drawn about ten times faster.** The branch and label placement looks up only nearby points, so a big tree no longer takes half a minute; the poster looks exactly the same.

## 2.60.0 – 2026-10-20

- **The SVG tree poster also draws descendants.** With the Descendants chart chosen, the SVG button makes a poster of the person's descendants: a column for each generation, the partners beside every person and one trunk with a branch for each child. It shows at most 6 generations (fewer for a very large family, at most 500 people); the plates, branches and border are those of the ancestors poster, and from 5 generations on under the tree it has one list of places and names of all descendants and under it the ruler of the generations.

## 2.59.1 – 2026-10-20

- **Colours that were wrong in the dark theme are fixed.** The counter on the tool icons is readable in the dark theme, the magnifier and the arrows in the fields follow the theme, and the icons of christening, residence, other events, children and burial have their own lighter colours there. The child icon is a little darker in the light theme.

## 2.59.0 – 2026-10-20

- **Poster branches look more natural.** Long branches grow longer side shoots, and the shoots split again into finer twigs; marriage labels no longer overlap each other.

## 2.58.0 – 2026-10-20

- **The poster says it was made by Arbora.** A small line in the bottom right corner, "Created with Arbora 2.57.0 · 20 Oct 2026" (in the poster language), shows the program version and the date of the download.

## 2.57.0 – 2026-10-20

- **One green and one red on the screen.** The accent of the app is now the same forest green as birth years, errors and women use the same brick red as on the poster, and the switches in the edit window turn on in the accent colour instead of a separate bright green.

## 2.56.0 – 2026-10-20

- **Marriage has its own gold colour.** The poster draws the rings, the marriage year and the number of children of a couple in dark gold, and the screen and the PDF use the same gold for marriage dates.

## 2.55.0 – 2026-10-20

- **The poster plates show the places on a third line, and birth, death and places have one colour everywhere.** With "Show places" on, a big plate keeps the name and the years and adds `* Graz   ⌂ Prague   † Vienna` in grey under them (one place in the same town is not repeated, long names are cut). The birth year and the poster leaves are one green, the death year, the marriage year and the branches one dark brown, places one grey, on the poster, in the tree and in the PDF.

## 2.54.0 – 2026-10-20

- **The edit window is narrower.** With the row-based fields it no longer needs 560 px; it is now 520 px wide, so the tree keeps more room.

## 2.53.0 – 2026-10-20

- **Tree poster plates with places are only as tall as their rows need.** A person with two rows no longer gets the space of three, and a person without any place keeps the plain plate.

## 2.52.0 – 2026-10-20

- **The tree poster shows where people were born, lived and died.** With "Show places" on, the plates of the first four generations get a row each for the birth place, the residence and the death place, with the dates in the same rows.

## 2.51.1 – 2026-10-20

- **Generations control fits all languages.** The "all" segment is no longer cut off, and the note about the 10-generation poster limit (now naming the SVG poster) appears only when all generations are selected.

## 2.51.0 – 2026-10-20

- **The tree poster's border has rounded corners.** The border and the statistics frames now match the rounded plates and the title frame, so every box on the poster follows one rule.

## 2.50.0 – 2026-10-20

- **The delete button of an alternative name sits at the end of its row.** In the person edit window the trash can of each "Also known as" name is now on the same line as the name fields, like in events and attributes.

## 2.49.0 – 2026-10-20

- **Search boxes look like the other fields.** The search and filter fields in the people list, places, sources and bulk rename use the same row look as the edit window.

## 2.48.0 – 2026-10-20

- **Same fields everywhere.** Settings, merge, bulk rename and the person pickers now use the row fields of the edit window, and checkboxes and radios share one accent colour.

## 2.47.0 – 2026-10-20

- **One setting for the number of generations.** The chart, the PDF and the SVG poster now share it; the poster has no number of its own and the "Graphic output (SVG)" section and the Screen / PDF / SVG chips are gone from Settings. Ancestors / Descendants and the generations moved into Settings, and the bar above the tree shows the choice ("Ancestors · 4 generations") as a shortcut that opens Settings. The poster draws at most 10 generations.

## 2.46.0 – 2026-10-20

- **The poster's generation ruler appears together with the corner statistics.** Both show up automatically from 5 filled generations; smaller posters stay clean.

## 2.45.0 – 2026-10-20

- **The statistics in the corners of the tree poster stand in a frame.** Each of the four blocks has the same double-line frame as the title, a heading row and a column of labels, so the first values of all rows line up.

## 2.44.1 – 2026-10-20

- **Marriage details sit with the marriage in the edit window.** Date, place, age, cause, agency and divorce are now shown right after the spouse, above the children, instead of below them.

## 2.44.0 – 2026-10-20

- **The tree poster's generation ruler runs through the middle of the title frame.** The title and the time axis read as one, the generations hidden behind the frame have no label, and the corner lists moved below the ruler.

## 2.43.0 – 2026-10-20

- **The fields of the edit window are rows.** Every field has its name in a fixed column on the left and the value next to it, with hairlines between rows, one hover and one focus look for text, date, place, select and switch. The "Details" button is a small, quiet text under its rows.

- **Save keeps a new person that is filled in.** When a new child, spouse or parent is typed in the edit window but "Add" was not pressed, the Save button at the bottom now adds that person too and saves everything else in the same step.

## 2.42.0 – 2026-10-19

- **Every corner is rounded the same.** Fields, buttons, chips, switches and cards all use one 10 px radius; fields are rounded at the top so their underline stays straight.

## 2.41.0 – 2026-10-19

- **Keyboard shortcuts and small transitions.** ⌘F (Ctrl+F) searches the list of people, ⌘S downloads the GED, ⌘, opens the settings and ⌘Z / ⇧⌘Z undoes and redoes; the shortcut is shown in the button tooltips. Panels slide in and the detail fades in when another person is chosen; with "reduce motion" set in the system there is no animation.

## 2.40.0 – 2026-10-19

- **The person detail is made of cards.** The sections (parents, timeline, …) are inset cards, like the parts of the edit window.

## 2.39.0 – 2026-10-19

- **"Deceased" and "Divorced" are iOS-style switches, and cards and dialogs have rounder corners.** The system font stack now names SF Pro explicitly on Apple devices.

## 2.38.1 – 2026-10-19

Spouses are always shown in the descendants chart and the PDF; the "Show spouses" setting is gone.

## 2.38.0 – 2026-10-19

- **On a phone, Arbora shows the list of people and one person at a time.** The chart is hidden on narrow screens; tap a person to see the detail, use the back arrow to return to the list.

## 2.37.0 – 2026-10-19

- **The tree poster shows the corner statistics on its own.** The "Places and name statistics in the corners" checkbox is gone: from 5 generations that are really on the poster each of the four main branches gets its list of places, first names and surnames, as long as the branch has at least 5 people.

## 2.36.0 – 2026-10-19

- **The PDF is always A4, in colour, and turns landscape on its own.** The page size, orientation and colour settings are gone; the font shrinks down to 6 pt and the pages become landscape only when even that does not fit a portrait page. A printer can scale the A4 PDF to Letter and other papers.

## 2.35.0 – 2026-10-19

- **Places are one checkbox.** "Show places" prints the municipality of birth, marriage and death and, when it differs, the residence. The "full place" choice and the separate residence checkbox are gone; settings saved earlier are converted.

## 2.34.0 – 2026-10-19

- **The tree poster has a ruler with the generations.** Under the title a line like a measuring tape marks "1. generation", "2. generation" and so on over the columns of plates, to both sides, with how many of the possible people of each are known ("12 of 16").

## 2.33.1 – 2026-10-19

- **The tree poster always shows repeated people.** The setting "End the branch at a repeated person" is gone, so the statistics in the corners always match the plates on the poster.

## 2.33.0 – 2026-10-19

- **The tree poster has a ruler with the generations.** Under the title a line like a measuring tape marks "1. generation", "2. generation" and so on to both sides, with the oldest and youngest birth year of each.

## 2.32.0 – 2026-10-19

- **The corner lists of the tree poster say more.** The heading of each branch now ends with the number of ancestors on it, the rows are labelled again (Origin, First names, Surnames), and a list names 5 values up to 5 generations, 6 up to 7 generations and 7 from 8 generations.

## 2.31.0 – 2026-10-19

- **The output chips in the settings have a tooltip.** Hovering Screen, PDF or SVG says which output the chip stands for.

## 2.30.0 – 2026-10-19

- **The poster leaves no empty space beside a shorter family line.** Each side of the poster is as wide as its own generations need, so the main person no longer has to stand in the middle.

## 2.29.1 – 2026-10-19

- **The settings legend shows that Labels also change the SVG tree poster.** Hovering the Labels setting now lights the SVG output as well as the screen and the PDF.

## 2.29.0 – 2026-10-19

- **The settings show which output they change.** A row of Screen, PDF and SVG chips stays at the top of the settings, and the ones a setting affects light up while the pointer is over it. "End the branch at a repeated person" and the corner lists are offered only for posters of five or more generations. The groups are called Display, Text output (PDF) and Graphic output (SVG) and are set apart by a gap.

## 2.28.0 – 2026-10-19

- **The settings are grouped by what they change.** Chart (screen and PDF), Print settings (PDF) and Tree poster (SVG) each have a heading with chips showing where they apply, and the poster generations are picked with buttons instead of a drop-down. Removed: print date, font size (it fits automatically), custom title and parents' marriage (it is always shown with both parents). Places now start as "town only". The PDF header always shows "Arbora" with the version and the print date.

## 2.27.0 – 2026-10-19

- **The poster corner lists line up with the plates and read more cleanly.** The left lists start where the name plates start and the right ones end where the plates end, a municipality and the same one with a district number ("Prague 2") count as one, counts read "Vienna (7)" instead of "Vienna ×7", and "+ N more" has no dot before it.

## 2.26.1 – 2026-10-19

- **The poster SVG is about 80 % smaller.** Every letter is stored once and reused wherever it appears; the text is still drawn as curves and looks the same.

## 2.26.0 – 2026-10-19

- **Names that wrap to two lines have tighter line spacing on the poster plates.**

## 2.25.0 – 2026-10-19

- **The poster plates have straight edges.** Each plate is drawn with a double line and rounded corners, like the border of the poster; the small plates from the 7th generation on have a single line.

## 2.24.0 – 2026-10-19

- **The lists in the poster corners are shorter and plainer.** Each corner is headed by "Line:", the name and birth date of the ancestor at the head of the branch, every line shows at most five values followed by "+ N more", births are counted by municipality only, female and male forms of a surname are one entry, and the line labels and the residence line are gone.

## 2.23.0 – 2026-10-19

- **The tree poster border is made of straight lines.** The double border around the poster is no longer soft and hand-drawn; both lines are straight with sharp corners.

## 2.22.0 – 2026-10-19

- **The tree poster grows less in height.** From the 7th generation on, the name plates are half as tall and a third narrower, with smaller text, tighter spacing and shorter branches, so a poster of 9 or 10 generations is about half as high.

## 2.21.0 – 2026-10-19

- **The tree poster can list places and name statistics in its corners.** A new setting (off by default) adds a list in each corner for the four grandparent lines: the most common birth places (and residences, with the residence setting), given names and surnames, each with the number of people.

## 2.20.0 – 2026-10-19

Poster: a quiet hand-cut double border with softly rounded corners now frames the whole poster.

## 2.19.0 – 2026-10-19

Poster: the marriage year and number of children now look for a free spot between the two branches first (in a wider area), and only then above or below them, so they no longer sit on a branch.

## 2.18.1 – 2026-10-19

Poster: a nameplate whose name wraps to two lines no longer shrinks the names and dates of the single-line plates in its generation.

## 2.18.0 – 2026-10-19

- **A poster setting ends the branch at a repeated person.** With many generations the same ancestor stands on several branches; "End the branch at a repeated person" keeps the whole ancestry only on the first one, so the poster is smaller. Off by default, translated into all 12 languages.

## 2.17.0 – 2026-10-19

- **The poster marks people who appear more than once.** When the family married within itself, the same ancestor stands on several branches; each of those plates gets a small tag ("2×"), and the title counts every person only once.

## 2.16.1 – 2026-10-19

- **The release build no longer fails on a slow runner.** The tests of the poster layout have a 30 second limit instead of 5 seconds, so the coverage run on GitHub does not stop the Pages deploy.

## 2.16.0 – 2026-10-19

- **The poster title shows the years.** Under the title: "6 generations · 62 ancestors · 1722–1887", the range from the oldest known birth to the main person's, with the nouns in the right plural form in all 12 languages.

## 2.15.0 – 2026-10-19

- **The poster shows the age at death and a framed title.** Nameplates read "*1907 †1986, 79 y." when both years are known, and the title stands in a hand-cut frame with the numbers of ancestors and generations under it, in all 12 languages.

## 2.14.0 – 2026-10-19

- **The poster draws symbols before the marriage year and the number of children.** Two rings lead the year and two small figures lead the number, both left-aligned; an only child is not counted, and the word "children" no longer needs translating.

## 2.13.0 – 2026-10-19

- **The tree poster shows the number of children of each couple.** It stands under the year of the marriage, in the language of the poster ("6 children", "3 deti", "5 дітей").

- **Tree poster todo:** notes on the postponed birth, death and residence places on the plates.

## 2.12.0 – 2026-10-19

- **The tree poster can show 3 to 10 generations.** The setting range moved from 2-9 to 3-10; the default stays 7.

- **The tree poster shows the year of each marriage.** A small brown "⚭ 1885" stands where the branches of the two parents meet; nothing is shown when the date is unknown.

## 2.11.0 – 2026-10-19

- **Long branches of the tree poster bend less.** The sideways swing is capped, so no big waves appear; the side shoots are longer on a longer branch instead.

## 2.10.0 – 2026-10-19

- **The tree poster stresses the closest generations and bends long branches.** The person is drawn at 200 %, the parents at 175 %, the grandparents at 150 %, the great-grandparents at 125 % and everyone further at 100 %, and long branches are curled instead of running straight.
- **Poster plates have a brown border, and the name carries the colour.** The name is blue for men and red for women.

## 2.9.0 – 2026-10-19

- **The tree poster is as high as the family needs.** Only people who exist take room on the poster: each person stands halfway between the parents and the branches of one side are packed as close as the plates allow, so a family with gaps gives a much lower poster, with no empty areas. The person stands in the middle below the two parents, joined to them by one limb that splits in two. The plates and the text keep their size, and the poster no longer has the fixed proportions of A paper.

## 2.8.0 – 2026-10-19

- **The tree poster has its own number of generations.** The Settings panel has a new "Tree poster" group where you choose 2 to 9 generations for the SVG poster; it no longer follows the generations of the chart. Beyond seven generations the poster grows (each generation doubles its size), while the plates and the text keep their size.

## 2.7.0 – 2026-10-18

- **Tree poster name plates look hand-cut.** Each plate has slightly uneven sides and a border of changing width, so no two are alike; the border is blue for men, red for women and brown when the sex is unknown.

## 2.6.0 – 2026-10-18

- **The tree poster is set in the Alkatra font.** Names and the title use Alkatra, written as outlines in the SVG so the file looks the same on any computer and in a print shop; characters Alkatra lacks, such as Cyrillic, use DejaVu Sans.

## 2.5.1 – 2026-10-18

- **Every tree poster download draws new branches.** The "New branches" setting is gone: each click on SVG in the top bar draws a different unique tree.

## 2.5.0 – 2026-10-18

- **Tree poster for large-format printing.** The new SVG button in the top bar downloads the ancestors of the chart's root person as a decorative tree: the person at the bottom, the father's line to the left, the mother's to the right, with randomly curved branches and leaves between the name plates. The generations, title, labels and dates follow the settings, and "New branches" in the settings draws another unique tree (the same seed always draws the same one).

## 2.4.0 – 2026-10-18

- **The marriage date and place sit behind the Details button of the family.** The family card in the edit window starts with the spouse and the children; Details holds date, place, age, cause, agency and divorce, and opens by itself when any of them has a value or the family is new and empty. "Add a family" also opens the Family part.

## 2.3.0 – 2026-10-18

- **Filled date, place and name fields keep their name.** In the edit window a filled date, place, given name or surname shows a small caption above the value, so a value is never without its name; empty fields still show the name as a placeholder, selects and checkboxes keep their labels.

- **Rarely used fields of occupations, facts, sources and other details sit behind a button.** Date and place of an occupation or a fact, page and quality of a source, and the access restriction and address of a person show behind a Details (Restriction, Address) button that opens by itself when the fields hold a value.

## 2.2.0 – 2026-10-18

- **A residence can take its place from the parents.** The "From parents" button on a residence row in the edit window fills the place from the first residence of the father, else of the mother; it is off when the parents have none.

## 2.1.0 – 2026-10-18

- **A new child starts with the father's surname in the form of the child's sex, and children can be sorted by birth.** Choosing a girl in the new-child form turns Novák into Nováková (and back for a boy) as long as the surname was not typed over, in languages and files with gendered surnames. New and found children are placed by year of birth, and a "Sort" button in the Children title orders the whole list.

- **The browser no longer offers contacts while typing a name or address.** The name, surname and address fields of the edit window and of the inline edit ask the browser not to autofill them (macOS Contacts popup in Safari).

## 2.0.0 – 2026-10-18

**Editor v2.** Arbora is now a full editor for the GEDCOM data it shows, not only a viewer. Everything below is in one edit window (the pencil in the person detail) that lies over the right half of the viewer, and every save is one undo step.

- **One edit window for a person**, in collapsible parts: name, events, occupation and facts, family, parents and associations, notes and sources, other details. Small values (name, sex, date, place, religion, occupation, note) can still be changed in place in the detail.
- **About 40 tags can be edited**: name parts and aka names, sex, living or deceased, all individual events with age, cause and agency, occupations and other attributes, source citations with page and quality, notes, marriage and divorce with their details, spouses and children, parents with their kind of relation, associations, address, phone, e-mail, web, restriction, reference numbers.
- **Add and delete people and families.** A new person, a new family and a new child, spouse or parent can be made right in the family part of another person, with just the name, sex, birth and death. Deleting a person or a family cleans every pointer to it.
- **Merge duplicates.** Pick the other person, choose the value on every conflict side by side, and the two records become one with all links moved.
- **The file stays yours.** Records you do not change are written back byte for byte, unknown tags are kept, long notes keep their line breaks and spaces, and pointers between people and families are kept consistent in both directions. 250 random edits on generated files are tested to keep it that way, and to undo and redo cleanly.
- **Also in this release:** releases are now built from small `changelog.d` files so open pull requests no longer conflict on the version.

## 1.54.3 – 2026-10-18

- **Undo and the list of changes are checked after structural edits.** A new test makes 250 random edits (add and delete people and families, merge, change fields) and undoes them all one step at a time back to the opened file, redoes them to the last version, and checks that every step is one undo step and that the list of unsaved changes names exactly the records that differ from the opened file. The random file generator moved to `core/generatedFile.ts`, shared with the integrity test.

## 1.54.2 – 2026-10-18

- **The edit window no longer offers a loop.** A person's own ancestors are not offered as their children, and a family of their descendants is not offered as their parents, so nobody can become their own ancestor by a slip in the form.

- **Editing is checked on generated files.** A new test makes 250 random edits (add and delete people and families, merge, change fields, in LF and CRLF files) and checks after each one that no pointer is broken or one-way, that what is written parses back to the same text, and that a person nobody touched, with a long note on CONC lines and trailing spaces, stays byte for byte the same. A loop made in the form does not hang the charts.

## 1.54.1 – 2026-10-18

- **Pull requests no longer conflict on the version and the changelog.** A pull request now adds a small file `changelog.d/<kind>-<name>.md` instead of editing `CHANGELOG.md` and `package.json`. When it is merged, the release workflow collects the fragments, picks the next version (minor for a feature or visual change, patch otherwise), writes the CHANGELOG section, bumps `package.json`, publishes the GitHub release and deploys the site. A major version is still written by hand.

## 1.54.0 – 2026-10-18

- **Editing a date in the detail tells you how it is understood.** The same hint as in the edit window now shows under a date while you edit it in place: `→ 1891-05-14` style GEDCOM value, or a warning that the date has no known form and will be saved as text. The field's tooltip shows the accepted formats. Both places share one rule (`dateHint`), so they can no longer disagree. Tiny values (name, sex, date, place, religion, occupation, note) stay editable in place; everything else lives in the edit window.

## 1.53.1 – 2026-10-18

- **Divorce has its own symbol in the tree and the PDF.** A divorced marriage ends with ⚮ instead of the word "(div.)", like birth, marriage and death have *, ∞ and †. With abbreviated labels the abbreviation stays. The symbol exists in the PDF font.

## 1.53.0 – 2026-10-17

- **The latest residence can be shown in the tree and the PDF.** A new option "show residence" in the display settings prints the place of the person's latest residence (RESI, by year) after the brackets, with a ⌂ symbol (or an abbreviation with abbreviated labels). It is left out when it equals the place of birth or death, and it needs places to be on. Off by default; the GEDCOM file is not touched.

## 1.52.3 – 2026-10-17

- **Several marriages are easy to tell apart in the edit window.** When a person has more than one family, each is its own card with a numbered title (Marriage 1, Marriage 2, …); a single family looks as before.

## 1.52.2 – 2026-10-17

- **The edit window opens the parts that already hold something.** Family, Parents and associations, Occupation and facts, Notes and sources and Other details start expanded when they contain data and collapsed when they are empty; Person and Events are always open. Parts you open or close yourself stay as you left them.

## 1.52.1 – 2026-10-17

- **Adding things in the edit window is done the same way everywhere.** Every "add" action (event, occupation, detail, source, contact, reference, aka name, association) is now a text action at the right end of its group's title row instead of a separate button below the list. Children, spouse and parents have the same pair, "Add" and "Find", and delete family and the copy from birth or death are text actions too, all with a small icon before the text. "Add family" sits in the header of the Family section. The buttons that only show hidden fields ("Details", "Address", "More fields") end with a chevron instead of a "+", stay after the fields are shown and hide them again when pressed. The inline form for a new child, spouse or parent is an inset card with its own background and border. It has given name, surname and birth in one row, "deceased" with the death date in one row, and "Find" opens its search field right under the header and closes it on a second press. Every delete button is a trash can instead of an X. Birth and death are the fixed events; "Add christening" in the birth title row and "Add burial" in the death title row add those two as rows under them, with a trash can to remove them. "Deceased" sits in the Events part and the death appears once it is ticked. The parts are ordered Person, Events, Family, Parents, Occupation and facts, Notes and sources, Other details, and the footer shows how many values are unsaved. "More fields" of the name is now "Details" and keeps its place when opened.

## 1.52.0 – 2026-10-17

- **A new spouse or a new parent can be made right in the edit window.** Under the spouse field of a family there is a
  "New spouse" button, and under Parents a "New parent" button. Both open the same small form as the new child (given
  name, surname, sex, birth, deceased with a death date). A new father keeps the surname of the person, a new mother
  starts without one. The people and the family of new parents (the mother joins the family of the father made before
  her, and the other way round) are written when the window is saved, as one undo step, with all pointers in place.

## 1.51.4 – 2026-10-17

- **The edit window has a fixed layout.** The age, cause and agency row now lines up with the date and place columns above it, and the trash and add-child icons sit on the same line as their headings. "Divorced" moved into the marriage's "+ Details" (it opens by itself when the family is divorced). The structure (section, subsection, fields, hidden fields) is written down in the design guidelines.

## 1.51.3 – 2026-10-17

- **The parents and associations section is quieter.** It lists only the existing parents and associations; the search
  fields for adding a further family of parents or an association appear after pressing the add button.

## 1.51.2 – 2026-10-17

- **The edit window is shorter.** The name of a text field is now its placeholder instead of a line of small print above it, so every field takes one row less. The name is still the field's accessible name and the hover tooltip stays; a filled field shows only its value. Choice lists (access restriction, source quality) keep their label above.

## 1.51.1 – 2026-10-17

- **The Changes panel is easier to read.** A family is named after its parents and people appear by name instead of
  `@ID`; a label and its value share one line; an added person no longer repeats the name, shows "male/female" instead
  of M/F, and shows the birth date as one line ("Birth 1997") without an empty parent line. The exact GEDCOM lines are
  still there under a "GEDCOM" toggle on each record.

## 1.51.0 – 2026-10-17

- **Duplicate people can be merged.** The edit window has a merge button (two joined arrows) next to the trash. Pick the
  other person (name, years and ID are listed) and the window shows both side by side: name, sex, birth, christening,
  death, burial, religion, note and access restriction. Where both have a value and the values differ you pick one
  (the open person's by default); a value only one of them has is kept. The name that is not picked stays as another form
  of the name. Occupations, events, facts, sources, contacts, references, parents and associations of both are joined,
  the families of the removed person (as a spouse or a child) and every association that named them point to the kept
  person, and the removed record is deleted, all as one undo step. People who are spouses, or a parent and a child, of
  one family cannot be merged. Two children of one family can: that is how a child entered twice looks.

## 1.50.1 – 2026-10-17

- **The new-child form is laid out properly.** Its fields no longer overlap or squeeze into the narrow label column: the
  given name and surname share a row, sex and the dates sit below them, and the buttons keep their text on one line.

## 1.50.0 – 2026-10-17

- **A new child can be made right in the Family part of the edit window.** Next to "Children" there are two buttons: a
  person with a plus opens a small form (given name, surname filled in from the father, sex, birth date, deceased with a
  death date), and the magnifier finds an existing person as before. The new person is written when the window is saved,
  in the same undo step as the family change, with the FAMC link to the family and the CHIL line in it. Its ID follows
  the same rule as other new people.

## 1.49.1 – 2026-10-17

- **The edit window stays where you were.** Adding or deleting a family no longer collapses the parts of the window or
  scrolls it back to the top: the open parts and the scroll position are kept, and the first field is not focused again.

## 1.49.0 – 2026-10-17

- **Add and delete people and families.** A "+" button above the list of people adds a nameless person and opens the
  edit window for them. In the edit window a trash button deletes the person, the Family part has "Add a family" and a
  trash button per family. Every pointer is kept consistent in one undo step: a new family gets the HUSB or WIFE line and
  the people get FAMS lines; deleting a family removes the FAMS and FAMC lines that point to it (the people stay);
  deleting a person removes their HUSB, WIFE, CHIL, ASSO and ALIA lines in other records, and a family left with nobody
  in it is removed. Add and delete family are offered only when the form has no unsaved changes.
  A new record gets the prefix most used by its type in the file (I and F if none) and a number above every number in
  any ID of the file, so a number is never reused; existing IDs are never changed.

## 1.48.4 – 2026-10-17

- **Every field of the edit window now explains itself in a tooltip.** Hold the mouse over a field (or focus it) to see
  what to write there, with examples. The hints that were always visible under the residence address and place are now
  tooltips too, so the form is calmer. All the texts exist in all 12 languages. A test now fails when a field is added
  without a tooltip, so this holds for new fields as well.

## 1.48.3 – 2026-10-17

- **A residence in the edit window is easier to fill in.** The address (street and house number) and the place (town and
  region) now have a short hint each. When the address is the same text as the place, which is how many files have it,
  it is not shown twice: a small "+ Address" button opens the field and a line says that they are the same. Nothing in the
  file changes unless it is edited.

## 1.48.2 – 2026-10-17

- The first part of the edit window is called "Person" (it holds the name, titles, other forms of the name, sex and whether the person is deceased), so it no longer sounds like the Given name field.

## 1.48.1 – 2026-10-17

- **Bulk fix leaves other names alone.** Only the main name of a person (the first name that is not marked aka) takes
  part in finding and renaming variants of surnames and given names. Other names of the person, shown as "Other name"
  in the detail, with or without `TYPE aka`, are no longer offered as spellings and are not changed by a fix.

## 1.48.0 – 2026-10-17

- **Other details in the edit window.** The last part of the window is no longer a placeholder: it edits the restriction
  of the person (RESN: confidential, locked, private), the text of the address (ADDR; its CITY, POST and other parts
  stay as they are), contacts (phone, e-mail, fax, web), reference numbers with their kind (REFN and TYPE) and the AFN and RFN numbers.
  Lines are written where GEDCOM has them (RESN first, contacts after the facts, the numbers at the end of the record)
  and everything else in the record stays untouched. Contacts and an address under the person itself are what most
  programs write, although GEDCOM 5.5.1 defines them only under events and facts.

## 1.47.0 – 2026-10-16

- **Parents and associations in the edit window.** The "Parents and associations" part lists the families the person
  is a child of, with the kind of descent (birth, adopted, foster, sealing), which can be changed or cleared. A family
  can be removed or added by typing the names of the parents; the child line of the family changes with it in the same
  undo step. Associations (ASSO, for example godparents or witnesses) can be added, removed and given a role.
  The parts of the edit window now collapse (a chevron after the title) and are ordered by how often they are edited; the source chooser fills the row:
  Names and Events are open at the start, then Occupation and facts, Family, Parents and associations, Notes and sources, Other details.
  Sex and Deceased moved into the Name part, the religion to the christening, and the occupations and other facts have a part of their own.
  The Name part is called "Name" again and the field of the first name "Given name" (in Slovak "Krstné meno"), so the two titles differ.
  Each part is a card on the page background and the groups inside have an icon before their title (birth, christening, marriage, sources…).
  The Families part is called "Family", the spouse field is called Husband or Wife by the sex of the chosen person, and
  a child is added with a small "+" button after the title Children, which opens the search field.
  Everything else in these records stays untouched. New families and new people come in a later step.

## 1.46.0 – 2026-10-16

- **Families part of the edit window: spouses and children.** Each family of the person now shows the other spouse
  and the children. The spouse can be replaced or removed, a child can be taken out of the family, and any person of
  the file can be added as a child, chosen by typing the name. The links in the other records (FAMC of a child,
  FAMS of a spouse) change with it in the same undo step, and a new link goes after the other lines of the record.
  The "take from birth / death" button is now a small icon next to the title of the christening or burial, with the text in its tooltip.
  The Name part of the window is called "Names" in the languages where its title read the same as the field below it.
  The edit window is a fixed 560 px wide instead of half of the browser.
  Date fields are a fixed 100 px and the place gets the rest of the row; age (80 px) is the narrow one of age, cause and agency.
  The rows of lists (other events, facts, sources, children) have no box around them.
  People are listed by name and birth year (the ID only when two people look the same). New families and new people
  come with the add and delete step.

## 1.45.0 – 2026-10-16

- **Families part of the edit window: divorce and details.** A marriage that is marked as divorced now also has the
  date, place and details of the divorce, and the marriage and the divorce can carry age, cause and agency (behind a
  "Details" button, shown automatically when present). The divorce is written under the `DIV Y` line; everything
  else in the family record stays as it was. Adding and removing spouses and children comes in the next step.

## 1.44.0 – 2026-10-16

- **Notes and sources part of the edit window.** Under the note, the Notes section lists the source citations written
  directly under the person: the source (chosen from the source records of the file, or a text citation), the page and
  the reliability (QUAY 0 to 3), with add and remove. Only the changed lines are written; lines under a citation that
  the form does not show (notes, quoted text) stay as they were.

## 1.43.0 – 2026-10-16

- **Slimmer, sharper fields and controls.** Inputs, selects, the search box and the fields of the edit window and the
  settings panel look like the inline edit in the person detail: no box, a faint dashed underline, and an accent
  underline with a soft fill while editing. Fields, text buttons and switches share one height (30 px, new token
  `--field-h`, was 36 px) and one text size; only square icon buttons keep 36 px. All corners use one 6 px radius
  (was 8 and 12 px) and chips are no longer fully round. The focus ring is a tight 2 px line. The rules are in
  docs/design-guidelines.md.

## 1.42.0 – 2026-10-16

- **Events part of the edit window.** Birth, christening, death and burial can now carry age, cause and agency
  (behind a "Details" button, shown automatically when present). A new list of other events (baptism, blessing,
  cremation, adoption, confirmation, residence, census, emigration, graduation, retirement, will, custom events…)
  has date, place, address or description, and details of each, with add and remove. New lines go after the other
  events; lines the form does not list stay as they were.

## 1.41.0 – 2026-10-16

- **Basic facts part of the edit window: other facts.** Next to sex, deceased, religion and occupation, the edit
  window now edits the other facts of a person (education, nationality, title, property, caste, description, number
  of children, ID number, other fact): value, date and place of each, add and remove. Only the changed lines are
  written, in the usual place among the other lines; lines the form does not list stay as they were.

## 1.40.0 – 2026-10-16

- **Name part of the edit window.** The Name section now also edits the title before the name (NPFX), the name suffix
  (NSFX), the nickname (NICK) and the surname prefix (SPFX), next to the given name, surname and aka names. The parts
  are written as lines under the main name in the usual order; an emptied field removes its line, other lines stay.
  Only given name and surname are shown by default; two buttons below add another form of the name (aka) and
  show the four other fields at once (they are shown automatically when the person already has one).

## 1.39.0 – 2026-10-16

- **Edit window (first step of the v2.0 editor).** The pencil in the person detail now opens a window for editing the
  person, lying over the right half of the browser with the tree still visible and the tool bar in place. It replaces
  the old small form: the same fields, now sorted into the parts of a person: name (given name, surname, aka), basic
  facts (sex, deceased, religion, occupation), events (birth, christening, death, burial), notes, and families
  (marriage date and place, divorced). Parents and other details are shown as placeholders for the next versions.
  Small values are still edited inline in the detail. The footer has Cancel and Save (disabled until something
  changes), Esc closes the window and it asks before dropping changes. Texts in all 12 languages; the pattern is in
  docs/design-guidelines.md.

## 1.38.2 – 2026-10-16

- **Reverted changes are no longer counted.** The unsaved-changes count (badge above the GED export and the Changes
  panel) now compares the current records with the saved version instead of counting edit steps, so changing a value
  and changing it back shows 0 changes and the file is no longer treated as modified.

## 1.38.1 – 2026-10-15

- **Spouses' ages only at the parents' wedding.** The "Spouses' ages" line from 1.38.0 moves from the person's own
  marriages in the timeline to the marriage of the parents in the "Parents" section of the person detail.

## 1.38.0 – 2026-10-15

- **Spouses' ages at the wedding.** A marriage in the person detail now has a line "Spouses' ages" with both
  spouses' given names and their age on the wedding day, e.g. "Adam (30y), Anna (25y)". A spouse is left out when
  their birth date or the wedding date does not tell a whole number of years. The year abbreviation is translated
  into all 12 languages.

## 1.37.0 – 2026-10-15

- **Bulk fix also unifies given names.** A new tab "Given names" finds different spellings of one given name
  (Katarína / Katerína, Jan / Ján) and works like the surname tab: pick the spelling that stays, tick which others are
  replaced, see the people that change, and apply in one step. Every word of a given name is handled separately
  ("Katerína Mária" changes only Katerína), initials are ignored, and names that only differ in the ending, like
  Alexander and Alexandra, are never grouped. The free "from → to" rename works for given names too.

## 1.36.0 – 2026-10-15

- **The file check also looks at surname endings.** In Slovak and Czech files (a file counts as one when at least
  three women have -ová surnames) a woman with the man's form (Horváth) and a man with a woman's form (Horváthová)
  are reported as warnings; Polish -ski / -ska works the same way. The wand fixes a case only when the correct form
  is certain: -ý → -á, -ski → -ska, or a form that already exists in the file. Surnames in other languages, endings
  that are the same for both sexes, double surnames and people with an unknown sex are never reported. Rules are one
  small table per language in `src/core/surnameEnding.ts`.

## 1.35.0 – 2026-10-15

- **Given name suggestions follow the person's sex.** While typing a given name, a woman is offered only the given
  names already used for women in the file, and a man only those used for men. With an unknown sex the list is
  unchanged. It applies in every language, because it only uses names already in the file.

## 1.34.0 – 2026-10-15

- **Bulk fix is its own tool**: a new icon in the tool bar (Replace, with the number of groups that wait for a decision)
  opens a wide panel with three columns: the tabs Surnames / Places / Hidden, the groups of the open tab, and the open
  group. The group shows the spelling that stays (pick one or type your own), a table of all spellings with the number
  of people, a tick for each spelling that is replaced (a spelling from another country is left alone until you tick
  it), a preview of the people that change (old value struck through, new one highlighted) and one button that says
  exactly what it does. The free "from → to" rename moved to the bottom of the groups column. The file check keeps
  only the problems list, and its icon now counts only problems.

## 1.33.0 – 2026-10-14

- **Surname suggestions follow the person's sex.** Where surnames have a male and a female form (Slovak, Czech, Polish,
  or any file that already has -ová surnames), the suggestions while typing a surname offer a woman only female forms
  and a man only male forms. Forms that are missing are made from the other sex's surname (a man's *Rybár* becomes
  *Rybárová* for a woman, *Zelený* becomes *Zelená*, and back), and surnames that are the same for both stay.
  With an unknown sex, or in other languages, the list is unchanged.

## 1.32.0 – 2026-10-13

- **Changes panel**: a new icon in the tool bar (shown while there are unsaved changes, with their count) lists what
  differs from the version last downloaded: per person (or family) the lines that were added, removed or changed, old
  value → new value. A click on a name opens the person. It works from the same edit log that keeps the changes over
  a reload, so it reflects the current state, including undo and redo.

## 1.31.0 – 2026-10-13

- **Unsaved edits survive a reload.** The browser now keeps, beside the opened file, a small log of your edits (only
  the changed records). After a refresh the edits come back, the **GED** badge shows the real number of unsaved
  changes again, and **Undo / Redo keep working** through the whole history. A strip under the top bar says so and
  offers *Discard them* (back to the version last downloaded) or a dismiss X. Still only in this browser.
- The undo history is now this log instead of copies of the file, so it is not limited to 200 steps.
- Downloading **GED** makes the downloaded file the new remembered original and **drops the old edit log**, so the
  browser never piles up logs. Undo starts again from the saved version.

## 1.30.0 – 2026-10-13

- **Inline editing of facts** in the person detail: click **religion**, **occupation** (text, date, place), the other
  attributes (education, nationality, title, property, … with date and place), the **age, cause and agency** written
  under an event, the **aka names** (given name and surname, next to the ID) or the **note** to change them right there. Religion is suggested from the file; a note opens as a
  text area (Ctrl+Enter or leaving it applies, Esc drops). Clearing an occupation text removes that line (Ctrl+Z brings it
  back). Same rules as before: one undo step per edit, only the edited GEDCOM line changes.

## 1.29.0 – 2026-10-13

- **Inline editing of dates and places** in the person detail timeline: click the date or the place of a birth,
  christening, marriage, divorce, residence, custom event, death or burial to change it right there. Dates are
  understood the same way as in the edit form (`14.5.1891`, `cca 1890`), places are suggested from the file. Enter or
  leaving the field applies, Esc drops; each change is one undo step and only that event line changes. Children's
  births are not editable here (they belong to the child's own detail). An event that has no date or place yet still
  needs the edit form.

## 1.28.0 – 2026-10-13

- **Inline editing in the person detail**, first step: click the **name** (given name and surname in two fields, with
  suggestions) or the **sex icon** (a three-choice switch) to change it right there, without the edit form. Enter or
  leaving the field applies the change, Esc drops it. Each change is one undo step and counts in the unsaved-changes
  badge; only the edited GEDCOM lines change. Name suggestions come from people only (place and repository records
  with a NAME no longer end up in the given-name list). The edit form (pencil) stays for everything else; more fields follow.

## 1.27.2 – 2026-10-13

- **Also known as (aka)** in the person editor: a new aka starts as a copy of the main name, so only the part that
  differs needs changing. An aka with only a given name or only a surname is fine (written as `NAME Johannes` or
  `NAME /Surname/`); a new aka identical to the main name is dropped on save.

## 1.27.1 – 2026-10-13

- Fix: saving with **GED** now also updates the file the browser remembers, so after a reload the saved changes are
  there instead of the file as it was first opened. Unsaved edits are still not kept over a reload.

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
