import { CornerDownRight } from "lucide-react";
import { useEffect, useEffectEvent, useRef, type MouseEvent } from "react";
import type { ShownRow } from "../core/collapse";
import type { StringKey } from "./i18n";

// same geometry as the PDF, in screen pixels
const LINE = 24;
const STEP = 26;
const TICK = 10;
const PAD = 12;
const GAP = LINE * 0.45;
const x = (gen: number) => PAD + (gen - 1) * STEP;
// the root's text leaves room for its −/+ box
const textX = (gen: number) => x(gen) + (gen > 1 ? TICK + 4 : 12);
const BOX = 11;
const mid = (row: number) => row * LINE + LINE / 2;

interface Props {
  rows: ShownRow[];
  focusId: string | null;
  /** bump to scroll the focused person (or the `scrollTo` row) into view */
  scrollKey: number;
  /** index of a row to scroll to and highlight, instead of the focused person */
  scrollTo: number | null;
  /** repeated people point to a number ("see no. 6") rather than "see above" */
  numbered: boolean;
  onFocus: (id: string) => void;
  /** whole = the same for the whole generation */
  onToggle: (row: ShownRow, whole: boolean) => void;
  onJump: (row: ShownRow) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** The chart rows as on the PDF page: indented lines joined by connectors; people are clickable. */
export function TreeView({ rows, focusId, scrollKey, scrollTo, numbered, onFocus, onToggle, onJump, t }: Props) {
  const box = useRef<HTMLDivElement>(null);

  // scroll only the chart box, so the page itself stays where it is; only a new `scrollKey` scrolls
  const scrollToRow = useEffectEvent(() => {
    const el = box.current;
    const row = el?.querySelector<HTMLElement>(scrollTo !== null ? `.tree-row[data-i="${scrollTo}"]` : ".tree-row.sel");
    if (!el || !row) return;
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = top - (el.clientHeight - row.offsetHeight) / 2;
    }
  });
  // oxlint-disable-next-line react/exhaustive-effect-dependencies -- runs again only for a new scrollKey
  useEffect(() => scrollToRow(), [scrollKey]);

  const maxGen = rows.reduce((m, r) => Math.max(m, r.gen), 1);
  const width = x(maxGen + 1);
  const height = rows.length * LINE;
  const lines: string[] = [];
  rows.forEach((r, i) => {
    if (r.tick) lines.push(`M${x(r.gen)} ${mid(i) + 0.5}h${TICK}`);
    for (const l of r.links) {
      const y1 = mid(l.a) + (l.trimA ? GAP : 0), y2 = mid(l.b) - (l.trimB ? GAP : 0);
      if (y2 > y1) lines.push(`M${x(l.gen) + 0.5} ${y1}V${y2}`);
    }
  });

  // the line as styled pieces: bold name, coloured dates, italic places
  const styled = (r: ShownRow) => r.parts.map((p, i) =>
    p.kind === "plain" ? p.text : <span key={i} className={`s-${p.kind}`}>{p.text}</span>);

  const seeText = (r: ShownRow) => {
    const target = r.target!;
    if (numbered && target.ref) return t("seeNo", { n: target.ref });
    return t(r.targetIndex < r.index ? "seeAbove" : "seeBelow");
  };

  return (
    <div className="tree" ref={box}>
      <div className="tree-inner">
        <svg className="tree-lines" width={width} height={height} aria-hidden="true">
          <path d={lines.join("")} />
        </svg>
        {rows.map((r) => {
          const id = r.personId ?? r.spouseId ?? null;
          const flash = scrollTo === r.index;
          const cls = ["tree-row", r.spouse ? "spouse" : "", r.gen === 1 && !r.spouse ? "root" : "",
                       id && id === focusId ? "sel" : "", flash ? "flash" : ""].filter(Boolean).join(" ");
          const toggle = (e: MouseEvent) => onToggle(r, e.shiftKey);
          return (
            // a new key replays the highlight animation on every jump
            <div key={flash ? `${r.index}-${scrollKey}` : r.index} data-i={r.index} className={cls}
                 style={{ paddingLeft: textX(r.gen) }}>
              {id
                ? <button type="button" className="name" onClick={() => onFocus(id)}>{styled(r)}</button>
                : <span>{styled(r)}</span>}
              {r.dup && r.target && <button type="button" className="jump" onClick={() => onJump(r)}>
                <CornerDownRight className="icon" aria-hidden="true" />{seeText(r)}</button>}
              {r.dup && !r.target && <span className="dup"> ({t("repeated")})</span>}
              {r.hidden > 0 && <button type="button" className="more" onClick={toggle}
                                       title={t("hiddenN", { n: r.hidden })}>+{r.hidden}</button>}
              {r.branch && <button type="button" className={r.hidden ? "fold closed" : "fold"} onClick={toggle}
                                   style={{ left: x(r.gen) + 0.5 - BOX / 2 }}
                                   aria-label={r.hidden ? `${t("expand")} – ${t("hiddenN", { n: r.hidden })}` : t("collapse")}
                                   title={r.hidden ? `${t("expand")} – ${t("hiddenN", { n: r.hidden })}` : t("collapse")}>
                {/* −/+ on the connector's corner */}
                <svg width={BOX} height={BOX} aria-hidden="true">
                  <rect x="0.5" y="0.5" width={BOX - 1} height={BOX - 1} rx="2" />
                  <path d={`M3 ${BOX / 2}h${BOX - 6}` + (r.hidden ? `M${BOX / 2} 3v${BOX - 6}` : "")} />
                </svg>
              </button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
