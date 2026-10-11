import { useEffect, useRef } from "react";
import type { Row } from "../core/chart";
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
  rows: Row[];
  focusId: string | null;
  /** bump to scroll the focused person into view */
  scrollKey: number;
  onFocus: (id: string) => void;
  t: (key: StringKey) => string;
}

/** The chart rows as on the PDF page: indented lines joined by connectors; people are clickable. */
export function TreeView({ rows, focusId, scrollKey, onFocus, t }: Props) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector(".tree-row.sel")?.scrollIntoView({ block: "nearest", inline: "nearest" });
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

  return (
    <div className="tree" ref={box}>
      <div className="tree-inner">
        <svg className="tree-lines" width={width} height={height} aria-hidden="true">
          <path d={lines.join("")} />
        </svg>
        {rows.map((r, i) => {
          const id = r.personId ?? r.spouseId ?? null;
          const cls = ["tree-row", r.spouse ? "spouse" : "", r.gen === 1 && !r.spouse ? "root" : "",
                       id && id === focusId ? "sel" : ""].filter(Boolean).join(" ");
          return (
            <div key={i} className={cls} style={{ paddingLeft: textX(r.gen) }}>
              {id
                ? <button type="button" onClick={() => onFocus(id)}>{r.text}</button>
                : <span>{r.text}</span>}
              {r.dup && <span className="dup"> ({t("repeated")})</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
