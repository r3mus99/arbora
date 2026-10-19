import { describe, expect, test } from "vitest";
import { shortcutLabel, shortcutOf, withShortcut, worksInField } from "./shortcuts";

const press = (key: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}, code = "") =>
  ({ key, code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

describe("keyboard shortcuts", () => {
  test("⌘ on a Mac, Ctrl elsewhere, never the other one", () => {
    expect(shortcutOf(press("z", { metaKey: true }), true)).toBe("undo");
    expect(shortcutOf(press("z", { ctrlKey: true }), true)).toBeNull();
    expect(shortcutOf(press("z", { ctrlKey: true }), false)).toBe("undo");
    expect(shortcutOf(press("z", { metaKey: true }), false)).toBeNull();
    expect(shortcutOf(press("z", { metaKey: true, ctrlKey: true }), true)).toBeNull();
  });

  test("the five actions", () => {
    const ctrl = { ctrlKey: true };
    expect(shortcutOf(press("z", { ...ctrl, shiftKey: true }), false)).toBe("redo");
    expect(shortcutOf(press("y", ctrl), false)).toBe("redo");
    expect(shortcutOf(press("f", ctrl), false)).toBe("find");
    expect(shortcutOf(press("s", ctrl), false)).toBe("save");
    expect(shortcutOf(press(",", ctrl), false)).toBe("settings");
  });

  test("capital letters (Caps Lock) work, other keys and modifiers do not", () => {
    expect(shortcutOf(press("S", { ctrlKey: true }), false)).toBe("save");
    expect(shortcutOf(press("s", { ctrlKey: true, shiftKey: true }), false)).toBeNull();
    expect(shortcutOf(press("s", { ctrlKey: true, altKey: true }), false)).toBeNull();
    expect(shortcutOf(press("s"), false)).toBeNull();
    expect(shortcutOf(press("a", { ctrlKey: true }), false)).toBeNull();
    expect(shortcutOf(press("c", { ctrlKey: true }), false)).toBeNull();
    expect(shortcutOf(press("Enter", { ctrlKey: true }), false)).toBeNull();
    expect(shortcutOf(press("y", { metaKey: true }), true)).toBeNull();
  });

  test("a non-Latin layout falls back to the key's place", () => {
    expect(shortcutOf(press("я", { ctrlKey: true }, "KeyZ"), false)).toBe("undo");
    expect(shortcutOf(press("ы", { metaKey: true }, "KeyS"), true)).toBe("save");
    expect(shortcutOf(press("б", { ctrlKey: true }, "Comma"), false)).toBe("settings");
    // a Latin layout wins over the place: Dvorak's Z sits elsewhere
    expect(shortcutOf(press("z", { ctrlKey: true }, "Slash"), false)).toBe("undo");
  });

  test("labels", () => {
    expect(shortcutLabel("find", true)).toBe("⌘F");
    expect(shortcutLabel("redo", true)).toBe("⇧⌘Z");
    expect(shortcutLabel("redo", false)).toBe("Ctrl+Y");
    expect(shortcutLabel("settings", false)).toBe("Ctrl+,");
    expect(withShortcut("Undo", "undo", false)).toBe("Undo (Ctrl+Z)");
  });

  test("undo and redo stay with a text field", () => {
    expect(worksInField("undo")).toBe(false);
    expect(worksInField("redo")).toBe(false);
    expect(worksInField("find")).toBe(true);
  });
});
