/** Texts printed in the PDF, per language. */

export interface PdfTexts {
  title: string;
  titleDesc: string;
  /** the nouns after the numbers of ancestors and generations under the poster title: one, few, many (Intl.PluralRules: one, few, other) */
  ancestors: [one: string, few: string, many: string];
  generations: [one: string, few: string, many: string];
  /** the lists in the corners of the poster: the labels of the lines, and the word after "+ 3" for what did not fit (one, few, many) */
  corners: { line: string; origin: string; given: string; surnames: string; more: [one: string, few: string, many: string] };
  /** years of age after the death year on the poster, e.g. "79 y." */
  ageAbbr: string;
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

export type Lang = "sk" | "cs" | "pl" | "hu" | "de" | "en" | "fr" | "it" | "es" | "pt" | "nl" | "uk";

export const TEXTS: Record<Lang, PdfTexts> = {
  sk: {
    title: "Predkovia: {name}", titleDesc: "Potomkovia: {name}",
    ancestors: ["predok", "predkovia", "predkov"], generations: ["generácia", "generácie", "generácií"],
    corners: { line: "Línia", origin: "Pôvod", given: "Krstné mená", surnames: "Priezviská", more: ["ďalšie", "ďalšie", "ďalších"] },
    ageAbbr: "r.",
    generation: "{n}. generácia",
    known: "{a} z {b}",
    page: "Strana {n} z {total}", see: "pozri str. {page}",
    abbr: { birt: "nar. ", marr: "sob. ", deat: "zom. ", resi: "bydl. " },
    qual: { ABT: "cca {d}", BEF: "pred {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Jan.", "Feb.", "Mar.", "Apr.", "Máj", "Jún", "Júl", "Aug.", "Sep.", "Okt.", "Nov.", "Dec."],
  },
  cs: {
    title: "Předkové: {name}", titleDesc: "Potomci: {name}",
    ancestors: ["předek", "předci", "předků"], generations: ["generace", "generace", "generací"],
    corners: { line: "Linie", origin: "Původ", given: "Křestní jména", surnames: "Příjmení", more: ["další", "další", "dalších"] },
    ageAbbr: "l.",
    generation: "{n}. generace",
    known: "{a} z {b}",
    page: "Strana {n} z {total}", see: "viz str. {page}",
    abbr: { birt: "nar. ", marr: "odd. ", deat: "zem. ", resi: "bydl. " },
    qual: { ABT: "asi {d}", BEF: "před {d}", AFT: "po {d}" },
    divorced: "rozv.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Led.", "Úno.", "Bře.", "Dub.", "Kvě.", "Čvn.", "Čvc.", "Srp.", "Zář.", "Říj.", "Lis.", "Pro."],
  },
  pl: {
    title: "Przodkowie: {name}", titleDesc: "Potomkowie: {name}",
    ancestors: ["przodek", "przodkowie", "przodków"], generations: ["pokolenie", "pokolenia", "pokoleń"],
    corners: { line: "Linia", origin: "Pochodzenie", given: "Imiona", surnames: "Nazwiska", more: ["inne", "inne", "innych"] },
    ageAbbr: "l.",
    generation: "{n}. pokolenie",
    known: "{a} z {b}",
    page: "Strona {n} z {total}", see: "zob. s. {page}",
    abbr: { birt: "ur. ", marr: "śl. ", deat: "zm. ", resi: "zam. " },
    qual: { ABT: "ok. {d}", BEF: "przed {d}", AFT: "po {d}" },
    divorced: "rozw.", date: { dmy: "{d}.{mm}.{y}", my: "{M} {y}" },
    months: ["sty.", "lut.", "mar.", "kwi.", "maj", "cze.", "lip.", "sie.", "wrz.", "paź.", "lis.", "gru."],
  },
  hu: {
    title: "{name} felmenői", titleDesc: "{name} leszármazottai",
    ancestors: ["felmenő", "felmenő", "felmenő"], generations: ["nemzedék", "nemzedék", "nemzedék"],
    corners: { line: "Ág", origin: "Származás", given: "Keresztnevek", surnames: "Vezetéknevek", more: ["további", "további", "további"] },
    ageAbbr: "é.",
    generation: "{n}. nemzedék",
    known: "{a} / {b}",
    page: "{n}/{total}. oldal", see: "lásd {page}. old.",
    abbr: { birt: "szül. ", marr: "házas. ", deat: "megh. ", resi: "lakh. " },
    qual: { ABT: "kb. {d}", BEF: "{d} előtt", AFT: "{d} után" },
    divorced: "elvált", date: { dmy: "{y}.{mm}.{dd}.", my: "{y}. {M}" },
    months: ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."],
  },
  de: {
    title: "Vorfahren von {name}", titleDesc: "Nachkommen von {name}",
    ancestors: ["Vorfahre", "Vorfahren", "Vorfahren"], generations: ["Generation", "Generationen", "Generationen"],
    corners: { line: "Linie", origin: "Herkunft", given: "Vornamen", surnames: "Familiennamen", more: ["weitere", "weitere", "weitere"] },
    ageAbbr: "J.",
    generation: "{n}. Generation",
    known: "{a} von {b}",
    page: "Seite {n} von {total}", see: "siehe S. {page}",
    abbr: { birt: "geb. ", marr: "verh. ", deat: "gest. ", resi: "wohnh. " },
    qual: { ABT: "um {d}", BEF: "vor {d}", AFT: "nach {d}" },
    divorced: "gesch.", date: { dmy: "{d}.{m}.{y}", my: "{M} {y}" },
    months: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
  },
  en: {
    title: "Ancestors of {name}", titleDesc: "Descendants of {name}",
    ancestors: ["ancestor", "ancestors", "ancestors"], generations: ["generation", "generations", "generations"],
    corners: { line: "Line", origin: "Origin", given: "First names", surnames: "Surnames", more: ["more", "more", "more"] },
    ageAbbr: "y.",
    generation: "Generation {n}",
    known: "{a} of {b}",
    page: "Page {n} of {total}", see: "see p. {page}",
    abbr: { birt: "b. ", marr: "m. ", deat: "d. ", resi: "res. " },
    qual: { ABT: "abt {d}", BEF: "bef {d}", AFT: "aft {d}" },
    divorced: "div.", date: { dmy: "{d} {M} {y}", my: "{M} {y}" },
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  fr: {
    title: "Ascendance de {name}", titleDesc: "Descendance de {name}",
    ancestors: ["ancêtre", "ancêtres", "ancêtres"], generations: ["génération", "générations", "générations"],
    corners: { line: "Lignée", origin: "Origine", given: "Prénoms", surnames: "Noms de famille", more: ["autre", "autres", "autres"] },
    ageAbbr: "a.",
    generation: "Génération {n}",
    known: "{a} sur {b}",
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
    corners: { line: "Linea", origin: "Origine", given: "Nomi", surnames: "Cognomi", more: ["altro", "altri", "altri"] },
    ageAbbr: "a.",
    generation: "{n}ª generazione",
    known: "{a} su {b}",
    page: "Pagina {n} di {total}", see: "vedi p. {page}",
    abbr: { birt: "n. ", marr: "sp. ", deat: "m. ", resi: "res. " },
    qual: { ABT: "ca. {d}", BEF: "ante {d}", AFT: "post {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["gen.", "feb.", "mar.", "apr.", "mag.", "giu.", "lug.", "ago.", "set.", "ott.", "nov.", "dic."],
  },
  es: {
    title: "Antepasados de {name}", titleDesc: "Descendientes de {name}",
    ancestors: ["antepasado", "antepasados", "antepasados"], generations: ["generación", "generaciones", "generaciones"],
    corners: { line: "Línea", origin: "Origen", given: "Nombres", surnames: "Apellidos", more: ["más", "más", "más"] },
    ageAbbr: "a.",
    generation: "Generación {n}",
    known: "{a} de {b}",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. ", resi: "res. " },
    qual: { ABT: "h. {d}", BEF: "antes de {d}", AFT: "después de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
  },
  pt: {
    title: "Antepassados de {name}", titleDesc: "Descendentes de {name}",
    ancestors: ["antepassado", "antepassados", "antepassados"], generations: ["geração", "gerações", "gerações"],
    corners: { line: "Linha", origin: "Origem", given: "Nomes próprios", surnames: "Apelidos", more: ["mais", "mais", "mais"] },
    ageAbbr: "a.",
    generation: "Geração {n}",
    known: "{a} de {b}",
    page: "Página {n} de {total}", see: "ver p. {page}",
    abbr: { birt: "n. ", marr: "c. ", deat: "f. ", resi: "res. " },
    qual: { ABT: "cerca de {d}", BEF: "antes de {d}", AFT: "depois de {d}" },
    divorced: "div.", date: { dmy: "{d}/{m}/{y}", my: "{M} {y}" },
    months: ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."],
  },
  nl: {
    title: "Voorouders van {name}", titleDesc: "Nakomelingen van {name}",
    ancestors: ["voorouder", "voorouders", "voorouders"], generations: ["generatie", "generaties", "generaties"],
    corners: { line: "Lijn", origin: "Herkomst", given: "Voornamen", surnames: "Achternamen", more: ["meer", "meer", "meer"] },
    ageAbbr: "j.",
    generation: "Generatie {n}",
    known: "{a} van {b}",
    page: "Pagina {n} van {total}", see: "zie p. {page}",
    abbr: { birt: "geb. ", marr: "tr. ", deat: "ovl. ", resi: "won. " },
    qual: { ABT: "ca. {d}", BEF: "voor {d}", AFT: "na {d}" },
    divorced: "gesch.", date: { dmy: "{d}-{m}-{y}", my: "{M} {y}" },
    months: ["jan.", "feb.", "mrt.", "apr.", "mei", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."],
  },
  uk: {
    title: "Предки: {name}", titleDesc: "Нащадки: {name}",
    ancestors: ["предок", "предки", "предків"], generations: ["покоління", "покоління", "поколінь"],
    corners: { line: "Лінія", origin: "Походження", given: "Імена", surnames: "Прізвища", more: ["ще", "ще", "ще"] },
    ageAbbr: "р.",
    generation: "{n}-те покоління",
    known: "{a} з {b}",
    page: "Сторінка {n} з {total}", see: "див. с. {page}",
    abbr: { birt: "нар. ", marr: "шл. ", deat: "пом. ", resi: "про. " },
    qual: { ABT: "бл. {d}", BEF: "до {d}", AFT: "після {d}" },
    divorced: "розл.", date: { dmy: "{dd}.{mm}.{y}", my: "{M} {y}" },
    months: ["січ.", "лют.", "бер.", "квіт.", "трав.", "черв.", "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."],
  },
};

export const LANGS = Object.keys(TEXTS) as Lang[];
