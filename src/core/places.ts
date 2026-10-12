/** Map coordinates written under a place: PLAC with MAP (LATI, LONG), or a linked _LOC record. */

import { childOf, type GedNode } from "./gedcom";

export interface Coords { lat: number; lon: number }

/** "N48.2085", "S12.5", "-3.7" → a signed number, or null when it is not a coordinate */
function degrees(value: string | null | undefined, plus: string, minus: string): number | null {
  const m = /^\s*([NSEW]?)\s*(-?\d+(?:[.,]\d+)?)\s*([NSEW]?)\s*$/i.exec(value || "");
  if (!m) return null;
  const n = parseFloat(m[2].replace(",", "."));
  const hemi = (m[1] || m[3]).toUpperCase();
  const out = hemi === minus ? -Math.abs(n) : hemi === plus ? Math.abs(n) : n;
  return Number.isFinite(out) ? out : null;
}

const fromMap = (map: GedNode | null): Coords | null => {
  const lat = degrees(map && childOf(map, "LATI")?.value, "N", "S");
  const lon = degrees(map && childOf(map, "LONG")?.value, "E", "W");
  return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
};

/** The coordinates of the place written under an event line, if it has any. */
export function placeCoords(event: GedNode, lookup?: (xref: string) => GedNode | undefined): Coords | null {
  const plac = childOf(event, "PLAC");
  if (!plac) return null;
  const own = fromMap(childOf(plac, "MAP"));
  if (own) return own;
  const link = childOf(plac, "_LOC")?.value;
  const loc = link && lookup ? lookup(link) : undefined;
  return loc ? fromMap(childOf(loc, "MAP")) : null;
}

/** A page showing the point on a map. */
export const mapUrl = (c: Coords) =>
  `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=12/${c.lat}/${c.lon}`;
