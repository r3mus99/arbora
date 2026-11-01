/** Helpers for place names. */

/** The municipality of a place written as "Village, District, Country": the part before the first comma. */
export const municipality = (place: string) => place.split(",")[0].trim();
