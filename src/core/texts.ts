/** Texts printed in the PDF, per language. */

export interface PdfTexts {
  title: string;
  titleDesc: string;
  /** the nouns after the numbers of ancestors and generations under the poster title: one, few, many (Intl.PluralRules: one, few, other) */
  ancestors: [one: string, few: string, many: string];
  generations: [one: string, few: string, many: string];
  /** the noun after the number of descendants under the poster title (same forms) */
  descendants: [one: string, few: string, many: string];
  /** the lists in the corners of the poster: the labels of the lines, and the word after "+ 3" for what did not fit (one, few, many) */
  corners: { line: string; origin: string; given: string; surnames: string; more: [one: string, few: string, many: string] };
  /** the mark in the bottom right corner of the poster, followed by the version and the date */
  createdWith: string;
  /** short units of an age: years, months, days, e.g. "79 y.", "5 mo.", "12 d." */
  ageUnits: { y: string; m: string; d: string };
  /** whole words of an age (one, few, many forms), e.g. "34 years", "5 mesiacov" */
  ageWords: { y: [one: string, few: string, many: string]; m: [one: string, few: string, many: string]; d: [one: string, few: string, many: string] };
  /** the label on the generation ruler of the poster, {n} is the number */
  generation: string;
  /** under the ruler of the poster: {a} people known of {b} possible in a column */
  known: string;
  page: string;
  see: string;
  abbr: { birt: string; marr: string; deat: string; resi: string };
  /** GEDCOM date qualifiers, {d} is the date. */
  qual: { ABT: string; BEF: string; AFT: string };
  divorced: string;
  /** {d} day, {m} month, {dd}/{mm} zero-padded, {M} month name, {y} year. */
  date: { dmy: string; my: string };
  /** short month names, used when a date has a month but no day */
  months: string[];
}

export type Lang = "sk" | "en";

export const TEXTS: Record<Lang, PdfTexts> = {
  sk: {
    title: "Predkovia: {name}", titleDesc: "Potomkovia: {name}",
    ancestors: ["predok", "predkovia", "predkov"], generations: ["generácia", "generácie", "generácií"],
    descendants: ["potomok", "potomkovia", "potomkov"],
    corners: { line: "Línia", origin: "Pôvod", given: "Krstné mená", surnames: "Priezviská", more: ["ďalšie", "ďalšie", "ďalších"] },
    createdWith: "Vytvorené v programe Arbora",
    ageUnits: { y: "r.", m: "mes.", d: "d." },
    ageWords: { y: ["rok", "roky", "rokov"], m: ["mesiac", "mesiace", "mesiacov"], d: ["deň", "dni", "dní"] },
    generation: "{n}. generácia",
    known: "{a} z {b}",
    page: "Strana {n} z {total}", see: "pozri str. {page}",
    abbr: { birt: "nar. ", marr: "sob. ", deat: "zom. ", resi: "bydl. " },
    qual: { ABT: "cca {d}", BEF: "pred {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Jan.", "Feb.", "Mar.", "Apr.", "Máj", "Jún", "Júl", "Aug.", "Sep.", "Okt.", "Nov.", "Dec."],
  },
  en: {
    title: "Ancestors of {name}", titleDesc: "Descendants of {name}",
    ancestors: ["ancestor", "ancestors", "ancestors"], generations: ["generation", "generations", "generations"],
    descendants: ["descendant", "descendants", "descendants"],
    corners: { line: "Line", origin: "Origin", given: "First names", surnames: "Surnames", more: ["more", "more", "more"] },
    createdWith: "Created with Arbora",
    ageUnits: { y: "y.", m: "mo.", d: "d." },
    ageWords: { y: ["year", "years", "years"], m: ["month", "months", "months"], d: ["day", "days", "days"] },
    generation: "Generation {n}",
    known: "{a} of {b}",
    page: "Page {n} of {total}", see: "see p. {page}",
    abbr: { birt: "b. ", marr: "m. ", deat: "d. ", resi: "res. " },
    qual: { ABT: "abt {d}", BEF: "bef {d}", AFT: "aft {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

export const LANGS = Object.keys(TEXTS) as Lang[];

/** an age in whole words of the language: "1 year", "34 years", "34 rokov" */
export function formatAgeLong(age: { n: number; unit: "y" | "m" | "d" }, lang: Lang): string {
  const forms = TEXTS[lang].ageWords[age.unit];
  const kind = new Intl.PluralRules(lang).select(age.n);
  return `${age.n} ${forms[kind === "one" ? 0 : kind === "few" ? 1 : 2]}`;
}
