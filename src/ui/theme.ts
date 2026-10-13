/* Light or dark theme: follows the system until the user chooses; the choice is kept in localStorage. */
import { readStore, updateStore } from "./store";

export type Theme = "light" | "dark";

export const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

/** the theme of the system (prefers-color-scheme) */
export const systemTheme = (): Theme =>
  typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

/** the theme the user chose, if any */
export const chosenTheme = (): Theme | undefined => {
  const t = readStore().theme;
  return isTheme(t) ? t : undefined;
};

/** Sets data-theme (the styles.css tokens); without a choice the attribute is removed and the system decides. */
export function applyTheme(theme: Theme | undefined) {
  const root = document.documentElement;
  if (theme) root.dataset.theme = theme; else delete root.dataset.theme;
}

export const saveTheme = (theme: Theme) => updateStore({ theme });
