/** Collapsed branches: which chart rows stay visible when some people's branches are folded away. */

import type { Link, Row } from "./chart";

/** Paths of the rows a row hangs under, nearest last ("1.f.m" → "1", "1.f"). */
export function parentPaths(path: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < path.length; i++) if (path[i] === "." || path[i] === "~") out.push(path.slice(0, i));
  return out;
}

/** Number of person rows under each path (spouse lines not counted). */
export function branchSizes(rows: Row[]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const r of rows) {
    for (const p of parentPaths(r.path)) {
      if (!sizes.has(p)) sizes.set(p, 0);
      if (!r.spouse) sizes.set(p, sizes.get(p)! + 1);
    }
  }
  return sizes;
}

export interface ShownRow extends Row {
  /** index in the full row list */
  index: number;
  /** people hidden under this row, when it is collapsed */
  hidden: number;
  /** the row has a branch that can be collapsed */
  branch: boolean;
  /** index of the expanded row a repeated person points to, else -1 */
  targetIndex: number;
}

/** Rows left after folding the branches under `collapsed` paths; connectors are renumbered. */
export function visibleRows(rows: Row[], collapsed: ReadonlySet<string>): ShownRow[] {
  const sizes = branchSizes(rows);
  const at = new Map(rows.map((r, i) => [r, i]));
  const isHidden = (r: Row) => parentPaths(r.path).some((p) => collapsed.has(p));
  const newIndex = new Map<number, number>();
  const kept: number[] = [];
  rows.forEach((r, i) => {
    if (isHidden(r)) return;
    newIndex.set(i, kept.length);
    kept.push(i);
  });
  return kept.map((i) => {
    const r = rows[i];
    const folded = collapsed.has(r.path) && sizes.has(r.path);
    const links: Link[] = folded ? [] : r.links
      .filter((l) => newIndex.has(l.a) && newIndex.has(l.b))
      .map((l) => ({ ...l, a: newIndex.get(l.a)!, b: newIndex.get(l.b)! }));
    return { ...r, links, index: i, branch: sizes.has(r.path), hidden: folded ? sizes.get(r.path)! : 0,
             targetIndex: r.target ? at.get(r.target) ?? -1 : -1 };
  });
}

/** Collapse every branch starting in generation `gen`, so `gen` generations stay shown. */
export function collapseAt(rows: Row[], gen: number): Set<string> {
  const sizes = branchSizes(rows);
  return new Set(rows.filter((r) => r.gen === gen && !r.spouse && sizes.has(r.path)).map((r) => r.path));
}

/** Collapsed set without the branches that hide the row at `path`. */
export function reveal(collapsed: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(collapsed);
  for (const p of parentPaths(path)) next.delete(p);
  return next;
}
