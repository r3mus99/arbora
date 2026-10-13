/** What differs between two versions of a file, by record and by line, for the list of unsaved changes. */

import { mainName, type GedNode } from "./gedcom";

/** One line of a record that differs; `path` is the tags from the record down ("BIRT/DATE"). */
export interface FieldChange { path: string; before: string | null; after: string | null }

export interface RecordChange {
  xref: string | null;
  tag: string;
  /** the person's name (INDI), else empty */
  title: string;
  kind: "added" | "removed" | "changed";
  /** the lines that differ (for an added or removed record: all its lines) */
  fields: FieldChange[];
}

/** The lines of a record as path → values, in file order (a path can repeat: two NAME lines). */
function flatten(node: GedNode, prefix: string, out: Map<string, string[]>) {
  for (const c of node.children) {
    if (c.verbatim !== undefined) continue;
    const path = prefix ? `${prefix}/${c.tag}` : c.tag;
    const list = out.get(path) || [];
    list.push(c.value.trim());
    out.set(path, list);
    flatten(c, path, out);
  }
}
const linesOf = (rec: GedNode) => { const m = new Map<string, string[]>(); flatten(rec, "", m); return m; };

/** Lines of `b` that differ from those of `a`; the n-th line of a path is compared with the n-th, the rest are added or removed. */
function fieldChanges(a: GedNode | null, b: GedNode | null): FieldChange[] {
  const x = a ? linesOf(a) : new Map<string, string[]>(), y = b ? linesOf(b) : new Map<string, string[]>();
  const out: FieldChange[] = [];
  for (const path of new Set([...x.keys(), ...y.keys()])) {
    const before = x.get(path) || [], after = y.get(path) || [];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      const p = i < before.length ? before[i] : null, n = i < after.length ? after[i] : null;
      if (p !== n) out.push({ path, before: p, after: n });
    }
  }
  return out;
}

const titleOf = (r: GedNode) => (r.tag === "INDI" ? (mainName(r)?.value || "").replace(/\//g, " ").replace(/\s+/g, " ").trim() : "");
const keyOf = (r: GedNode) => r.xref || r.tag;

/**
 * Changes from `before` to `after`. Records are matched by ID (HEAD and TRLR by tag); a record that is the same
 * object in both is skipped without looking inside, so the cost follows the number of edits, not the file size.
 * Changes that cancel out (a value changed and changed back) do not show.
 */
export function recordChanges(before: GedNode[], after: GedNode[]): RecordChange[] {
  const old = new Map(before.map((r) => [keyOf(r), r]));
  const out: RecordChange[] = [];
  const seen = new Set<string>();
  after.forEach((r) => {
    const key = keyOf(r);
    seen.add(key);
    const was = old.get(key);
    if (was === r) return;
    if (!was) { out.push({ xref: r.xref, tag: r.tag, title: titleOf(r), kind: "added", fields: fieldChanges(null, r) }); return; }
    const fields = fieldChanges(was, r);
    if (fields.length) out.push({ xref: r.xref, tag: r.tag, title: titleOf(r), kind: "changed", fields });
  });
  for (const [key, r] of old) if (!seen.has(key)) out.push({ xref: r.xref, tag: r.tag, title: titleOf(r), kind: "removed", fields: fieldChanges(r, null) });
  return out;
}
