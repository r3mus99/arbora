/** Texts printed in the PDF, per language. */

export interface PdfTexts {
  title: string;
  titleDesc: string;
  /** the nouns after the numbers of ancestors and generations under the poster title: one, few, many (Intl.PluralRules: one, few, other) */
  ancestors: [one: string, few: string, many: string];
  generations: [one: string, few: string, many: string];
  /** the lists in the corners of the poster: the word after "+ 3" for what did not fit (one, few, many) */
  corners: { more: [one: string, few: string, many: string] };
  /** years of age after the death year on the poster, e.g. "79 y." */
  ageAbbr: string;
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

export type Lang = "sk" | "cs" | "pl" | "hu" | "de" | "en" | "fr" | "it" | "es" | "pt" | "nl" | "uk";

export const TEXTS: Record<Lang, PdfTexts> = {
  sk: {
    title: "Predkovia: {name}", titleDesc: "Potomkovia: {name}",
    ancestors: ["predok", "predkovia", "predkov"], generations: ["generácia", "generácie", "generácií"],
    corners: { more: ["ďalšie", "ďalšie", "ďalších"] },
    ageAbbr: "r.",
    page: "Strana {n} z {total}", see: "pozri str. {page}",
    abbr: { birt: "nar. ", marr: "sob. ", deat: "zom. ", resi: "bydl. " },
    qual: { ABT: "cca {d}", BEF: "pred {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Jan.", "Feb.", "Mar.", "Apr.", "Máj", "Jún", "Júl", "Aug.", "Sep.", "Okt.", "Nov.", "Dec."],
  },
  cs: {
    title: "Předkové: {name}", titleDesc: "Potomci: {name}",
    ancestors: ["předek", "předci", "předků"], generations: ["generace", "generace", "generací"],
    corners: { more: ["další", "další", "dalších"] },
    ageAbbr: "l.",
    page: "Strana {n} z {total}", see: "viz str. {page}",
    abbr: { birt: "nar. ", marr: "odd. ", deat: "zem. ", resi: "bydl. " },
    qual: { ABT: "asi {d}", BEF: "před {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Led.", "Úno.", "Bře.", "Dub.", "Kvě.", "Čvn.", "Čvc.", "Srp.", "Zář.", "Říj.", "Lis.", "Pro."],
  },
  pl: {
    title: "Przodkowie: {name}", titleDesc: "Potomkowie: {name}",
    ancestors: ["przodek", "przodkowie", "przodków"], generations: ["pokolenie", "pokolenia", "pokoleń"],
    corners: { more: ["inne", "inne", "innych"] },
    ageAbbr: "l.",
    page: "Strona {n} z {total}", see: "zob. s. {page}",
    abbr: { birt: "ur. ", marr: "śl. ", deat: "zm. ", resi: "zam. " },
    qual: { ABT: "ok. {d}", BEF: "przed {d}", AFT: "po {d}" },
    divorced: "rozw.", date: { dmy: "{d}.{mm}.{y}", my: "{M} {y}" },
    months: ["sty.", "lut.", "mar.", "kwi.", "maj", "cze.", "lip.", "sie.", "wrz.", "paź.", "lis.", "gru."],
  },
  hu: {
    title: "{name} felmenői", titleDesc: "{name} leszármazottai",
    ancestors: ["felmenő", "felmenő", "felmenő"], generations: ["nemzedék", "nemzedék", "nemzedék"],
    corners: { more: ["további", "további", "további"] },
    ageAbbr: "é.",
    page: "{n}/{total}. oldal", see: "lásd {page}. old.",
    abbr: { birt: "szül. ", marr: "házas. ", deat: "megh. ", resi: "lakh. " },
    qual: { ABT: "kb. {d}", BEF: "{d} előtt", AFT: "{d} után" },
    divorced: "elvált", date: { dmy: "{y}.{mm}.{dd}.", my: "{y}. {M}" },
    months: ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."],
  },
  de: {
    title: "Vorfahren von {name}", titleDesc: "Nachkommen von {name}",
    ancestors: ["Vorfahre", "Vorfahren", "Vorfahren"], generations: ["Generation", "Generationen", "Generationen"],
    corners: { more: ["weitere", "weitere", "weitere"] },
    ageAbbr: "J.",
    page: "Seite {n} von {total}", see: "siehe S. {page}",
    abbr: { birt: "geb. ", marr: "verh. ", deat: "gest. ", resi: "wohnh. " },
    qual: { ABT: "um {d}", BEF: "vor {d}", AFT: "nach {d}" },
    divorced: "gesch.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
  },
  en: {
    title: "Ancestors of {name}", titleDesc: "Descendants of {name}",
    ancestors: ["ancestor", "ancestors", "ancestors"], generations: ["generation", "generations", "generations"],
    corners: { more: ["more", "more", "more"] },
    ageAbbr: "y.",
    page: "Page {n} of {total}", see: "see p. {page}",
    abbr: { birt: "b. ", marr: "m. ", deat: "d. ", resi: "res. " },
    qual: { ABT: "abt {d}", BEF: "bef {d}", AFT: "aft {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  fr: {
    title: "Ascendance de {name}", titleDesc: "Descendance de {name}",
    ancestors: ["ancêtre", "ancêtres", "ancêtres"], generations: ["génération", "générations", "générations"],
    corners: { more: ["autre", "autres", "autres"] },
    ageAbbr: "a.",
    page: "Page {n} sur {total}", see: "voir p. {page}",
    abbr: { birt: "n. ", marr: "mar. ", deat: "déc. ", resi: "rés. " },
    qual: { ABT: "vers {d}", BEF: "av. {d}", AFT: "ap. {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.",
             "nov.", "déc."],
  },
  it: {
    title: "Antenati di {name}", titleDesc: "Discendenti di {name}",
    ancestors: ["antenato", "antenati", "antenati"], generations: ["generazione", "generazioni", "generazioni"],
    corners: { more: ["altro", "altri", "altri"] },
    ageAbbr: "a.",
    page: "Pagina {n} di {total}", see: "vedi p. {page}",
    abbr: { birt: "n. ", marr: "sp. ", deat: "m. ", resi: "res. " },
    qual: { ABT: "ca. {d}", BEF: "ante {d}", AFT: "post {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["gen.", "feb.", "mar.", "apr.", "mag.", "giu.", "lug.", "ago.", "set.", "ott.", "nov.", "dic."],
  },
  es: {
    title: "Antepasados de {name}", titleDesc: "Descendientes de {name}",
    ancestors: ["antepasado", "antepasados", "antepasados"], generations: ["generación", "generaciones", "generaciones"],
    corners: { more: ["más", "más", "más"] },
    ageAbbr: "a.",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. ", resi: "res. " },
    qual: { ABT: "h. {d}", BEF: "antes de {d}", AFT: "después de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
  },
  pt: {
    title: "Antepassados de {name}", titleDesc: "Descendentes de {name}",
    ancestors: ["antepassado", "antepassados", "antepassados"], generations: ["geração", "gerações", "gerações"],
    corners: { more: ["mais", "mais", "mais"] },
    ageAbbr: "a.",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. ", resi: "res. " },
    qual: { ABT: "cerca de {d}", BEF: "antes de {d}", AFT: "depois de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."],
  },
  nl: {
    title: "Voorouders van {name}", titleDesc: "Nakomelingen van {name}",
    ancestors: ["voorouder", "voorouders", "voorouders"], generations: ["generatie", "generaties", "generaties"],
    corners: { more: ["meer", "meer", "meer"] },
    ageAbbr: "j.",
    page: "Pagina {n} van {total}", see: "zie p. {page}",
    abbr: { birt: "geb. ", marr: "tr. ", deat: "ovl. ", resi: "won. " },
    qual: { ABT: "ca. {d}", BEF: "voor {d}", AFT: "na {d}" },
    divorced: "gesch.", date: { dmy: "{d}-{m}-{y}", my: "{M} {y}" },
    months: ["jan.", "feb.", "mrt.", "apr.", "mei", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."],
  },
  uk: {
    title: "Предки: {name}", titleDesc: "Нащадки: {name}",
    ancestors: ["предок", "предки", "предків"], generations: ["покоління", "покоління", "поколінь"],
    corners: { more: ["ще", "ще", "ще"] },
    ageAbbr: "р.",
    page: "Сторінка {n} з {total}", see: "див. с. {page}",
    abbr: { birt: "нар. ", marr: "шл. ", deat: "пом. ", resi: "про. " },
    qual: { ABT: "бл. {d}", BEF: "до {d}", AFT: "після {d}" },
    divorced: "розл.", date: { dmy: "{dd}.{mm}.{y}", my: "{M} {y}" },
    months: ["січ.", "лют.", "бер.", "квіт.", "трав.", "черв.", "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."],
  },
};

export const LANGS = Object.keys(TEXTS) as Lang[];
