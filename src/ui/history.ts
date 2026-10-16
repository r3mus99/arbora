/** The two histories of the page, as plain functions: edits (undo, redo) and browsing (back, forward). */
import { recordChanges, type RecordChange } from "../core/changes";
import type { GedNode } from "../core/gedcom";

const LIMIT = 200;

/** The loaded file: its records (replaced, never changed in place, by edits) and line ending. */
export interface Doc { records: GedNode[]; eol: string }

/** Records `remove`d at position `at` of the record list before the edit and `insert`ed in their place. */
export interface Splice { at: number; remove: GedNode[]; insert: GedNode[] }

/** One edit: its splices in ascending order of `at` (positions as in the list before the edit). Undo is the same splices backwards. */
export type Op = Splice[];

/**
 * Edit history as a log: the file as it was opened plus the edits made to it, so the log alone (small, it
 * holds only the changed records) is enough to keep the history over a reload.
 * `at` is how many edits are applied, `saved` the `at` of the version last downloaded
 * (null when that version was dropped from the log by a new edit after undo).
 */
export interface Edits { base: Doc | null; ops: Op[]; at: number; saved: number | null }

export const NO_EDITS: Edits = { base: null, ops: [], at: 0, saved: null };

/** A fresh log for a file just opened. */
export const startEdits = (doc: Doc): Edits => ({ base: doc, ops: [], at: 0, saved: 0 });

/** Whether the file differs from the version last opened or downloaded. */
export const isDirty = (edits: Edits) => !!edits.base && edits.at !== edits.saved;

/** How many edit steps separate the file from the version last opened or downloaded (0 when clean). Undo past the saved version counts too. */
export const changeCount = (edits: Edits) =>
  !isDirty(edits) ? 0 : edits.saved === null ? Math.max(1, edits.at) : Math.abs(edits.at - edits.saved);

/**
 * What really differs from the version last opened or downloaded, by comparing records (not by counting edit steps),
 * so a change made and then reverted by hand counts as nothing. Cheap when clean, and unedited records are skipped by identity.
 */
export const unsavedChanges = (edits: Edits, records: GedNode[]): RecordChange[] =>
  edits.base && isDirty(edits) ? recordChanges(replay(edits, edits.saved ?? 0).records, records) : [];

export const canUndo = (edits: Edits) => edits.at > 0;
export const canRedo = (edits: Edits) => edits.at < edits.ops.length;

/** The splices turning record list `a` into `b` (none when they are the same lists of the same records). */
export function diffRecords(a: GedNode[], b: GedNode[]): Op {
  const ops: Op = [];
  if (a.length === b.length) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      let j = i;
      while (j < a.length && a[j] !== b[j]) j++;
      ops.push({ at: i, remove: a.slice(i, j), insert: b.slice(i, j) });
      i = j;
    }
    return ops;
  }
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  return [{ at: head, remove: a.slice(head, a.length - tail), insert: b.slice(head, b.length - tail) }];
}

/** The record list after an edit (or, with `back`, before it); throws when the log does not fit the records. */
export function applyOp(records: GedNode[], op: Op, back = false): GedNode[] {
  const out = records.slice();
  const shifts: number[] = [];
  let shift = 0;
  for (const s of op) { shifts.push(shift); shift += s.insert.length - s.remove.length; }
  for (let k = op.length - 1; k >= 0; k--) {
    const s = op[k];
    const [gone, put] = back ? [s.insert, s.remove] : [s.remove, s.insert];
    const at = back ? s.at + shifts[k] : s.at;
    if (at < 0 || at + gone.length > out.length) throw new Error("edit log does not fit the file");
    out.splice(at, gone.length, ...put);
  }
  return out;
}

/** The log after `current` was replaced by `next`: one step of undo, nothing to redo. */
export function edited(edits: Edits, current: Doc, next: Doc): Edits {
  const op = diffRecords(current.records, next.records);
  if (!op.length) return edits;
  const saved = edits.saved !== null && edits.saved <= edits.at ? edits.saved : null;
  return { ...edits, ops: [...edits.ops.slice(0, edits.at), op], at: edits.at + 1, saved };
}

/** The file with the log applied up to `at` edits. */
export function replay(edits: Edits, at = edits.at): Doc {
  let records = edits.base!.records;
  for (const op of edits.ops.slice(0, at)) records = applyOp(records, op);
  return { ...edits.base!, records };
}

/** One step back or forward from `current`: the document to show and the log after the step. */
export function stepEdits(edits: Edits, current: Doc, step: -1 | 1): { doc: Doc; edits: Edits } | null {
  const op = edits.ops[step < 0 ? edits.at - 1 : edits.at];
  if (!op) return null;
  return { doc: { ...current, records: applyOp(current.records, op, step < 0) }, edits: { ...edits, at: edits.at + step } };
}

/** Back to the version last downloaded, or to the file as opened when that is gone; the edits after it are dropped. */
export function discardUnsaved(edits: Edits): { doc: Doc; edits: Edits } {
  const at = edits.saved !== null && edits.saved <= edits.ops.length ? edits.saved : 0;
  const log = { ...edits, ops: edits.ops.slice(0, at), at, saved: at };
  return { doc: replay(log), edits: log };
}

/** A document with some of its records replaced (by ID); the same document when nothing is given. */
export function withRecords(doc: Doc, changed: GedNode[]): Doc {
  const by = new Map(changed.map((r) => [r.xref, r]));
  return { ...doc, records: doc.records.map((r) => (r.xref && by.get(r.xref)) || r) };
}

/** One step of the browsing history: whose chart and who is in the detail. */
export interface Place { root: string; focus: string }
export interface Browsing { list: Place[]; at: number }

export const NO_BROWSING: Browsing = { list: [], at: -1 };

/** A new place after the current one; places ahead are dropped, a repeat of the current place is not added. */
export function visit(h: Browsing, place: Place): Browsing {
  const cur = h.list[h.at];
  if (cur && cur.root === place.root && cur.focus === place.focus) return h;
  const list = [...h.list.slice(0, h.at + 1), place].slice(-LIMIT);
  return { list, at: list.length - 1 };
}

/** Back (-1) or forward (1) by `step` places, and the place arrived at; null when there is none. */
export function move(h: Browsing, step: number): { browsing: Browsing; place: Place } | null {
  const place = h.list[h.at + step];
  return place ? { browsing: { ...h, at: h.at + step }, place } : null;
}
