/**
 * The lists in the four corners of the tree poster: for each of the four main branches (the grandparents' lines) the
 * most common birth municipalities, given names and surnames of the people on that branch, each as one line
 * ("Vienna ×7  ·  Prague ×5  ·  + 3 more"). The layout lives in `buildPoster`; this file only decides what is
 * said and how much of it fits a width.
 */

import type { Person } from "./gedcom";
import { formatDate, type ChartOptions } from "./format";
import { TEXTS } from "./texts";

/** The branches in the order of the corners: top left, bottom left, top right, bottom right. */
export const CORNER_KEYS = ["fatherFather", "fatherMother", "motherFather", "motherMother"] as const;
export type CornerKey = (typeof CORNER_KEYS)[number];

export const CORNER_HEAD_SIZE = 34, CORNER_VALUE_SIZE = 24;
/** the baseline of the heading and of the first line under the top of a block, and the distance between lines */
export const CORNER_HEAD_Y = 36, CORNER_FIRST_Y = 84, CORNER_STEP = 40;
/** height of a block with this many lines */
export const cornerHeight = (rows: number) => CORNER_FIRST_Y + (rows - 1) * CORNER_STEP + 14;

export interface Corner { key: CornerKey; heading: string; rows: string[] }

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

/** The municipality of a place: what stands before the first comma. */
const municipality = (p: Person) => p.birth?.place?.split(",")[0];

/** Endings of female surname forms (Slovak/Czech -ová, -á; Polish -ska/-cka; Russian/Ukrainian -ова/-ева/-ина/-ская/-ська). */
const FEMALE = /(ová|á|(?:sk|ck|dzk)a|ова|ева|ина|іна|ая|ська|цька)$/i;
/** The stem two forms of a surname share: -ová, -á, -ý (Slovak, Czech), -ska/-ski (Polish), -ова/-ов, -ая/-ый (Russian, Ukrainian). */
function surnameStem(s: string): string {
  const l = s.toLowerCase();
  if (l.endsWith("ová")) return l.slice(0, -3);
  if (/(ова|ева|ина|іна)$/.test(l)) return l.slice(0, -1);
  if (/(ая|ий|ый|ой|(?:sk|ck|dzk)i)$/.test(l)) return l.replace(/(ая|ий|ый|ой)$/, "").replace(/i$/, "");
  if (/(á|ý|(?:sk|ck|dzk)a)$/.test(l)) return l.slice(0, -1);
  return l;
}

/**
 * Merges the female and male forms of a surname (Nováková and Novák) into one entry that counts both. It is shown in
 * the male form when the branch has one, otherwise as it stands. Works by endings only, so it needs no language.
 */
export function mergeSurnameForms(items: Count[]): Count[] {
  const stems = new Set(items.map(([v]) => surnameStem(v)));
  // a male -a surname (Procházka) shares the stem of its female form (Procházková) minus the -a
  const stemOf = (v: string) => {
    const l = v.toLowerCase(), st = surnameStem(v);
    return st === l && l.endsWith("a") && stems.has(l.slice(0, -1)) ? l.slice(0, -1) : st;
  };
  const groups = new Map<string, { forms: Count[]; total: number }>();
  for (const it of items) {
    const g = groups.get(stemOf(it[0])) ?? { forms: [], total: 0 };
    g.forms.push(it);
    g.total += it[1];
    groups.set(stemOf(it[0]), g);
  }
  return [...groups.values()].map(({ forms, total }): Count => {
    const male = forms.filter(([v]) => !FEMALE.test(v));
    const pick = (male.length ? male : forms).reduce((a, b) => (b[1] > a[1] ? b : a));
    return [pick[0], total];
  }).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** The first given name; a name without a given/surname split counts by its first word. */
const firstName = (p: Person) => (p.given || p.name).split(/[\s,]+/)[0];
/** What follows the given name in the name; empty when the file does not separate the surname. */
const surnameOf = (p: Person) => p.given && p.name.startsWith(p.given) ? p.name.slice(p.given.length).trim() : "";

/** most values a line names; the rest is counted ("+ 3 more") */
export const CORNER_MAX_VALUES = 5;

/**
 * One block per branch that has people and something to say. Each line shows as many values as fit in `maxWidth`;
 * the rest is counted ("+ 3 more").
 */
export function cornerBlocks(branches: Record<CornerKey, Person[]>, o: ChartOptions, measure: Measure,
                             maxWidth: (key: CornerKey) => number): Corner[] {
  const t = TEXTS[o.lang].corners, plural = new Intl.PluralRules(o.lang);
  const more = (n: number) => `+ ${n} ${t.more[{ one: 0, few: 1 }[plural.select(n) as "one" | "few"] ?? 2]}`;
  const sep = "  ·  ";
  const fit = (items: Count[], width: number) => {
    const shown = (n: number) => items.slice(0, n).map(([v, c]) => (c > 1 ? `${v} ×${c}` : v)).join(sep)
      + (n < items.length ? sep + more(items.length - n) : "");
    let n = Math.min(items.length, CORNER_MAX_VALUES);
    while (n > 1 && measure(shown(n), CORNER_VALUE_SIZE, false) > width) n--;
    return shown(n);
  };
  // the head of the branch (the first of its people): "Line: Name  ·  b. 1700", without the birth when it does not fit
  const heading = (head: Person, width: number) => {
    const name = head.name || "?", date = head.birth?.date ? formatDate(head.birth.date, o.dates === "full", o.lang) : "";
    const label = `${TEXTS[o.lang].corners.line}: ${name}`;
    const full = date ? `${label}  \u00B7  ${TEXTS[o.lang].abbr.birt.trim()} ${date}` : label;
    return measure(full, CORNER_HEAD_SIZE, true) <= width ? full : label;
  };
  return CORNER_KEYS.flatMap((key): Corner[] => {
    const people = branches[key];
    if (!people.length) return [];
    const lines: Count[][] = [
      tally(people, municipality),
      tally(people, firstName),
      mergeSurnameForms(tally(people, surnameOf)),
    ];
    const rows = lines.filter((items) => items.length).map((items) => fit(items, maxWidth(key)));
    return rows.length ? [{ key, heading: heading(people[0], maxWidth(key)), rows }] : [];
  });
}
