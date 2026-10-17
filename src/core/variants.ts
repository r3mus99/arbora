/**
 * Bulk fix: spellings of one surname, given name or place that differ only in accents, doubled
 * letters or old Hungarian/German spelling (Pavlovský / Pavlovszký, Lieskovice /
 * Lieszkovicz), found as groups and renamed to one chosen spelling.
 * A place is compared by its town and house number but renamed as a whole ("Lieskovice",
 * "Lieskovice, Senica, Slovakia" are variants of one place; "Lieskovice 22" is another one,
 * and so is every other house number).
 */

import { childOf, childrenOf, fold, gedNode, isAka, mainName, rewritten, type GedNode } from "./gedcom";
import { surnameOf } from "./stats";

export type VariantKind = "surname" | "given" | "place";

export interface Variant {
  value: string;
  /** records (people, families) that use this spelling */
  records: string[];
  /** places: the country at the end of the place, when it is a known one (see COUNTRIES) */
  country?: string;
  /** places: the house number after the town ("Lieskovice 22" → "22") */
  number?: string;
}

export interface VariantGroup {
  kind: VariantKind;
  /** the same for the same set of spellings, to remember a hidden group */
  key: string;
  /** most used spelling first */
  variants: Variant[];
}

/** Lower case Latin letters only, old spellings written the modern way, no doubled letters. */
export function spellingKey(s: string): string {
  return fold(s).replace(/[^a-z]/g, "")
    .replace(/sz/g, "s").replace(/cz|cs|tz/g, "c").replace(/zs/g, "z").replace(/ph/g, "f").replace(/th/g, "t")
    .replace(/w/g, "v").replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
}

/** Edit distance, but no more than `max + 1` is ever reported. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/** Women's surnames (Kováčiková, Pavlovská, Potocka): never the same as the men's form. */
const feminine = (s: string) => /(ov[áa]|á|[csz]ka)$/i.test(s.trim());
/** the part of a surname to compare: without -ová, so Gaňová and Galová are as far apart as Gaň and Gal */
const stem = (s: string) => s.trim().replace(/ov[áa]$/i, "");

/** What two spellings are compared by: the spelling key (of the stem for surnames) and, for surnames, the gender. */
interface Keyed { key: string; fem: boolean; /** places: the house number, "" for the town itself */ num: string }
const keyed = (value: string, kind: VariantKind): Keyed =>
  kind === "given" ? { key: spellingKey(value), fem: false, num: "" } :
  kind === "surname" ? { key: spellingKey(stem(value)), fem: feminine(value), num: "" }
    : { key: spellingKey(townOf(value)), fem: false, num: houseNumberOf(value) };
/** Surnames differ by gender, places by house number: "Town 19" is never "Town 22" nor the town itself. */
const side = (k: Keyed) => `${k.fem}|${k.num}`;

/** Two spellings whose keys say they are most likely the same name. */
function similarKeys(a: Keyed, b: Keyed, kind: VariantKind): boolean {
  if (a.fem !== b.fem || a.num !== b.num || !a.key || !b.key) return false;
  if (a.key === b.key) return true;
  // given names: Alexander and Alexandra, Daniel and Daniela are two names, Katarína and Katerína are one
  if (kind === "given" && a.key.at(-1) !== b.key.at(-1)) return false;
  // short names differ in a letter too often to be the same (Novák, Nosák; Lindau, Landau)
  const len = Math.min(a.key.length, b.key.length);
  const max = len >= 11 ? 2 : len >= (kind === "place" ? 7 : 6) ? 1 : 0;
  return max > 0 && a.key[0] === b.key[0] && distance(a.key, b.key, max) <= max;
}

/** The word and every string left after deleting up to `most` of its letters. */
function deletions(word: string, most: number): Set<string> {
  let level = new Set([word]);
  const all = new Set(level);
  for (let d = 0; d < most; d++) {
    const next = new Set<string>();
    for (const w of level) for (let i = 0; i < w.length; i++) next.add(w.slice(0, i) + w.slice(i + 1));
    next.forEach((w) => all.add(w));
    level = next;
  }
  return all;
}

/** Two spellings that are most likely the same name. */
export function similar(a: string, b: string, kind: VariantKind): boolean {
  return a !== b && similarKeys(keyed(a, kind), keyed(b, kind), kind);
}

/** The town of a PLAC value and what stays around it: "Lieskovice 22, Senica" → ["", "Lieskovice", " 22, Senica"]. */
function splitPlace(value: string): [string, string, string] {
  const m = /^(\s*)(.*?)(\s*\d*\s*(?:,.*)?)$/s.exec(value);
  return m ? [m[1], m[2], m[3]] : ["", value, ""];
}
export const townOf = (place: string) => splitPlace(place)[1];
/** The house number after the town: "Lieskovice 22, Senica" → "22". */
export const houseNumberOf = (place: string) => /\d+/.exec(splitPlace(place)[2].split(",")[0])?.[0] || "";

/** Country names in the languages of the interface; historic countries are their own entries. */
const COUNTRIES: Record<string, string[]> = {
  slovakia: ["slovensko", "slovakia", "slowakei", "slovaquie", "eslovaquia", "slovacchia", "szlovakia", "slowacja", "slovacia", "slovaka"],
  czechoslovakia: ["ceskoslovensko", "czechoslovakia", "tschechoslowakei", "tchecoslovaquie", "checoslovaquia",
    "cecoslovacchia", "csehszlovakia", "czechoslowacja", "csr"],
  czechia: ["cesko", "ceska republika", "czechia", "czech republic", "tschechien", "tchequie", "chequia", "cechia",
    "csehorszag", "czechy"],
  hungary: ["madarsko", "madarorszag", "hungary", "ungarn", "hongrie", "hungria", "ungheria", "wegry"],
  "austria-hungary": ["rakusko-uhorsko", "rakousko-uhersko", "austria-hungary", "osterreich-ungarn", "austro-hungarian empire",
    "austro-ungarn", "autriche-hongrie", "austria-hungria", "austria-ungheria", "ausztria-magyarorszag", "austro-wegry"],
  austria: ["rakusko", "rakousko", "austria", "osterreich", "oesterreich", "autriche", "ausztria"],
  poland: ["polsko", "poland", "polen", "pologne", "polonia", "lengyelorszag", "polska"],
  ukraine: ["ukrajina", "ukraine", "ukraina", "ukrainia", "ukrajna"],
  germany: ["nemecko", "germany", "deutschland", "allemagne", "alemania", "germania", "nemetorszag", "niemcy"],
};
const countryByName = new Map(Object.entries(COUNTRIES).flatMap(([id, names]) => names.map((n) => [n, id] as const)));
/** The country named at the end of a place, if it is a known one. */
export function countryOf(place: string): string | undefined {
  const parts = place.split(",");
  return parts.length > 1 ? countryByName.get(fold(parts[parts.length - 1]).trim().replace(/\s+/g, " ")) : undefined;
}

/** Words of the given name in a NAME ("Ján Pavol /Kováč/" → Ján, Pavol), without initials. */
export function givenWords(name: GedNode): string[] {
  const m = /^([^/]*)\//.exec(name.value);
  const given = m ? m[1] : name.value.trim() ? (surnameOf(name) && !childOf(name, "SURN") ? name.value.replace(/\S+\s*$/, "") : name.value) : "";
  const text = given.trim() ? given : childOf(name, "GIVN")?.value || "";
  return text.split(/[\s-]+/).filter((w) => w.length > 1 && !w.endsWith("."));
}

/** Every surname, given name or whole place in the records, with the records that use it. */
export function spellings(records: GedNode[], kind: VariantKind): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const count = (value: string, id: string) => {
    if (!value) return;
    const list = out.get(value) || [];
    if (list[list.length - 1] !== id) list.push(id);
    out.set(value, list);
  };
  for (const rec of records) {
    if (!rec.xref || (rec.tag !== "INDI" && rec.tag !== "FAM")) continue;
    if (kind === "surname" || kind === "given") {
      const n = rec.tag === "INDI" ? mainName(rec) : null;
      if (n && kind === "given") givenWords(n).forEach((w) => count(w, rec.xref!));
      else if (n) count(surnameOf(n), rec.xref!);
      continue;
    }
    const walk = (node: GedNode) => {
      if (node.tag === "PLAC") count(node.value.trim(), rec.xref!);
      node.children.forEach(walk);
    };
    rec.children.forEach(walk);
  }
  return out;
}

/** Groups of two or more spellings of one surname, or of places in one town. */
export function variantGroups(records: GedNode[], kind: VariantKind): VariantGroup[] {
  const used = spellings(records, kind);
  const values = [...used.keys()];
  const parent = values.map((_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  const join = (i: number, j: number) => { parent[root(j)] = root(i); };
  // spellings with the same key are one name at once; only different keys are compared
  const byKey = new Map<string, { k: Keyed; first: number }>();
  values.forEach((value, i) => {
    const k = keyed(value, kind);
    if (!k.key) return;
    const id = `${side(k)}|${k.key}`;
    const known = byKey.get(id);
    if (known) join(known.first, i); else byKey.set(id, { k, first: i });
  });
  // keys within edit distance d share a string left after at most d deletions from each,
  // so only keys that share such a string are compared (a key may differ in 2 letters
  // when it has 11 or more, in 1 when it has 6 or more, else not at all)
  const near = new Map<string, number[]>();
  const entries = [...byKey.values()];
  entries.forEach((entry, n) => {
    const key = entry.k.key;
    const most = key.length >= 11 ? 2 : key.length >= 6 ? 1 : 0;
    for (const variant of deletions(key, most)) {
      const list = near.get(`${side(entry.k)}|${variant}`);
      if (list) list.push(n); else near.set(`${side(entry.k)}|${variant}`, [n]);
    }
  });
  const compared = new Set<string>();
  for (const list of near.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const pair = `${list[i]},${list[j]}`;
        if (compared.has(pair)) continue;
        compared.add(pair);
        const a = entries[list[i]], b = entries[list[j]];
        if (similarKeys(a.k, b.k, kind)) join(a.first, b.first);
      }
    }
  }
  const groups = new Map<number, Variant[]>();
  values.forEach((value, i) => {
    const g = groups.get(root(i)) || [];
    g.push({ value, records: used.get(value)! });
    if (kind === "place") {
      const v = g[g.length - 1];
      v.country = countryOf(value);
      v.number = houseNumberOf(value) || undefined;
    }
    groups.set(root(i), g);
  });
  return [...groups.values()].filter((g) => g.length > 1)
    .map((g) => g.sort((a, b) => b.records.length - a.records.length || a.value.localeCompare(b.value)))
    .map((variants) => ({ kind, variants, key: `${kind}:${variants.map((v) => v.value).sort().join("|")}` }))
    .sort((a, b) => a.variants[0].value.localeCompare(b.variants[0].value));
}

/**
 * Spellings of a group that are not replaced unless the user chooses so: places in another
 * (known) country than `target`, e.g. Czechoslovakia next to Slovakia.
 */
export function keptByDefault(group: VariantGroup, target: string): Set<string> {
  const to = group.variants.find((v) => v.value === target);
  const kept = new Set<string>();
  if (group.kind !== "place" || !to) return kept;
  for (const v of group.variants) {
    if (v === to) continue;
    if (v.country && to.country && v.country !== to.country) kept.add(v.value);
  }
  return kept;
}

/** A node with new children and new lines; unchanged when nothing changed. */
function mapNode(node: GedNode, change: (n: GedNode) => GedNode): GedNode {
  let changed = false;
  const kids = node.children.map((c) => {
    const next = mapNode(change(c), change);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? rewritten(node, kids) : node;
}

/** One NAME with its surname renamed, in the slashes, in SURN, or as the last word. */
export function renameSurname(name: GedNode, from: Set<string>, to: string): GedNode {
  const old = surnameOf(name);
  if (!from.has(old)) return name;
  let value = name.value;
  if (/\/[^/]*\//.test(value)) value = value.replace(/\/([^/]*)\//, (all, s: string) => (s.trim() === old ? `/${to}/` : all));
  else if (!childrenOf(name, "SURN").some((c) => c.value.trim() === old)) value = value.replace(/\S+(\s*)$/, `${to}$1`);
  const kids = name.children.map((c) => (c.tag === "SURN" && from.has(c.value.trim()) ? { ...c, value: to } : c));
  return { ...name, value, children: kids };
}

/** One NAME with given name words renamed, in the value before the slashes and in GIVN. */
export function renameGiven(name: GedNode, from: Set<string>, to: string): GedNode {
  if (!givenWords(name).some((w) => from.has(w))) return name;
  const swap = (text: string) => text.replace(/[^\s-]+/g, (w) => (from.has(w) ? to : w));
  let value = name.value;
  const slash = value.indexOf("/");
  if (slash >= 0) value = swap(value.slice(0, slash)) + value.slice(slash);
  else if (childOf(name, "SURN") || !surnameOf(name)) value = swap(value);
  else value = value.replace(/^(.*?)(\S+\s*)$/s, (_, g: string, last: string) => swap(g) + last);
  const kids = name.children.map((c) => (c.tag === "GIVN" ? { ...c, value: swap(c.value) } : c));
  return { ...name, value, children: kids };
}

/**
 * The records with every spelling in `from` replaced by `to`: surnames in names,
 * whole places (PLAC values).
 * The same array when nothing changes.
 */
export function renameVariants(records: GedNode[], kind: VariantKind, from: string[], to: string,
                               keepOld = false): GedNode[] {
  to = to.trim();
  const set = new Set(from.filter((f) => f && f !== to));
  if (!to || !set.size) return records;
  if (kind === "surname") return renameSurnames(records, set, to, keepOld);
  if (kind === "given") return renameGivens(records, set, to);
  const change = (n: GedNode): GedNode => {
    if (kind === "place" && n.tag === "PLAC") {
      if (set.has(n.value.trim())) return { ...n, value: to };
    }
    return n;
  };
  let changed = false;
  const out = records.map((rec) => {
    if (!rec.xref || (rec.tag !== "INDI" && rec.tag !== "FAM")) return rec;
    const next = mapNode(rec, change);
    if (next !== rec) changed = true;
    return next;
  });
  return changed ? out : records;
}

/** Given names renamed in each person's main name (other names, marked aka or not, are left alone). */
function renameGivens(records: GedNode[], from: Set<string>, to: string): GedNode[] {
  let changed = false;
  const out = records.map((rec) => {
    if (rec.tag !== "INDI" || !rec.xref) return rec;
    let touched = false;
    const main = mainName(rec);
    const kids = rec.children.map((c) => {
      if (c !== main) return c;
      const next = renameGiven(c, from, to);
      if (next !== c) touched = true;
      return next;
    });
    if (!touched) return rec;
    changed = true;
    return rewritten(rec, kids);
  });
  return changed ? out : records;
}

/**
 * Surnames renamed in each person's main name (other names, marked aka or not, are left alone). With `keepOld` the
 * old spelling stays as one more name, `1 NAME … 2 TYPE aka`, right after the renamed one,
 * unless the person already has it; an aka equal to the new name is dropped.
 */
function renameSurnames(records: GedNode[], from: Set<string>, to: string, keepOld: boolean): GedNode[] {
  let changed = false;
  const out = records.map((rec) => {
    if (rec.tag !== "INDI" || !rec.xref) return rec;
    const known = new Set(childrenOf(rec, "NAME").filter(isAka).map((n) => n.value.replace(/\s+/g, " ").trim()));
    let touched = false;
    const mainNode = mainName(rec);
    const kids = rec.children.flatMap((c) => {
      if (c !== mainNode) return [c];
      const next = renameSurname(c, from, to);
      if (next === c) return [c];
      touched = true;
      const old = c.value.replace(/\s+/g, " ").trim();
      if (!keepOld || known.has(old)) return [next];
      known.add(old);
      const aka = gedNode("NAME", c.value, [
        ...c.children.filter((k) => k.tag === "GIVN" || k.tag === "SURN" || k.tag === "NPFX" || k.tag === "NSFX"),
        gedNode("TYPE", "aka")]);
      return [next, aka];
    });
    if (!touched) return rec;
    changed = true;
    // an aka that is now the name itself (renamed back) is not needed
    const norm = (n: GedNode) => n.value.replace(/\s+/g, " ").trim();
    const main = new Set(kids.filter((k) => k.tag === "NAME" && !isAka(k)).map(norm));
    return rewritten(rec, kids.filter((k) => k.tag !== "NAME" || !isAka(k) || !main.has(norm(k))));
  });
  return changed ? out : records;
}
