import { describe, expect, test } from "vitest";
import { LANGS } from "../core/texts";
import { ORDER, STRINGS, flagSvg } from "./i18n";

/** placeholders such as {n} in a text, sorted */
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("page texts", () => {
  const keys = Object.keys(STRINGS.sk) as (keyof typeof STRINGS.sk)[];

  test("every language of the PDF is offered, each once", () => {
    expect([...ORDER].sort()).toEqual([...LANGS].sort());
  });

  // a missing text would quietly show in English, so the type alone does not catch it
  test.each(LANGS)("%s has every text, with the same placeholders", (lang) => {
    const texts = STRINGS[lang];
    expect(Object.keys(texts).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(texts[key], key).toBeTruthy();
      expect(vars(texts[key]!), key).toEqual(vars(STRINGS.sk[key]!));
    }
  });

  test.each(LANGS)("%s has a flag", (lang) => {
    expect(flagSvg(lang)).toMatch(/^<(rect|path)/);
  });
});
