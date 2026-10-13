# Design guidelines

This is the single reference for how Arbora looks. Every screen is built from the same few tokens and rules; when you
add a component, pick from here instead of inventing a number. The tokens live at the top of `src/ui/styles.css`:
change a token, never a literal value in a rule.

Status of this document: the **rules** below are the target. Section 10 lists where the current code still differs;
the follow-up "unify" change brings the code in line.

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR   Arbora · open file │ undo redo │ save GED · PDF │ settings │ language │
├──┬───────────────┬───────────────────────────────────────────┬───────────────┤
│R │ MINI-APP      │  MAIN COMPONENT                           │  PERSON       │
│A │ PANEL         │  tree view                                │  DETAIL       │
│I │ (1/3 wide or  │  (header row: Ancestors/Descendants,      │  (340px)      │
│L │ full width)   │   generations)                            │               │
└──┴───────────────┴───────────────────────────────────────────┴───────────────┘
```

- **Top bar** (global, not about one person): app name, the open file, undo / redo, save GED, save PDF, settings,
  language. Order is fixed: identity, file, history, output, preferences. Anything that changes the whole document
  or the app belongs here.
- **Rail** (left, icon column): one icon per mini-app. Opens and closes the mini-app panel.
- **Mini-app panel**: opens next to the rail. Either a *side panel* (people list, overview: about 1/3 of the screen,
  fixed width 250–320px) or a *wide panel* (file check, later: people table, editor) that replaces the tree and
  detail and takes the full width right of the rail. Only one mini-app is open at a time.
- **Main component** (centre): the tree view. It is the only thing that is always there; it is never
  squeezed below a usable width, so a side panel is hidden before the tree is.
- **Detail** (right): the selected person, read-only timeline now, editing later. Hidden by a wide panel.
- The frame below the top bar has **one fixed height** (window minus top bar). Panels never change it; their content
  scrolls inside. Columns are divided by 1px `--border` lines, not by cards or shadows.
- Mobile layout is out of scope for now.

## 2. Tokens

| Token | Value | Used for |
| --- | --- | --- |
| `--head-h` | 52px | header row of every panel (rail first icon, search box, chart switch, person name, wide panel title); one continuous line under them across the frame |
| `--ctl-h` | 36px | height of every control: inputs, selects, switch, buttons, icon buttons, rail icons |
| `--ctl-h-sm` | 28px (new) | the one smaller control height, only for controls inside a list row or a card (chips, inline inputs, row buttons) |
| `--icon` | 18px | icons in controls, headers, rail and top bar |
| `--icon-sm` | 14px (new) | icons inside text lines, chips, badges, links |
| `--radius` | 8px | corners of controls, inputs, switches, tree selection |
| `--radius-lg` | 12px (new) | corners of the frame, dialogs' inner cards, tiles |
| `--radius-pill` | 999px (new) | chips, count badges only |
| `--pad` | 14px | side padding of a panel and gap between blocks inside it |
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

## 5. Icons

- Library: lucide only, stroke icons, `aria-hidden` when decorative.
- Size: `--icon` 18px in controls and headers, `--icon-sm` 14px inline in text, chips and badges, 15px inside
  detail rows (`--d-icon-row`). The welcome drop zone icon (36px) is the only large one.
- Colour: `currentColor`; muted when idle, accent when active, event colour on timeline rows. An icon never
  has its own background circle except in the overview tile.
- One meaning, one icon: Search = find a person, LayoutDashboard = overview, ShieldCheck / ShieldAlert = file check,
  Settings = settings, FileDown = save GED, FileText = save PDF, Undo2 / Redo2 = history, X = close or remove,
  MapPin = place. Do not reuse an icon for a different meaning (the old file-check wand and the overview's
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
| Tabs (vertical, in a wide panel) | rail-like rows: `--ctl-h`, `--radius`, active = `--accent-soft` + `--accent`. Count badge on the right. |
| Link | `--accent`, underlined on hover only, except inside long free text (sources) where it is always underlined. A link that is a person's name is `--text`, 600, underlined on hover. Links to other sites open in a new tab with `rel="noopener noreferrer"`. A text-looking button (`button.link`) looks exactly like a link. |

States, in order of precedence: disabled > active/on > hover > rest. Focus ring is separate and always visible on keyboard focus.

## 7. Panels, headers, lists

- Every panel starts with a header row: `--head-h`, `0 var(--pad)`, bottom border, title 14px 600 (or the control
  that lives there). No panel has a heading style of its own.
- Body padding `--pad`; blocks inside are separated by a 1px line with `--pad` above and below, not by margins alone.
- List rows (people, rankings): 14px, padding `3px 10px`, hover `--accent-soft`, selected = accent fill with
  `--accent-text`. Secondary text on the row is 12px `--muted`.
- Tiles / cards (overview, variant groups): `--radius-lg`, 1px border, `--bg` fill, padding `10px 12px`.
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
2. Decide the width: **side panel** (fixed 250–320px, opens between rail and tree; the tree stays visible) if it works next to the tree, otherwise **wide panel** (full width right of the rail; tree and detail are hidden).
3. Build it as a component with a header row (`--head-h`) and a scrolling body; use only the controls from section 6.
4. State: `on` on the rail icon while open; clicking it again closes it; opening another mini-app closes this one.
5. Put new tokens in `:root` with a dark value; add a line to this document; strings go to `src/ui/i18n.ts` in all 12 languages.
6. Check light and dark theme, keyboard focus, and the tooltip text before opening a PR. Screenshots in a PR use the Habsburg sample and the English UI.

## 10. Known inconsistencies in the code (to fix in the unify step)

Layout and top bar
- The top bar is a separate sticky header with its own 1px bottom line, 14px margin and a dashed pill for the file; it is not part of the frame and not `--head-h` high. The app name is a second place with its own 28px Spectral size.
- Top bar buttons: GED / PDF are text+icon, undo/redo/settings are icon-only; the language button has a different padding (6px 10px) and shows a flag instead of an icon.
- The status line ("saved" etc.) is a loose paragraph below the bar.
- The footer and the welcome page use 13px and 60px text outside the scale.

Typography and colour
- Font sizes in use: 10.5, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 17, 19, 22 px; the scale allows 12 and 14.
- Literal colours in rules: `#b7791f` (warning, 6x), sex colours `#3f6fa8` / `#b0507a` (4x each), event colours of christening, residence, event, child, burial, the tab count badge (`#f3e3c3` / `#7a4f0e` / `#4a3a1c` / `#f1cf8a`), `#fff` backgrounds.
- Text is dimmed with `opacity: .8` in several places (tree meta, sources, name parts) instead of `--muted`.

Radii, heights, spacing
- Radii in use: 2, 4, 5, 6, 8, 9, 10, 12, 14, 16, 999px and 50%; the system has 8, 12 and pill.
- The editor form (fields, buttons, sex choice, items) uses 12/14px radii, 15px text, 9–10px paddings, pill "add" buttons and no `--ctl-h`: it looks like another app.
- Bulk-fix (Variants) uses a local 32px row height, inputs with 8px radius and 150px width, chips and buttons of that height.
- The file check list has its own card (14px radius, 15px title) in addition to the wide-panel header.
- Overview tiles use 34px/28px circular icons, 22px/19px numbers and an 11px uppercase label with .07em tracking (section titles use 12px / .04em).
- Dialog: 16px radius, 17px title, separate footer.

Controls and states
- Three different "segmented" implementations (generation buttons, Ancestors/Descendants radios, editor sex choice) with different paddings and hover.
- `button.link` (underlined accent) vs `.src-entries a` (underlined, offset 2px) vs `.tl` links vs the map-link icon: four link looks.
- Hover on rail/top bar icons differs: rail = soft accent background, top bar = border + panel fill, detail header = same as top bar.
- Focus ring: global 3px outline, but the editor fields replace it with border + box-shadow, the segmented inputs use an inset ring.
- Disabled state: opacity .5 on buttons; the editor `.copy` and the `.link:disabled` have their own look.
- Icon sizes in CSS: 13, 14, 15, 16, 17, 18 px; the system has 14, 15 (detail rows) and 18.
- Icon-only buttons without a keyboard shortcut hint vs with (Ctrl+Z); several tooltips and labels differ (`title` text vs `aria-label`, e.g. the GED button's label is shorter than its tooltip).
- Icon meaning: ShieldCheck / ShieldAlert is used both for the check tool and inside the overview tile; MapPin for place in two different sizes.

Text
- Mixed casing: small-caps labels (editor, overview, section titles) use three different sizes/tracking; button labels are sentence case, tab labels vary.
- Hint/help text is 12px, 13px or 14px depending on the panel.
