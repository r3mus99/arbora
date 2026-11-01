import { afterEach, describe, expect, test, vi } from "vitest";
import { LANGS } from "../core/texts";
import { ORDER, STRINGS, detect, flagSvg, isLang } from "./i18n";

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

  test("only Slovak and English are offered", () => {
    expect([...LANGS].sort()).toEqual(["en", "sk"]);
  });

  test.each(LANGS)("%s has a flag", (lang) => {
    expect(flagSvg(lang)).toMatch(/^<(rect|path)/);
  });
});

describe("a language that was removed", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("a stored language of a removed translation is not accepted", () => {
    for (const code of ["cs", "pl", "hu", "de", "fr", "it", "es", "pt", "nl", "uk"]) expect(isLang(code), code).toBe(false);
    expect(isLang("sk")).toBe(true);
    expect(isLang("en")).toBe(true);
  });

  test("the browser language decides then: Slovak stays, anything else is English", () => {
    vi.stubGlobal("navigator", { languages: ["cs-CZ", "sk"], language: "cs-CZ" });
    expect(detect()).toBe("sk");
    vi.stubGlobal("navigator", { languages: ["de-DE", "fr"], language: "de-DE" });
    expect(detect()).toBe("en");
  });
});
