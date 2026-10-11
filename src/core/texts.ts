/** Texts printed in the PDF, per language. */

export interface PdfTexts {
  title: string;
  titleDesc: string;
  page: string;
  see: string;
  abbr: { birt: string; marr: string; deat: string };
  /** GEDCOM date qualifiers, {d} is the date. */
  qual: { ABT: string; BEF: string; AFT: string };
  divorced: string;
  /** {d} day, {m} month, {dd}/{mm} zero-padded, {M} month name, {y} year. */
  date: { dmy: string; my: string };
  months?: string[];
}

export type Lang = "sk" | "cs" | "pl" | "hu" | "de" | "en" | "fr" | "it" | "es" | "pt" | "nl" | "uk";

export const TEXTS: Record<Lang, PdfTexts> = {
  sk: {
    title: "Predkovia: {name}", titleDesc: "Potomkovia: {name}",
    page: "Strana {n} z {total}", see: "pozri str. {page}",
    abbr: { birt: "nar. ", marr: "sob. ", deat: "zom. " },
    qual: { ABT: "cca {d}", BEF: "pred {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{m}/{y}" },
  },
  cs: {
    title: "Předkové: {name}", titleDesc: "Potomci: {name}",
    page: "Strana {n} z {total}", see: "viz str. {page}",
    abbr: { birt: "nar. ", marr: "odd. ", deat: "zem. " },
    qual: { ABT: "asi {d}", BEF: "před {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{m}/{y}" },
  },
  pl: {
    title: "Przodkowie: {name}", titleDesc: "Potomkowie: {name}",
    page: "Strona {n} z {total}", see: "zob. s. {page}",
    abbr: { birt: "ur. ", marr: "śl. ", deat: "zm. " },
    qual: { ABT: "ok. {d}", BEF: "przed {d}", AFT: "po {d}" },
    divorced: "rozw.", date: { dmy: "{d}.{mm}.{y}", my: "{mm}.{y}" },
  },
  hu: {
    title: "{name} felmenői", titleDesc: "{name} leszármazottai",
    page: "{n}/{total}. oldal", see: "lásd {page}. old.",
    abbr: { birt: "szül. ", marr: "házas. ", deat: "megh. " },
    qual: { ABT: "kb. {d}", BEF: "{d} előtt", AFT: "{d} után" },
    divorced: "elvált", date: { dmy: "{y}.{mm}.{dd}.", my: "{y}.{mm}." },
  },
  de: {
    title: "Vorfahren von {name}", titleDesc: "Nachkommen von {name}",
    page: "Seite {n} von {total}", see: "siehe S. {page}",
    abbr: { birt: "geb. ", marr: "verh. ", deat: "gest. " },
    qual: { ABT: "um {d}", BEF: "vor {d}", AFT: "nach {d}" },
    divorced: "gesch.", date: { dmy: "{d}.{m}.{y}", my: "{m}/{y}" },
  },
  en: {
    title: "Ancestors of {name}", titleDesc: "Descendants of {name}",
    page: "Page {n} of {total}", see: "see p. {page}",
    abbr: { birt: "b. ", marr: "m. ", deat: "d. " },
    qual: { ABT: "abt {d}", BEF: "bef {d}", AFT: "aft {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  fr: {
    title: "Ascendance de {name}", titleDesc: "Descendance de {name}",
    page: "Page {n} sur {total}", see: "voir p. {page}",
    abbr: { birt: "n. ", marr: "mar. ", deat: "déc. " },
    qual: { ABT: "vers {d}", BEF: "av. {d}", AFT: "ap. {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.",
             "nov.", "déc."],
  },
  it: {
    title: "Antenati di {name}", titleDesc: "Discendenti di {name}",
    page: "Pagina {n} di {total}", see: "vedi p. {page}",
    abbr: { birt: "n. ", marr: "sp. ", deat: "m. " },
    qual: { ABT: "ca. {d}", BEF: "ante {d}", AFT: "post {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{m}/{y}" },
  },
  es: {
    title: "Antepasados de {name}", titleDesc: "Descendientes de {name}",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. " },
    qual: { ABT: "h. {d}", BEF: "antes de {d}", AFT: "después de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{m}/{y}" },
  },
  pt: {
    title: "Antepassados de {name}", titleDesc: "Descendentes de {name}",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. " },
    qual: { ABT: "cerca de {d}", BEF: "antes de {d}", AFT: "depois de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{m}/{y}" },
  },
  nl: {
    title: "Voorouders van {name}", titleDesc: "Nakomelingen van {name}",
    page: "Pagina {n} van {total}", see: "zie p. {page}",
    abbr: { birt: "geb. ", marr: "tr. ", deat: "ovl. " },
    qual: { ABT: "ca. {d}", BEF: "voor {d}", AFT: "na {d}" },
    divorced: "gesch.", date: { dmy: "{d}-{m}-{y}", my: "{m}-{y}" },
  },
  uk: {
    title: "Предки: {name}", titleDesc: "Нащадки: {name}",
    page: "Сторінка {n} з {total}", see: "див. с. {page}",
    abbr: { birt: "нар. ", marr: "шл. ", deat: "пом. " },
    qual: { ABT: "бл. {d}", BEF: "до {d}", AFT: "після {d}" },
    divorced: "розл.", date: { dmy: "{dd}.{mm}.{y}", my: "{mm}.{y}" },
  },
};

export const LANGS = Object.keys(TEXTS) as Lang[];
