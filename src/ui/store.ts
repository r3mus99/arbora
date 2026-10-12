/* Settings kept in localStorage: language, options and the last chosen person (never the file). */
import type { ChartOptions, Lang } from "../core";

const STORE_KEY = "arbora-options";
// before the app was renamed
const OLD_KEY = "rodostrom-options";

export interface Stored {
  lang?: Lang;
  options?: Partial<ChartOptions>;
  root?: string;
  /** bulk fix: groups of spellings marked "not the same" (VariantGroup keys) */
  hiddenVariants?: string[];
  /** bulk fix: keep an unified surname's old spelling as a name with TYPE aka (default yes) */
  keepAka?: boolean;
}

export function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || localStorage.getItem(OLD_KEY) || "null") || {};
  } catch { return {}; }
}

export function updateStore(patch: Stored) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch })); } catch { /* ignore */ }
}
