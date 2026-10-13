# Design guidelines

The app is one frame with four columns side by side: the tool bar, the panel of the open tool (the list of people),
the chart in the middle and the person detail on the right. They are divided by thin lines, not by separate cards,
and they follow the same few rules. The sizes are tokens at the top of `src/ui/styles.css`; change a token, not a number.

| Token | Value | Used for |
| --- | --- | --- |
| `--head-h` | 52px | height of the header row of every panel: the tool bar's first icon, the search box, the Ancestors/Descendants switch, the person name. The line under the headers is one line across the whole frame. |
| `--ctl-h` | 36px | height of every control: inputs, selects, switches, buttons, icon buttons, tool bar icons |
| `--icon` | 18px | icons in controls and headers (icons inside the detail lines are smaller, see `--d-icon-row`) |
| `--radius` | 8px | corners of controls; the outer frame uses 12px |
| `--pad` | 14px | side padding of a panel |

Text has two sizes: 14px for content and controls, 12px for small print (titles of sections, labels, years). Titles of
people are in Spectral, everything else in the system font.

Colours: `--panel` for panel surfaces, `--bg` for the page, tool bar and inputs, `--border` for every line,
`--accent` for the active thing (the open tool, the chosen switch, the chosen person) and `--muted` for secondary text.

Rules for a new panel or tool:

- The header row is `--head-h` high with `--pad` on the sides and a bottom line in `--border`.
- A tool is one icon button in the tool bar; the icon of the open panel is highlighted (`.on`) and a second click on it closes the panel.
- Controls use `--ctl-h`, `--radius` and the 14px text; do not size a control with its own padding numbers.
- Scrollbars are the thin global ones; do not style a panel's own scrollbar.
- Blocks inside the detail are built from `Section` and `Row` (`src/ui/Section.tsx`).
