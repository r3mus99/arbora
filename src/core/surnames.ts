/** Gendered surnames: Slovak and Czech add -ová to a man's surname and change -ý to -á.
 *  Used to offer a woman only female forms and a man only male forms while typing. */
import type { Lang } from "./texts";

type Form = "m" | "f" | "n"; // male form, female form, same for both

const VOWELS = /[aeiouyáäéíóôúýěů]$/i;

/** Slovak and Czech rules apply for the Slovak UI, or when the file itself has -ová surnames. */
function rules(lang: Lang | undefined, surnames: string[]): { sk: boolean } {
  return { sk: lang === "sk" || surnames.some((s) => /ová$/i.test(s)) };
}

function formOf(s: string): Form {
  if (/(ová|á)$/i.test(s)) return "f";
  if (s.toLowerCase().endsWith("ý") || !VOWELS.test(s)) return "m";
  return "n";
}

const swap = (s: string, from: RegExp, to: string) => {
  const upper = s === s.toUpperCase() && s !== s.toLowerCase();
  return s.replace(from, upper ? to.toUpperCase() : to);
};

function toFemale(s: string): string {
  if (s.toLowerCase().endsWith("ý")) return swap(s, /ý$/i, "á");
  return swap(s, /$/, "ová");
}

function toMale(s: string): string {
  if (/ová$/i.test(s)) return s.slice(0, -3);
  return swap(s, /á$/i, "ý");
}

/** The surnames to offer for a person of this sex (`M`/`F`): surnames in the file with the matching form first
 *  (and those that are the same for both), then the matching form made from the other-sex ones (Vozar → Vozarová).
 *  Without a known sex, or where surnames are not gendered, the list stays as it is. */
export function surnamesFor(surnames: string[], sex: string, lang?: Lang): string[] {
  const want: Form | null = sex === "M" ? "m" : sex === "F" ? "f" : null;
  const r = rules(lang, surnames);
  if (!want || !r.sk) return surnames;
  const own: string[] = [], made: string[] = [];
  for (const s of surnames) {
    const form = formOf(s);
    if (form === "n" || form === want) own.push(s);
    else made.push(want === "f" ? toFemale(s) : toMale(s));
  }
  const have = new Set(own);
  const sort = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b));
  return [...sort(own), ...sort(made.filter((s) => !have.has(s)))];
}

/** A surname in the form that fits `sex` (`M`/`F`): Novák → Nováková for a girl, Nováková → Novák for a boy.
 *  A surname that is the same for both sexes, an unknown sex or a language without gendered surnames leaves it as it is. */
export function surnameForSex(surname: string, sex: string, surnames: string[], lang?: Lang): string {
  const want: Form | null = sex === "M" ? "m" : sex === "F" ? "f" : null;
  const r = rules(lang, surnames);
  if (!want || !surname || !r.sk) return surname;
  const form = formOf(surname);
  if (form === "n" || form === want) return surname;
  return want === "f" ? toFemale(surname) : toMale(surname);
}
