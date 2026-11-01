/**
 * Whether a surname has the ending that fits the person's sex, for languages where the two differ
 * (Slovak and Czech Kováč / Kováčová and Nový / Nová, Polish Kowalski / Kowalska). Each language is
 * one rule in `RULES`; a rule applies to a file only when the file shows the habit (see `evidence`),
 * so a file in another language, or with another habit, gets no false alarms.
 */

interface Rule {
  /** a woman's surname in this language; the file needs `MIN_EVIDENCE` of them for the rule to apply */
  evidence: RegExp;
  /** `surname` is wrong for a woman: the forms she would have, best guess first, or null when it is fine or unknown */
  forWoman(surname: string): { wrong: boolean; fixes: string[] };
  /** `surname` is wrong for a man: the forms he would have */
  forMan(surname: string): { wrong: boolean; fixes: string[] };
}

/** how many women with a typical surname a file needs before its rule is applied */
const MIN_EVIDENCE = 3;

const NONE = { wrong: false, fixes: [] as string[] };
const VOWEL_END = /[aeiouyáäéíóôúýěůöüő]$/i;

/** Slovak and Czech: the woman's surname is -ová (Kováč → Kováčová) or -á (Nový → Nová). */
const slovakCzech: Rule = {
  evidence: /ová$/i,
  forWoman(s) {
    if (/(ová|á)$/i.test(s) || VOWEL_END.test(s) && !s.toLowerCase().endsWith("ý")) return NONE;
    if (s.toLowerCase().endsWith("ý")) return { wrong: true, fixes: [s.replace(/ý$/i, "á")] };
    // Hudec → Hudcová, Dudek → Dudková, Kováč → Kováčová
    return { wrong: true, fixes: [s + "ová", s.replace(/e([ck])$/i, "$1ová"), s.replace(/e([lň])$/i, "$1ová")] };
  },
  forMan(s) {
    if (!/ová$/i.test(s)) return NONE;
    return { wrong: true, fixes: [s.slice(0, -3), s.replace(/(.)ová$/i, "e$1")] };
  },
};

/** Polish: -ski / -cki / -dzki for a man, -ska / -cka / -dzka for a woman. */
const polish: Rule = {
  evidence: /(sk|ck|dzk)a$/i,
  forWoman(s) {
    return /(sk|ck|dzk)i$/i.test(s) ? { wrong: true, fixes: [s.replace(/i$/i, (m) => (m === "I" ? "A" : "a"))] } : NONE;
  },
  forMan(s) {
    return /(sk|ck|dzk)a$/i.test(s) ? { wrong: true, fixes: [s.replace(/a$/i, (m) => (m === "A" ? "I" : "i"))] } : NONE;
  },
};

const RULES: Rule[] = [slovakCzech, polish];

export interface SurnameVerdict {
  /** the surname does not fit the sex */
  wrong: boolean;
  /** the right form, only when the file itself has it (so it is no guess), else "" */
  fix: string;
}

/**
 * A judge for the people of one file. `people` are the main surnames with the sex (`M`/`F`) of each person;
 * the judge answers null where the surname is fine or cannot be told (unknown sex, several words, endings that
 * stay the same for both sexes, a language the file does not show).
 */
export function surnameJudge(people: { surname: string; sex: string }[]): (surname: string, sex: string) => SurnameVerdict | null {
  const active = RULES.filter((r) => people.filter((p) => p.sex === "F" && r.evidence.test(p.surname)).length >= MIN_EVIDENCE);
  const known = new Map<string, string>();
  for (const p of people) if (p.surname && !known.has(p.surname.toLowerCase())) known.set(p.surname.toLowerCase(), p.surname);
  return (surname, sex) => {
    if ((sex !== "M" && sex !== "F") || !surname || /[\s-]/.test(surname)) return null;
    for (const rule of active) {
      const v = sex === "F" ? rule.forWoman(surname) : rule.forMan(surname);
      if (!v.wrong) continue;
      // a fix is offered only when the file has the form already, spelled that way
      const fix = v.fixes.map((f) => known.get(f.toLowerCase())).find((f) => f && f !== surname) || "";
      // a woman with a plain consonant surname is flagged only when her form is there; the rest could be a foreign name
      if (sex === "F" && !fix && !surname.toLowerCase().endsWith("ý") && !/(sk|ck|dzk)i$/i.test(surname)) continue;
      return { wrong: true, fix: fix || (sex === "F" && /ý$|(sk|ck|dzk)i$/i.test(surname) ? v.fixes[0] : "") };
    }
    return null;
  };
}
