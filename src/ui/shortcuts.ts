/** Keyboard shortcuts of the app: ⌘ on a Mac, Ctrl elsewhere. Pure functions, so the key handling can be tested. */

export type ShortcutAction = "undo" | "redo" | "find" | "save" | "settings";

type KeyEvent = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

export const isMac = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

/**
 * The key as a lower-case character. A letter typed on a non-Latin layout (Cyrillic, Greek) gives its place on the
 * keyboard instead, so ⌘Z still undoes there.
 */
function keyOf(e: KeyEvent): string {
  const letter = /^Key([A-Z])$/.exec(e.code || "");
  if (letter && !/^[a-z]$/i.test(e.key)) return letter[1].toLowerCase();
  if (e.code === "Comma") return ",";
  return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

/** The action a key press asks for, or null when it is none of ours (Alt, a mixed-up modifier or any other key). */
export function shortcutOf(e: KeyEvent, mac: boolean): ShortcutAction | null {
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod || e.altKey) return null;
  const key = keyOf(e);
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (e.shiftKey) return null;
  if (key === "y") return mac ? null : "redo";
  if (key === "f") return "find";
  if (key === "s") return "save";
  if (key === ",") return "settings";
  return null;
}

/** The shortcut as shown in a tooltip: ⌘Z on a Mac, Ctrl+Z elsewhere. */
export function shortcutLabel(action: ShortcutAction, mac: boolean): string {
  if (action === "redo" && !mac) return "Ctrl+Y";
  const key = { undo: "Z", redo: "Z", find: "F", save: "S", settings: "," }[action];
  const shift = action === "redo";
  return mac ? `${shift ? "⇧" : ""}⌘${key}` : `Ctrl+${shift ? "Shift+" : ""}${key}`;
}

/** A tooltip with its shortcut after it. */
export const withShortcut = (text: string, action: ShortcutAction, mac: boolean): string =>
  `${text} (${shortcutLabel(action, mac)})`;

/**
 * Whether an action works while the keyboard focus is in a text field. Undo and redo stay with the field, where they
 * undo typing; the others do not clash with typing.
 */
export const worksInField = (action: ShortcutAction): boolean => action !== "undo" && action !== "redo";
