import { describe, expect, test, vi } from "vitest";
import { LANGS } from "../core/texts";
import { EDIT_SECTIONS, mayClose } from "./editWindow";
import { STRINGS } from "./i18n";

describe("edit window", () => {
  test("closing asks only when something was changed", () => {
    const ask = vi.fn<() => boolean>(() => false);
    expect(mayClose(false, ask)).toBe(true);
    expect(ask).not.toHaveBeenCalled();
    expect(mayClose(true, ask)).toBe(false);
    expect(ask).toHaveBeenCalledOnce();
    expect(mayClose(true, () => true)).toBe(true);
  });

  test("every section has a title in every language", () => {
    const keys = { name: "esName", basic: "esBasic", events: "esEvents", notes: "esNotes", families: "esFamilies", parents: "esParents", other: "esOther" } as const;
    expect(Object.keys(keys).sort()).toEqual([...EDIT_SECTIONS].sort());
    for (const lang of LANGS) for (const key of Object.values(keys)) expect(STRINGS[lang][key], `${lang} ${key}`).toBeTruthy();
  });
});
