/** Chart options as the settings form edits them, and as they are kept in the browser. */
import { normalize } from "../core/chart";
import { DEFAULTS, type ChartKind, type ChartOptions } from "../core/format";
import { LANGS, TEXTS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";

/** What the app starts with: the core defaults, but places (the town only) are shown. */
export const APP_DEFAULTS: ChartOptions = { ...DEFAULTS, showPlaces: true };

/** Options as edited in the form; number fields keep the typed text. */
export type Form = Omit<ChartOptions, "generations"> & { generations: string };

export const toForm = (o: ChartOptions): Form =>
  ({ ...o, generations: String(o.generations) });

/** The options for the chart: typed numbers read and kept within bounds. */
export function toOptions(f: Form, lang: Lang): ChartOptions {
  const num = (v: string, d: number) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  return {
    ...f, lang,
    generations: Math.max(0, Math.round(num(f.generations, DEFAULTS.generations))),
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
  numbering: ["generation", "ahnentafel", "daboville", "none"],
  lang: LANGS,
};

/** Options kept in the browser, with defaults for anything missing or no longer valid. */
export function storedOptions(stored: unknown): ChartOptions {
  const o: Record<string, unknown> = stored && typeof stored === "object" ? { ...stored } : {};
  const valid = (key: keyof ChartOptions) => {
    const v = o[key], d = APP_DEFAULTS[key];
    const choices = CHOICES[key] as readonly unknown[] | undefined;
    if (choices) return choices.includes(v);
    return typeof v === typeof d && (typeof v !== "number" || Number.isFinite(v));
  };
  // before the setting became a checkbox, places had the values none / short / full
  if (typeof o.places === "string" && typeof o.showPlaces !== "boolean") o.showPlaces = o.places !== "none";
  const out = { ...APP_DEFAULTS };
  for (const key of Object.keys(APP_DEFAULTS) as (keyof ChartOptions)[]) {
    if (valid(key)) (out as Record<string, unknown>)[key] = o[key];
  }
  return normalize(out);
}

/** "7 generations" in the language; `all` is the text for 0 */
export function gensSummary(n: number, lang: Lang, all: string): string {
  if (!n) return all;
  const forms = TEXTS[lang].generations;
  return `${n} ${forms[{ one: 0, few: 1 }[new Intl.PluralRules(lang).select(n) as "one" | "few"] ?? 2]}`;
}
