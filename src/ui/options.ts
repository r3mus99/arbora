/** Chart options as the settings form edits them, and as they are kept in the browser. */
import { normalize } from "../core/chart";
import { POSTER_BASE_GENERATIONS, POSTER_MAX_GENERATIONS, POSTER_MIN_GENERATIONS } from "../core/poster";
import { DEFAULTS, type ChartKind, type ChartOptions } from "../core/format";
import { LANGS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";

/** Options as edited in the form; number fields keep the typed text. */
export type Form = Omit<ChartOptions, "generations" | "fontSize"> & { generations: string; fontSize: string };

export const toForm = (o: ChartOptions): Form =>
  ({ ...o, generations: String(o.generations), fontSize: String(o.fontSize) });

/** The options for the chart: typed numbers read and kept within bounds. */
export function toOptions(f: Form, lang: Lang): ChartOptions {
  const num = (v: string, d: number) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  return {
    ...f, lang,
    generations: Math.max(0, Math.round(num(f.generations, DEFAULTS.generations))),
    fontSize: Math.min(20, Math.max(5, num(f.fontSize, DEFAULTS.fontSize))),
    posterGenerations: Math.min(POSTER_MAX_GENERATIONS, Math.max(POSTER_MIN_GENERATIONS, Math.round(f.posterGenerations) || DEFAULTS.posterGenerations)),
  };
}

/** The numbering choices of each chart kind. */
export const NUMBERING: Record<ChartKind, [ChartOptions["numbering"], StringKey][]> = {
  ancestors: [["generation", "numGen"], ["ahnentafel", "numAhn"], ["none", "numNone"]],
  descendants: [["generation", "numGen"], ["daboville", "numDab"], ["none", "numNone"]],
};

/** The form with one option changed; another chart kind gets its own kind of numbering. */
export function withOption<K extends keyof Form>(form: Form, key: K, value: Form[K]): Form {
  const next = { ...form, [key]: value };
  return key === "chart" ? { ...next, numbering: normalize({ chart: next.chart, numbering: next.numbering }).numbering } : next;
}

/** the values each choice may have; anything else kept in the browser is dropped */
const CHOICES: { [K in keyof ChartOptions]?: readonly ChartOptions[K][] } = {
  chart: ["ancestors", "descendants"], labels: ["symbols", "abbr"], dates: ["year", "full"],
  places: ["none", "short", "full"], numbering: ["generation", "ahnentafel", "daboville", "none"],
  marriageOn: ["father", "both", "none"], pageSize: ["a4", "a3", "a5", "letter", "legal"],
  orientation: ["portrait", "landscape"], lang: LANGS,
};

/** Options kept in the browser, with defaults for anything missing or no longer valid. */
export function storedOptions(stored: unknown): ChartOptions {
  const o: Record<string, unknown> = stored && typeof stored === "object" ? { ...stored } : {};
  const valid = (key: keyof ChartOptions) => {
    const v = o[key], d = DEFAULTS[key];
    const choices = CHOICES[key] as readonly unknown[] | undefined;
    if (choices) return choices.includes(v);
    return typeof v === typeof d && (typeof v !== "number" || Number.isFinite(v));
  };
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof ChartOptions)[]) {
    if (valid(key)) (out as Record<string, unknown>)[key] = o[key];
  }
  return normalize(out);
}
