/** Dates, places and the text of one person's line. */

import type { Family, GedEvent, Person } from "./gedcom";
import { TEXTS, type Lang } from "./texts";

export type ChartKind = "ancestors" | "descendants";

export interface ChartOptions {
  chart: ChartKind;
  lang: Lang;
  labels: "symbols" | "abbr";
  dates: "year" | "full";
  places: "none" | "short" | "full";
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
}

export const DEFAULTS: ChartOptions = {
  generations: 0, lang: "sk", labels: "symbols", dates: "year", places: "none",
  chart: "ancestors", showSpouses: true,
  numbering: "generation", marriageOn: "father", title: "", showDate: true, pageSize: "a4", orientation: "portrait",
  fontSize: 8.5, lineHeight: 1.7, margin: 36,
};

export const fmt = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k]));

const SYMBOLS = { birt: "*", marr: "∞", deat: "†" };
type EventKind = keyof typeof SYMBOLS;
const MONTHS: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
                                         JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

/** Day (may be null), month and year in the date format of the language. */
export function formatDMY(lang: Lang, d: number | null, m: number, y: number): string {
  const t = TEXTS[lang];
  const pad = (n: number | null) => String(n).padStart(2, "0");
  const vars = { d: String(d), m, y, dd: pad(d), mm: pad(m), M: t.months ? t.months[m - 1] : m };
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
      mo = MONTHS[m[2] || ""] || null;
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

export function formatEvent(kind: EventKind, ev: GedEvent | null, o: ChartOptions, extra = ""): string {
  if (!ev && !extra) return "";
  const date = ev ? formatDate(ev.date, o.dates === "full", o.lang) : "";
  const place = ev ? formatPlace(ev.place, o.places) : "";
  let body = [date, place].filter(Boolean).join(" ");
  if (extra) body = body ? `${body} (${extra})` : extra;
  return body ? label(kind, o) + body : "";
}

/** "<number>. <name> (<birth>, <marriage>, <death>)" */
export function personLine(p: Person | null, number: number | string | null,
                           marriage: Family | null, o: ChartOptions): string {
  const t = TEXTS[o.lang];
  const name = p && p.name ? p.name : "?";
  const bits: string[] = [];
  if (p) bits.push(formatEvent("birt", p.birth, o));
  if (marriage) bits.push(formatEvent("marr", marriage.marriage, o,
                                      marriage.divorced ? t.divorced : ""));
  if (p) bits.push(formatEvent("deat", p.death, o));
  const b = bits.filter(Boolean);
  let text = number !== null ? `${number}. ${name}` : name;
  if (b.length) text += " (" + b.join(", ") + ")";
  return text;
}
