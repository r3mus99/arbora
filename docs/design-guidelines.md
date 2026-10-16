# Design guidelines

This is the single reference for how Arbora looks. Every screen is built from the same few tokens and rules; when you
add a component, pick from here instead of inventing a number. The tokens live at the top of `src/ui/styles.css`:
change a token, never a literal value in a rule.

The code follows these rules since 1.20.0 (the top bar is part of the frame since 1.21.0); section 11 lists what is still left.

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR   Arbora · open file │ undo redo │ save GED · PDF │ language │
├──┬───────────────┬───────────────────────────────────────────┬───────────────┤
│R │ MINI-APP      │  MAIN COMPONENT                           │  PERSON       │
│A │ PANEL         │  tree view                                │  DETAIL       │
│I │ (1/3 wide or  │  (header row: Ancestors/Descendants,      │  (340px)      │
│L │ full width)   │   generations)                            │               │
└──┴───────────────┴───────────────────────────────────────────┴───────────────┘
```

- **Top bar** (the first row of the frame, `--head-h` high, one line under it across the frame; global, not about one person): app name, the open file, undo / redo, save GED, save PDF,
  language. Order is fixed: identity, file, history, output, preferences. Anything that changes the whole document
  or the app belongs here.
- **Rail** (left, icon column): one icon per mini-app. Opens and closes the mini-app panel.
- **Mini-app panel**: opens next to the rail. Either a *side panel* (people list, recent, overview, sources and notes, places, settings: every one exactly
  `--panel-w` = 320px wide) or a *wide panel* (file check, bulk fix, later: people table, editor) that replaces the tree and
  detail and takes the full width right of the rail. Only one mini-app is open at a time.
- **Main component** (centre): the tree view. It is the only thing that is always there; it is never
  squeezed below a usable width, so a side panel is hidden before the tree is.
- **Detail** (right): the selected person, read-only timeline now, editing later. Hidden by a wide panel. The **edit window** (section 7) lies over the tree and the detail without closing them.
- The frame (top bar included) has **one fixed height** (the window minus a small margin and the footer). Panels never change it; their content
  scrolls inside. Columns are divided by 1px `--border` lines, not by cards or shadows.
- Mobile layout is out of scope for now.

## 2. Tokens

| Token | Value | Used for |
| --- | --- | --- |
| `--panel-w` | 320px | width of every side panel of the tool bar (list of people, overview, sources and notes, places, settings); one value, never a width per panel |
| `--head-h` | 52px | header row of every panel (rail first icon, search box, chart switch, person name, wide panel title); one continuous line under them across the frame |
| `--ctl-h` | 36px | height of every control: inputs, selects, switch, buttons, icon buttons, rail icons |
| `--ctl-h-sm` | 28px (new) | the one smaller control height, only for controls inside a list row or a card (chips, inline inputs, row buttons) |
| `--icon` | 18px | icons in controls, headers, rail and top bar |
| `--icon-sm` | 14px (new) | icons inside text lines, chips, badges, links |
| `--radius` | 8px | corners of controls, inputs, switches, tree selection |
| `--radius-lg` | 12px (new) | corners of the frame, dialogs' inner cards, tiles |
| `--radius-pill` | 999px (new) | chips, count badges only |
| `--pad` | 14px | side padding of a panel and gap between blocks inside it |
| `--star` | #c58a12 / #e0b04a dark | the favourite star, nothing else |
| `--gap` | 8px (new) | gap between controls in a row; 4px between icon buttons in a tool group |

No other radius, height or padding number is used for a control. Dialogs use `--radius-lg`.

## 3. Typography

- Content and controls: **14px**. Small print (section titles, labels, years, hints, badges): **12px**. Nothing else
  inside the app frame. Line height 1.5 for text, controls centre their text.
- Exceptions: the app name (Spectral 28px, top bar), the person name in the detail (Spectral 19px), the large
  numbers of the overview tiles (19px, 600). The welcome screen has its own larger scale.
- Fonts: Spectral only for the app name and names of people used as a heading; everything else is the system font.
- Weights: 400 body, 600 for emphasis (names in the tree, active switch, section titles, buttons that act). Never 700 + 650 mixes.
- Section titles and form labels: 12px, 600, uppercase, letter-spacing .04em, `--muted`.
- Numbers (years, counts, ages) use `font-variant-numeric: tabular-nums`.
- Italic is used for places only (tree, detail) and for aka names.

## 4. Colour

- Surfaces: `--bg` for the page, rail and inputs; `--panel` for panels, dialogs and cards. `--border` for every line.
- Text: `--text`, secondary `--muted`. Never `opacity` to dim text; use `--muted`.
- `--accent` marks the active thing (open mini-app, chosen switch, selected person, links, primary button).
  `--accent-soft` is the hover and the "on" background.
- `--danger` for errors, `--warn` (new token, replaces the literal `#b7791f`) for warnings and badges.
- Event and sex colours are tokens too (`--c-birth`, `--c-marr`, `--c-death`, `--c-src`, `--sex-M`, `--sex-F`
  (new), and one token per event kind). They colour icons and dates only, never backgrounds or borders.
- A literal colour in a rule is a bug. Every colour has a dark-theme value.
- **Theme rule:** the theme follows the system (`prefers-color-scheme`) until the user chooses with the sun/moon icon
  button in the top bar, right next to the language menu. The choice is kept in `localStorage` (`arbora-options`, key
  `theme`) and then wins over the system. It is set as `data-theme` on `<html>`; the tokens live in `:root` (light),
  `:root:not([data-theme="light"])` inside the media query, and `:root[data-theme="dark"]`. New tokens need a value in
  all three places. The button shows the theme you would switch to; its tooltip says so (`themeDark`/`themeLight`).

## 5. Icons

- Library: lucide only, stroke icons, `aria-hidden` when decorative.
- Size: `--icon` 18px in controls and headers, `--icon-sm` 14px inline in text, chips and badges, 15px inside
  detail rows (`--d-icon-row`). The welcome drop zone icon (36px) is the only large one.
- Colour: `currentColor`; muted when idle, accent when active, event colour on timeline rows. An icon never
  has its own background circle except in the overview tile.
- One meaning, one icon: Search = find a person, LayoutDashboard = overview, ShieldCheck / ShieldAlert = file check, Replace = bulk fix of spellings,
  SlidersHorizontal = settings (tool bar), FileDown = save GED, FileText = save PDF, Undo2 / Redo2 = history, X = close or remove,
  MapPin = place, Clock = recent people, Star = favourite person (the generic event in the timeline is CalendarDays). Do not reuse an icon for a different meaning (the old file-check wand and the overview's
  shield must not be mixed).
- Icon-only buttons always have `title` (tooltip) and `aria-label` with the same text, and a shortcut in the title when there is one.

## 6. Controls

All controls are `--ctl-h` high, `--radius`, 14px text, 1px `--border`, no shadows.

| Control | Rule |
| --- | --- |
| Icon button | `--ctl-h` square, no border and no fill at rest, `--muted` icon. Hover: `--accent-soft` background, `inherit` colour. On/active: `--accent-soft` + `--accent`. Disabled: 50% opacity, no hover. Used in top bar, rail, detail header. |
| Button | `--ctl-h`, 1px border, `--panel`. Hover: accent border. Disabled: 50% opacity. Padding `0 14px`. |
| Primary button | accent fill, `--accent-text`, 600. One per view at most (e.g. Apply in a dialog, Save in an editor). |
| Switch (segmented) | one component for Ancestors/Descendants, generations, sex choice in the editor: border + `--radius`, 1px dividers, chosen segment `--accent-soft` + `--accent` + 600. |
| Input, select, textarea | `--ctl-h` (textarea auto), `--bg` fill, 1px `--border`, `--radius`, padding `0 10px`. Focus: 3px `--focus` outline offset 1px; the same for every focusable element. The editor must use the same fields (no 12px radius, 15px text). |
| Checkbox / radio | 16px, `accent-color: var(--accent)`, label 14px. |
| Chip / count badge | `--ctl-h-sm`, pill, 12px. Picked: accent border + `--accent-soft`. |
| Notification badge (`.badge`) | iOS-style counter on the corner of an icon or button in the top bar and rail: `--warn` pill, white 12px bold number, 17px high, 2px ring in `--bg`, pinned to the top-right corner (`top -4px, right -6px`) so it never changes the layout. Hidden at 0, "99+" above 99. Used for the number of problems (check) and of unsaved changes (GED save button); its tooltip text describes the number ("unsaved changes: 3"). |
| Tabs (vertical, in a wide panel) | rail-like rows: `--ctl-h`, `--radius`, active = `--accent-soft` + `--accent`. Count badge on the right (`--ctl-h-sm` pill, `--warn-soft`; grey at 0). |
| Link | `--accent`, underlined on hover only, except inside long free text (sources) where it is always underlined. A link that is a person's name is `--text`, 600, underlined on hover. Links to other sites open in a new tab with `rel="noopener noreferrer"`. A text-looking button (`button.link`) looks exactly like a link. |
| Inline edit (`.inline-value`) | In the detail, an editable value is plain text with only a faint dashed underline (`--border`, darker on hover) and a text cursor; no fill, no box. While editing, the field keeps the text's own font and size (no border, no padding, a 1px `--accent` underline, width of the text), so the line does not change size. A choice (sex) opens a small segmented-switch popover under the header that overlays instead of pushing content. Enter or leaving the field applies, Esc drops. One undo step per edit. A note is the same idea with a text area of the text's size (`.inline-note`): Ctrl+Enter or leaving applies. |

States, in order of precedence: disabled > active/on > hover > rest. Focus ring is separate and always visible on keyboard focus.

## 7. Panels, headers, lists

- Every panel starts with a header row: `--head-h`, `0 var(--pad)`, bottom border, title in the same font as the person's name in the detail (Spectral 19px 600; the chart bar has its "Family tree" title the same way) (or the control
  that lives there). No panel has a heading style of its own.
- **Tool panel titles use the `PanelHead` component** (`src/ui/PanelHead.tsx`): fixed at the top of the panel, it never
  scrolls (only the `.panel-body` below it does), exactly `--head-h` high, so its line runs level with the chart bar
  and the person detail header. Never write a title row, a title size or a sticky header of your own; the
  panel is `.panel-col` = `PanelHead` + `.panel-body`.
- Body padding `--pad`; blocks inside are separated by a 1px line with `--pad` above and below, not by margins alone.
- List rows (people, rankings): 14px, padding `3px 10px`, hover `--accent-soft`, selected = accent fill with
  `--accent-text`. Secondary text on the row is 12px `--muted`.
- Tiles / cards (overview, variant groups): `--radius-lg`, 1px border, `--bg` fill, padding `10px 12px`.
- Lists of records with a count line (sources, notes, places) are `.sp-list` rows: a 14px icon in `--c-src`, title 600, one 12px `--muted` line ("People: n · Events: m"); a click opens the row and shows its people as links (`People` component), a second click closes it. Above the list sits the same filter box (`.finder`) as the people list.
- **Favourite star** (`--star`, always a filled glyph): the toggle is an icon button (`.star-btn`, `--ctl-h`, `aria-pressed`, `title` = `aria-label`, hover `--accent-soft`) right after the person's name in the detail header; in a list row it is the `--ctl-h-sm` `.row-star` at the row's right end; where it only shows the state (the tree, after the name) it is a plain 14px `.star` icon. The star is on-screen only: it never reaches the PDF.
- **Person rows** (`PersonRow`, `.rail`): every list of people in the tool bar (People, Recent) uses this one row: sex dot, name, years and the row star, `--ctl-h-sm` high, so the lists never differ in spacing. A click on the selected person deselects it and closes the detail; the same click works on a name in the chart. **Recent panel** (`RecentPanel`): favourites first, then the most recent (30 kept), saved per file in the browser, never in the GEDCOM.
- **Notice strip** (`.notice`): a one-line message about something the app did on its own (e.g. restored unsaved edits) under the frame bar, `--warn-soft` / `--warn-text`, 13px; at the right at most one text button for the way back and a dismiss X (`icon-btn`, `title` = `aria-label`). It stays until dismissed or the situation ends; it is never a dialog.
- **Bulk fix panel** (`BulkFix`, wide panel, rail icon Replace with a `--warn` badge counting groups, not people): `PanelHead`, then three columns divided by 1px lines: vertical tabs (200px), the groups of the tab (300px, finder on top, `--accent-soft` + 3px accent edge on the open one, the free rename form at the bottom) and the open group. The group is blocks separated by 1px lines with 12px uppercase labels: result spelling (`--ctl-h` input), a table of spellings (radio = target, checkbox = replaced, state text `--muted`; the target row `--accent-soft`; a kept row dimmed; `.chip.warn` marks another country), a preview list (`del` `--muted`, `ins` `--accent` 600) and a fixed footer with a summary on the left, a normal button (hide) and the one primary button, whose text names the result and the count.
- **Changes panel** (`ChangesPanel`, rail icon with a count badge, only while there are unsaved changes): `.sp-list` rows, one per record; the title is a link for a person, `--muted` 12px label for the changed field, old value struck through (`del`, `--muted`), new value in `--accent` 600 (`ins`) after an arrow.
- **Edit window** (`EditWindow`, opened by the pencil icon button in the detail header; small fields still edit inline in the detail): a window for editing one person that lies over the tree and the detail, right of the tool bar, which stays visible. It is one fixed width, half of the browser width, so the tree stays visible on the left (a 1px `--border` line between, no shadow); there is no second width. Build: `PanelHead` with the person's name (Spectral 19px) and the close X icon button, a scrolling `.panel-body` made of detail `Section`s separated by 1px lines (the same icons as the detail uses for the same things), and a fixed footer (`.edit-foot`, same as `.bulk-foot`) with the "unsaved changes" text on the left, a normal Cancel button and the one primary Save button, which is disabled while nothing changed. Esc, the X and Cancel close it; when something changed they ask `discard` first. It stays on its person while other people are shown and is hidden (not closed) while a wide tool panel is open.
- Empty state: one line of `--muted` text, centred in the panel.
- Dialogs: `--radius-lg`, header row as in a panel with a close X, footer with buttons on the right,
  backdrop dimmed; Esc and the X close it.
- Scrollbars are the thin global ones.

## 8. Tree view and detail

- Tree rows are 24px with zebra tint; name 600, spouse `--muted`; event letters coloured with the event tokens; selection = accent fill on the name only.
- Fold control: − only on hover, + always with the hidden count.
- Detail is built from `Section` and `Row` (`src/ui/Section.tsx`): section title 12px uppercase, icon column `--d-col`, one coloured icon per event. Detail layout tokens (`--d-icon`, `--d-icon-row`, `--d-col`, `--d-gap`, `--d-section-gap`) stay as documented in `styles.css`.

## 9. Adding a new mini-app

1. Add one icon button to the rail (`.toolbar`), in the order of use (find, overview, check, then new ones). Pick a lucide icon that is not used yet; add a `title` + `aria-label`; a status badge uses `--warn`.
2. Decide the width: **side panel** (always `--panel-w` = 320px, never its own width, opens between rail and tree; the tree stays visible) if it works next to the tree, otherwise **wide panel** (full width right of the rail; tree and detail are hidden).
3. Build it as a component with a `PanelHead` (fixed, section 7) and a scrolling `.panel-body`; use only the controls from section 6.
4. State: `on` on the rail icon while open; clicking it again closes it; opening another mini-app closes this one.
5. Put new tokens in `:root` with a dark value; add a line to this document; strings go to `src/ui/i18n.ts` in all 12 languages.
6. Check light and dark theme, keyboard focus, and the tooltip text before opening a PR. Screenshots in a PR use the Habsburg sample and the English UI.

## 10. The welcome screen

The welcome screen is the same frame: the top bar (app name, language) and below it one centred column of at most 520px: the short description (14px, muted), the drop zone (dashed `--border`, `--radius-lg`, one 36px icon, accent on hover and while dragging), the privacy note (12px, muted) and one regular button for the sample. No other large type or colour is used.

When the browser holds a remembered file (IndexedDB, only in this browser; the app opens it at start), the welcome screen shows, above the drop zone, one row: a `primary` button "Continue with <name>" with the `History` icon and a `.icon-btn` with the `Trash2` icon (`title` = `aria-label` "Forget this file") that deletes the remembered file. The app name in the top bar is a button (`.home`, looks like the heading, accent on hover) that returns to this screen; it asks `discard` first when there are unsaved changes and keeps the remembered file.

## 11. Still open

- The language button shows a flag (flags are the only way to recognise a language); it follows the icon-button size and hover.
- Tooltips and `aria-label` of GED / PDF differ slightly (the tooltip carries the hint text).
- The overview tiles keep their 28–34px circular icons.
- Mobile layout is not designed yet.
