/** The two histories of the page, as plain functions: edits (undo, redo) and browsing (back, forward). */
import type { GedNode } from "../core/gedcom";

const LIMIT = 200;

/** The loaded file: its records (replaced, never changed in place, by edits) and line ending. */
export interface Doc { records: GedNode[]; eol: string }

/** Edit history; `saved` is the version last loaded or downloaded. */
export interface Edits { past: Doc[]; future: Doc[]; saved: Doc | null }

export const NO_EDITS: Edits = { past: [], future: [], saved: null };

/** A fresh history for a file just loaded. */
export const startEdits = (doc: Doc): Edits => ({ past: [], future: [], saved: doc });

/** Whether the file differs from the version last loaded or downloaded. */
export const isDirty = (doc: Doc | null, edits: Edits) => !!doc && doc !== edits.saved;

/** How many edit steps separate the file from the version last loaded or downloaded (0 when clean). Undo past the saved version counts too. */
export function changeCount(doc: Doc | null, edits: Edits): number {
  if (!isDirty(doc, edits)) return 0;
  const back = edits.past.lastIndexOf(edits.saved!);
  if (back >= 0) return edits.past.length - back;
  const ahead = edits.future.indexOf(edits.saved!);
  // the saved version fell out of the kept history: at least all the steps still known
  return ahead >= 0 ? ahead + 1 : Math.max(1, edits.past.length);
}

/** The history after `current` was replaced by a new version: one step of undo, nothing to redo. */
export const edited = (edits: Edits, current: Doc): Edits =>
  ({ ...edits, past: [...edits.past, current].slice(-LIMIT), future: [] });

/** One step back or forward from `current`: the document to show and the history after the step. */
export function stepEdits(edits: Edits, current: Doc, step: -1 | 1): { doc: Doc; edits: Edits } | null {
  if (step < 0) {
    const doc = edits.past[edits.past.length - 1];
    return doc ? { doc, edits: { ...edits, past: edits.past.slice(0, -1), future: [current, ...edits.future] } } : null;
  }
  const doc = edits.future[0];
  return doc ? { doc, edits: { ...edits, past: [...edits.past, current], future: edits.future.slice(1) } } : null;
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
