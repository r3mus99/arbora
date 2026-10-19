/**
 * The lists in the four corners of the tree poster: for each of the four main branches (the grandparents' lines) the
 * most common birth places, residences, given names and surnames of the people on that branch, each as one line
 * ("Born in  Vienna ×7 · Prague ×5 · + 3 more"). The layout lives in `buildPoster`; this file only decides what is
 * said and how much of it fits a width.
 */

import type { Person } from "./gedcom";
import type { ChartOptions } from "./format";
import { TEXTS } from "./texts";

/** The branches in the order of the corners: top left, bottom left, top right, bottom right. */
export const CORNER_KEYS = ["fatherFather", "fatherMother", "motherFather", "motherMother"] as const;
export type CornerKey = (typeof CORNER_KEYS)[number];

export const CORNER_HEAD_SIZE = 34, CORNER_LABEL_SIZE = 20, CORNER_VALUE_SIZE = 24;
/** the baseline of the heading and of the first line under the top of a block, and the distance between lines */
export const CORNER_HEAD_Y = 36, CORNER_FIRST_Y = 84, CORNER_STEP = 40;
/** height of a block with this many lines */
export const cornerHeight = (rows: number) => CORNER_FIRST_Y + (rows - 1) * CORNER_STEP + 14;

export interface CornerRow { label: string; value: string }
export interface Corner { key: CornerKey; heading: string; rows: CornerRow[] }

type Count = [value: string, count: number];
type Measure = (text: string, size: number, bold: boolean) => number;

/** Values with the number of people that have them, most common first, ties in alphabetical order. */
function tally(people: Person[], pick: (p: Person) => string | undefined): Count[] {
  const counts = new Map<string, number>();
  for (const p of people) {
    const v = pick(p)?.trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** The first given name; a name without a given/surname split counts by its first word. */
const firstName = (p: Person) => (p.given || p.name).split(/[\s,]+/)[0];
/** What follows the given name in the name; empty when the file does not separate the surname. */
const surnameOf = (p: Person) => p.given && p.name.startsWith(p.given) ? p.name.slice(p.given.length).trim() : "";

/**
 * One block per branch that has people and something to say. Each line shows as many values as fit in `maxWidth`;
 * the rest is counted ("+ 3 more").
 */
export function cornerBlocks(branches: Record<CornerKey, Person[]>, o: ChartOptions, measure: Measure,
                             maxWidth: (key: CornerKey) => number): Corner[] {
  const t = TEXTS[o.lang].corners, plural = new Intl.PluralRules(o.lang);
  const more = (n: number) => `+ ${n} ${t.more[{ one: 0, few: 1 }[plural.select(n) as "one" | "few"] ?? 2]}`;
  const sep = "  ·  ";
  const fit = (label: string, items: Count[], width: number) => {
    const shown = (n: number) => items.slice(0, n).map(([v, c]) => (c > 1 ? `${v} ×${c}` : v)).join(sep)
      + (n < items.length ? sep + more(items.length - n) : "");
    let n = items.length;
    while (n > 1 && measure(label, CORNER_LABEL_SIZE, true) + measure("  " + shown(n), CORNER_VALUE_SIZE, false) > width) n--;
    return shown(n);
  };
  return CORNER_KEYS.flatMap((key, i): Corner[] => {
    const people = branches[key];
    if (!people.length) return [];
    const lines: [string, Count[]][] = [
      [t.born, tally(people, (p) => p.birth?.place)],
      ...(o.showResidence ? [[t.lived, tally(people, (p) => p.residence?.place)] as [string, Count[]]] : []),
      [t.names, tally(people, firstName)],
      [t.surnames, tally(people, surnameOf)],
    ];
    const rows = lines.filter(([, items]) => items.length).map(([label, items]) => ({ label, value: fit(label, items, maxWidth(key)) }));
    return rows.length ? [{ key, heading: t.lines[i], rows }] : [];
  });
}
