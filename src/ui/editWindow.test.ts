import { describe, expect, test, vi } from "vitest";
import { LANGS } from "../core/texts";
import { EDIT_SECTIONS, editWidthOf, mayClose, otherWidth } from "./editWindow";
import { STRINGS } from "./i18n";

describe("wide edit window", () => {
  test("the width toggles between half and full", () => {
    expect(otherWidth("half")).toBe("full");
    expect(otherWidth("full")).toBe("half");
  });

  test("a stored width that is not known means half", () => {
    expect(editWidthOf("full")).toBe("full");
    for (const v of ["half", "wide", 50, null, undefined]) expect(editWidthOf(v)).toBe("half");
  });

  test("closing asks only when something was changed", () => {
    const ask = vi.fn(() => false);
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
