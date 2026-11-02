# One place to edit sources (design proposal)

Status: proposal, nothing implemented. Written 2026-11-01.

## The problem

A source is shown in two places: the Sources panel (left) and the citation under a timeline event (right).
Today the right side can rename a source and the edit window can add or remove a *citation* (source, page, quality),
but nobody can edit what the source record itself says (publication line, web links, notes, author, repository).
Web links live in three different lines (`PUBL` of the source, `NOTE` of the source or citation, `PAGE` of the citation),
so there is no obvious place to add, for example, a second and third link to a christening source.

## What already works in our favour

Both places already read the same thing. `citation()` in `src/core/sources.ts` resolves a `SOUR @S1@` pointer
into the source record (`TITL`, `AUTH`, `PUBL`, `REPO`, `NOTE`) plus the citation's own `PAGE`, `QUAY`, `DATA/TEXT`, `NOTE`.
The panel (`sourceOverview`) and the source window both call it, so once the record is
edited in the document, both views update from one state and cannot disagree. We only need to add the write side.
Renaming already does this: `applySourceRenames` rewrites the `TITL` line of the record.

## Data model (no change to the file format)

- **Source record** (`0 @S1@ SOUR`) is the single owner of: title, author, publication, repository, links, notes.
  Edited only in the Sources panel.
- **Citation** (`SOUR @S1@` under a person or event) keeps only what is specific to that one use: page, quality, quoted text.
  Edited in the person's edit window as today.
- **Links** become one first-class list of the source, shown as chips. In the file they stay where they are;
  the editor reads links from `PUBL` and the record's `NOTE` lines (what `citationLinks` already finds) and writes new ones as
  a `WWW` line of the source record (not part of GEDCOM 5.5.1 for sources, so to be decided: `WWW` or a plain `NOTE` line; other programs keep both). Existing links are not moved, so unedited records still round-trip byte-identical.
- Real files cite a source about once (in a real research file 669 of 688 sources are cited once),
  so a source record is effectively "the entry for this event". Where a source is cited by several people or events,
  the panel says so ("used 12x") before an edit, because the change applies to all of them.

## What the panel offers

Opening a source in the panel (the existing expand row) gets an edit state, same pencil pattern as the person detail:

1. Title (already editable in place, plus the suggested-name wand).
2. Author, publication, repository: plain fields.
3. Links: list of chips with a remove button, and an "Add link" field. Pasting several links at once adds several.
4. Notes: add / edit / remove the source's own notes.
5. "Used by": the people and events (already listed), each a link; later a button to detach a citation.
6. Create a new source here, and delete an unused one (a source nobody cites is already listed).

Citation fields (page, quality) stay in the edit window: they belong to the event, not to the source.

## How the timeline reflects it

Since the sources are edited in the source window, the timeline no longer lists them: the sources button of an event
(`EventSources`) opens the (first) source of that event in the Sources panel, marked in the list and opened in the window.
The notes of an event still unfold under it.

## Smallest first step (one PR, ~1 day)

**Links of a source, editable in the Sources panel.**

- core: `setSourceLinks(records, xref, links)` in `sources.ts` (or a new `sourceEdit.ts`): adds/removes `WWW` lines on the
  record, leaves every other line untouched; tests with `src/core/fixtures/sources.ts` including the byte-identical round trip.
- ui: in `SourcesPanel` an expanded row shows the link chips with an x and an "Add link" input; changes go through the
  same `replaceRecords` that rename uses (so undo and the changes panel work).
- The timeline needs no change; a test checks that a link added in the panel shows on the event's citation.

Later steps, each its own PR: author / publication / repository fields; notes; create and delete a source; "Edit source"
pencil on the timeline; merge two sources that are really the same.

## Risks

- A source cited by many events: editing a link changes all of them. Mitigated by the "used N times" line, and by showing the
  affected people before the edit is confirmed.
- Where the existing link sits in `PUBL` or `NOTE` text, removing it means editing that text, not deleting a line.
  First step only removes links we added as `WWW`; for the others it offers to edit the text.
- Two representations of one link (`PUBL` and `WWW`): `citationLinks` already de-duplicates by address, so it shows once.
