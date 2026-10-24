/** Recently visited, favourite and home people, kept per file in the browser (never written into the GEDCOM). */

export interface Marks {
  /** most recent first */
  recent: string[];
  /** newest first */
  fav: string[];
  /** the single home person for this file */
  home?: string;
}

export const NO_MARKS: Marks = { recent: [], fav: [] };

/** how many recently visited people are kept; favourites are not capped */
export const RECENT_LIMIT = 30;

/** The marks after `id` was visited: first in the list; the same object when it already is. */
export function visited(m: Marks, id: string): Marks {
  if (m.recent[0] === id) return m;
  return { ...m, recent: [id, ...m.recent.filter((x) => x !== id)].slice(0, RECENT_LIMIT) };
}

/** The marks after the star of `id` was switched. */
export function toggleFav(m: Marks, id: string): Marks {
  return { ...m, fav: m.fav.includes(id) ? m.fav.filter((x) => x !== id) : [id, ...m.fav] };
}

/** The marks after the home person was changed; there can only be one. */
export function setHome(m: Marks, id: string | null): Marks {
  return id ? { ...m, home: id } : { recent: m.recent, fav: m.fav };
}

export interface Entry { id: string; fav: boolean }

/** The list to show: favourites first, then the other recent people; people no longer in the file are left out. */
export function listing(m: Marks, exists: (id: string) => boolean): Entry[] {
  const fav = m.fav.filter(exists).map((id) => ({ id, fav: true }));
  const rest = m.recent.filter((id) => exists(id) && !m.fav.includes(id)).map((id) => ({ id, fav: false }));
  return [...fav, ...rest];
}

/** The key of a file in the store: its name, or one for the built-in sample. */
export const fileKey = (name: string | null) => (name === null ? "\u0000sample" : name);

const FILES = 30;

/** The store with the marks of one file set, most recently used files kept. */
export function withMarks(all: Record<string, Marks> | undefined, key: string, m: Marks): Record<string, Marks> {
  const rest = Object.entries(all || {}).filter(([k]) => k !== key);
  return Object.fromEntries([...rest, [key, m]].slice(-FILES));
}

/** Marks read from the store, tolerating anything unexpected. */
export function marksOf(all: Record<string, Marks> | undefined, key: string): Marks {
  const m = all?.[key];
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return m ? { recent: ids(m.recent), fav: ids(m.fav), ...(typeof m.home === "string" ? { home: m.home } : {}) } : NO_MARKS;
}
