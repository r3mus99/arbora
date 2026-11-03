/** The people opened one after another, for the Back and Forward buttons of the detail, as plain functions. */
export interface Trail { ids: string[]; at: number }

export const NO_TRAIL: Trail = { ids: [], at: -1 };

/** A trail that starts with one person. */
export const startTrail = (id: string): Trail => ({ ids: [id], at: 0 });

/** The trail after a person was opened: what lay ahead of the current person is dropped; the same person twice in a row counts once. */
export function visit(trail: Trail, id: string): Trail {
  if (trail.ids[trail.at] === id) return trail;
  return { ids: [...trail.ids.slice(0, trail.at + 1), id], at: trail.at + 1 };
}

/** One step back (-1) or forward (1) to the nearest person that still `exists` (people can be deleted or merged); null when there is none. */
export function stepTrail(trail: Trail, step: -1 | 1, exists: (id: string) => boolean): { trail: Trail; id: string } | null {
  for (let i = trail.at + step; i >= 0 && i < trail.ids.length; i += step) {
    if (exists(trail.ids[i])) return { trail: { ...trail, at: i }, id: trail.ids[i] };
  }
  return null;
}
