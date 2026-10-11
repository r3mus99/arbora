import { CornerDownRight, Minus, Plus } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import type { ShownRow } from "../core/collapse";
import type { StringKey } from "./i18n";

// same geometry as the PDF, in screen pixels
const LINE = 24;
const STEP = 26;
const TICK = 10;
const PAD = 6;
const GAP = LINE * 0.45;
const x = (gen: number) => PAD + (gen - 1) * STEP;
const textX = (gen: number) => x(gen) + (gen > 1 ? TICK + 4 : 0);
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

  useEffect(() => {
    // scroll only the chart box, so the page itself stays where it is
    const el = box.current;
    const row = el?.querySelector<HTMLElement>(scrollTo !== null ? `.tree-row[data-i="${scrollTo}"]` : ".tree-row.sel");
    if (!el || !row) return;
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top < el.scrollTop || bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = top - (el.clientHeight - row.offsetHeight) / 2;
    }
  }, [scrollKey]);

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
                ? <button type="button" className="name" onClick={() => onFocus(id)}>{r.text}</button>
                : <span>{r.text}</span>}
              {r.dup && r.target && <button type="button" className="jump" onClick={() => onJump(r)}>
                <CornerDownRight className="icon" aria-hidden="true" />{seeText(r)}</button>}
              {r.dup && !r.target && <span className="dup"> ({t("repeated")})</span>}
              {r.branch && (r.hidden
                ? <button type="button" className="fold closed" onClick={toggle} title={t("expand")}
                          aria-label={`${t("expand")}, ${t("hiddenN", { n: r.hidden })}`}>
                    <Plus className="icon" aria-hidden="true" />{r.hidden}</button>
                : <button type="button" className="fold" onClick={toggle} title={t("collapse")}
                          aria-label={t("collapse")}>
                    <Minus className="icon" aria-hidden="true" /></button>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
