/** Favourite and home people, kept per file in the browser (never written into the GEDCOM). */

export interface Marks {
  /** newest first */
  fav: string[];
  /** the single home person for this file */
  home?: string;
}

export const NO_MARKS: Marks = { fav: [] };

/** The marks after the star of `id` was switched. */
export function toggleFav(m: Marks, id: string): Marks {
  return { ...m, fav: m.fav.includes(id) ? m.fav.filter((x) => x !== id) : [id, ...m.fav] };
}

/** The marks after the home person was changed; there can only be one. */
export function setHome(m: Marks, id: string | null): Marks {
  return id ? { ...m, home: id } : { fav: m.fav };
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
  return m ? { fav: ids(m.fav), ...(typeof m.home === "string" ? { home: m.home } : {}) } : NO_MARKS;
}
