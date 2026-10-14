/** Gendered surnames: Slovak and Czech add -ová to a man's surname and change -ý to -á, Polish changes -ski to -ska.
 *  Used to offer a woman only female forms and a man only male forms while typing. */
import type { Lang } from "./texts";

type Form = "m" | "f" | "n"; // male form, female form, same for both

const VOWELS = /[aeiouyáäéíóôúýěů]$/i;

/** Slovak and Czech rules apply for those UI languages, or when the file itself has -ová surnames. */
function rules(lang: Lang | undefined, surnames: string[]): { sk: boolean; pl: boolean } {
  return {
    sk: lang === "sk" || lang === "cs" || surnames.some((s) => /ová$/i.test(s)),
    pl: lang === "pl",
  };
}

function formOf(s: string, r: { sk: boolean; pl: boolean }): Form {
  if (r.sk) {
    if (/(ová|á)$/i.test(s)) return "f";
    if (/ý$/i.test(s) || !VOWELS.test(s)) return "m";
    return "n";
  }
  if (r.pl) {
    if (/(sk|ck|dzk)a$/i.test(s)) return "f";
    if (/(sk|ck|dzk)i$/i.test(s)) return "m";
  }
  return "n";
}

const swap = (s: string, from: RegExp, to: string) => {
  const upper = s === s.toUpperCase() && s !== s.toLowerCase();
  return s.replace(from, upper ? to.toUpperCase() : to);
};

function toFemale(s: string, r: { sk: boolean; pl: boolean }): string {
  if (r.sk) {
    if (/ý$/i.test(s)) return swap(s, /ý$/i, "á");
    return swap(s, /$/, "ová");
  }
  return swap(s, /i$/i, "a");
}

function toMale(s: string, r: { sk: boolean; pl: boolean }): string {
  if (r.sk) {
    if (/ová$/i.test(s)) return s.slice(0, -3);
    return swap(s, /á$/i, "ý");
  }
  return swap(s, /a$/i, "i");
}

/** The surnames to offer for a person of this sex (`M`/`F`): surnames in the file with the matching form first
 *  (and those that are the same for both), then the matching form made from the other-sex ones (Vozar → Vozarová).
 *  Without a known sex, or where surnames are not gendered, the list stays as it is. */
export function surnamesFor(surnames: string[], sex: string, lang?: Lang): string[] {
  const want: Form | null = sex === "M" ? "m" : sex === "F" ? "f" : null;
  const r = rules(lang, surnames);
  if (!want || (!r.sk && !r.pl)) return surnames;
  const own: string[] = [], made: string[] = [];
  for (const s of surnames) {
    const form = formOf(s, r);
    if (form === "n" || form === want) own.push(s);
    else made.push(want === "f" ? toFemale(s, r) : toMale(s, r));
  }
  const have = new Set(own);
  const sort = (a: string[]) => [...new Set(a)].sort((a, b) => a.localeCompare(b));
  return [...sort(own), ...sort(made.filter((s) => !have.has(s)))];
}
