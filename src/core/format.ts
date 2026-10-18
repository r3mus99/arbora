/** Dates, places and the text of one person's line. */

import { monthOf } from "./date";
import type { Family, GedEvent, Person } from "./gedcom";
import { TEXTS, type Lang } from "./texts";

export type ChartKind = "ancestors" | "descendants";

export interface ChartOptions {
  chart: ChartKind;
  lang: Lang;
  labels: "symbols" | "abbr";
  dates: "year" | "full";
  places: "none" | "short" | "full";
  /** also print the latest residence, when it differs from the places of birth and death */
  showResidence: boolean;
  numbering: "generation" | "ahnentafel" | "daboville" | "none";
  /** ancestors: next to which parent the parents' marriage is printed */
  marriageOn: "father" | "both" | "none";
  /** maximum number of generations including the root, 0 = all */
  generations: number;
  /** descendants: print spouse lines */
  showSpouses: boolean;
  /** custom title, empty = automatic */
  title: string;
  showDate: boolean;
  pageSize: "a4" | "a3" | "a5" | "letter" | "legal";
  orientation: "portrait" | "landscape";
  fontSize: number;
  lineHeight: number;
  margin: number;
  /** PDF: colour the dates and places like the screen (bold names and italic places are always used) */
  colorPdf: boolean;
}

export const DEFAULTS: ChartOptions = {
  generations: 0, lang: "sk", labels: "symbols", dates: "year", places: "none", showResidence: false,
  chart: "ancestors", showSpouses: true,
  numbering: "generation", marriageOn: "father", title: "", showDate: true, pageSize: "a4", orientation: "portrait",
  fontSize: 8.5, lineHeight: 1.7, margin: 36, colorPdf: false,
};

export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k]));

const SYMBOLS = { birt: "*", marr: "∞", deat: "†" };
const DIVORCE_SYMBOL = "⚮";

/** What marks a divorced marriage: the symbol, or the abbreviation with abbreviated labels. */
export const divorceMark = (o: ChartOptions) => o.labels === "symbols" ? DIVORCE_SYMBOL : TEXTS[o.lang].divorced;
type EventKind = keyof typeof SYMBOLS;

/** Day (may be null), month and year in the date format of the language. */
export function formatDMY(lang: Lang, d: number | null, m: number, y: number): string {
  const t = TEXTS[lang];
  const pad = (n: number | null) => String(n).padStart(2, "0");
  const vars = { d: String(d), m, y, dd: pad(d), mm: pad(m), M: t.months[m - 1] };
  return fmt(d ? t.date.dmy : t.date.my, vars);
}

const DATE_RE = /(?:(\d{1,2})\s+)?(?:([A-Z]{3})\s+)?(\d{3,4})\b/;
const ISO_RE = /(\d{4})-(\d{2})-(\d{2})/;

/** A GEDCOM date as year only, or as a full date when `full` is set. */
export function formatDate(raw: string, full: boolean, lang: Lang): string {
  const t = TEXTS[lang];
  let s = (raw || "").toUpperCase().trim();
  if (!s) return "";
  if (s.startsWith("(") && s.endsWith(")")) return raw.replace(/^[(\s]+|[)\s]+$/g, "");

  const one = (part: string) => {
    let y: number, mo: number | null, d: number | null;
    const iso = ISO_RE.exec(part);
    if (iso) {
      y = +iso[1]; mo = +iso[2]; d = +iso[3];
    } else {
      const m = DATE_RE.exec(part);
      if (!m) return part.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      d = m[1] ? +m[1] : null;
      mo = monthOf(m[2] || "") || null;
      y = +m[3];
    }
    if (!full || !mo) return String(y);
    return formatDMY(lang, d, mo, y);
  };

  let qual = "{d}";
  const QUAL = { ABT: "ABT", EST: "ABT", CAL: "ABT", BEF: "BEF", AFT: "AFT" } as const;
  for (const key of Object.keys(QUAL) as (keyof typeof QUAL)[]) {
    if (s.startsWith(key + " ")) { qual = t.qual[QUAL[key]]; s = s.slice(key.length + 1); break; }
  }
  const rng = /(?:BET|FROM)\s+(.+?)\s+(?:AND|TO)\s+(.+)/.exec(s);
  if (rng) {
    const a = one(rng[1]), b = one(rng[2]);
    return a === b ? a : `${a}–${b}`;
  }
  s = s.replace(/^(FROM|TO|INT)\s+/, "").replace(/\s*\(.*\)$/, "");
  return fmt(qual, { d: one(s) });
}

export function formatPlace(raw: string, mode: ChartOptions["places"]): string {
  if (mode === "none" || !raw) return "";
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return "";
  return mode === "short" ? parts[0] : parts.join(", ");
}

export function label(kind: EventKind, o: ChartOptions): string {
  return o.labels === "symbols" ? SYMBOLS[kind] : TEXTS[o.lang].abbr[kind];
}

/** A piece of a person's line; the screen and the PDF style each kind (bold, italic, colour). */
export type SegKind = "num" | "name" | "plain" | "birt" | "marr" | "deat" | "place";
export interface Seg { text: string; kind: SegKind }

/** The pieces of an event: label and date in the colour of the event, the place apart. */
export function eventSegments(kind: EventKind, ev: GedEvent | null, o: ChartOptions, extra = ""): Seg[] {
  if (!ev && !extra) return [];
  const date = ev ? formatDate(ev.date, o.dates === "full", o.lang) : "";
  const place = ev ? formatPlace(ev.place, o.places) : "";
  if (!date && !place && !extra) return [];
  const segs: Seg[] = [{ text: label(kind, o) + date, kind }];
  if (place) segs.push({ text: (date ? " " : "") + place, kind: "place" });
  if (extra === DIVORCE_SYMBOL) segs.push({ text: (date || place ? " " : "") + extra, kind });
  else if (extra) segs.push({ text: (date || place ? " (" : "") + extra + (date || place ? ")" : ""), kind });
  return segs;
}

export function formatEvent(kind: EventKind, ev: GedEvent | null, o: ChartOptions, extra = ""): string {
  return eventSegments(kind, ev, o, extra).map((s) => s.text).join("");
}

const samePlace = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The latest residence as shown, or "" when places are off, there is none, or it is the place of birth or death. */
export function residencePlace(p: Person, o: ChartOptions): string {
  const home = p.residence?.place;
  if (!home || o.places === "none") return "";
  const shown = formatPlace(home, o.places);
  const known = [p.birth?.place, p.death?.place].filter((x): x is string => !!x);
  if (known.some((x) => samePlace(x, home) || samePlace(formatPlace(x, o.places), shown))) return "";
  return shown;
}

/** Pieces of "<number>. <name> (<birth>, <marriage>, <death>)". */
export function personSegments(p: Person | null, number: number | string | null,
                               marriage: Family | null, o: ChartOptions): Seg[] {
  const name = p && p.name ? p.name : "?";
  const events: Seg[][] = [];
  if (p) events.push(eventSegments("birt", p.birth, o));
  if (marriage) events.push(eventSegments("marr", marriage.marriage, o,
                                          marriage.divorced ? divorceMark(o) : ""));
  if (p) events.push(eventSegments("deat", p.death, o));
  const shown = events.filter((e) => e.length);
  const segs: Seg[] = [];
  if (number !== null) segs.push({ text: `${number}. `, kind: "num" });
  segs.push({ text: name, kind: "name" });
  shown.forEach((e, i) => {
    segs.push({ text: i === 0 ? " (" : ", ", kind: "plain" }, ...e);
  });
  if (shown.length) segs.push({ text: ")", kind: "plain" });
  const home = p && o.showResidence ? residencePlace(p, o) : "";
  if (home) segs.push({ text: ` ${o.labels === "symbols" ? "⌂" : TEXTS[o.lang].abbr.resi.trim()} ${home}`, kind: "place" });
  return segs;
}

/** "<number>. <name> (<birth>, <marriage>, <death>)" */
export function personLine(p: Person | null, number: number | string | null,
                           marriage: Family | null, o: ChartOptions): string {
  return personSegments(p, number, marriage, o).map((s) => s.text).join("");
}
