/** Chart rows: the ancestor or descendant tree flattened into printed lines. */

import { yearOf } from "./date";
import type { Family, GedcomData, Person } from "./gedcom";
import { DEFAULTS, formatEvent, label, personLine, type ChartOptions } from "./format";
import { TEXTS } from "./texts";

/** Vertical connector at column `gen` from row a to row b. */
export interface Link {
  gen: number;
  a: number;
  b: number;
  /** stop short of the row's text at that end */
  trimA?: boolean;
  trimB?: boolean;
}

export interface Row {
  /** generation, 1 = root; also the indentation level */
  gen: number;
  text: string;
  /** null for a spouse line */
  personId: string | null;
  /** repeated person, not expanded again; `target` is the expanded row */
  dup: boolean;
  /** short horizontal line before the text */
  tick: boolean;
  links: Link[];
  /** 1-based page number, set when the PDF is laid out */
  page: number;
  target: Row | null;
  spouse?: boolean;
  /** the spouse on a spouse line, if known */
  spouseId?: string | null;
  /** position in the tree: "1", "1.f.m" (ancestors), "1.2.1" (descendants), "1.2~1" (spouse line);
      a row hangs under every row whose path is a prefix ending before "." or "~" */
  path: string;
  /** Ahnentafel or d'Aboville number, whatever numbering is shown */
  ref: string;
}

const SELF = -1;

/** Ancestor chart: father's line above the person, mother's below. */
export function buildRows(rootId: string, people: Record<string, Person>,
                          families: Record<string, Family>, o: ChartOptions): Row[] {
  const rows: Row[] = [];
  const expanded = new Map<string, Row>();
  const maxGen = o.generations || 10000;

  function visit(pid: string, gen: number, ahnen: number, childFam: Family | null,
                 ancestors: Set<string>, path: string): number {
    const p = people[pid];
    const fam = p.famc.length ? families[p.famc[0]] : null;
    let father = fam && fam.husb && fam.husb in people ? fam.husb : null;
    let mother = fam && fam.wife && fam.wife in people ? fam.wife : null;
    if (gen >= maxGen) father = mother = null;
    const dup = expanded.has(pid);
    if (dup || ancestors.has(pid)) father = mother = null;

    let marr: Family | null = null;
    if (childFam && o.marriageOn !== "none") {
      const isFather = childFam.husb === pid;
      const hasFather = !!childFam.husb && childFam.husb in people;
      if (o.marriageOn === "both" || isFather || !hasFather) marr = childFam;
    }
    const number = o.numbering === "generation" ? gen
      : o.numbering === "ahnentafel" ? ahnen : null;
    const row: Row = { gen, text: personLine(p, number, marr, o), personId: pid, dup,
                       tick: gen > 1, links: [], page: 0, target: null, path, ref: String(ahnen) };
    if (!dup && !expanded.has(pid)) expanded.set(pid, row);

    const anc = new Set(ancestors).add(pid);
    const order: [string | null, number, "f" | "m"][] =
      [[father, 2 * ahnen, "f"], [mother, 2 * ahnen + 1, "m"]];
    let self = SELF;
    order.forEach(([par, num, which], i) => {
      if (i === 1) { rows.push(row); self = rows.length - 1; }
      if (par) {
        const r = visit(par, gen + 1, num, fam, anc, `${path}.${which}`);
        // vertical line at the parents' column, broken around the person's own line
        row.links.push(which === "f" ? { gen: gen + 1, a: r, b: SELF, trimB: true }
                                     : { gen: gen + 1, a: SELF, b: r, trimA: true });
      }
    });
    for (const l of row.links) {
      if (l.a === SELF) l.a = self;
      if (l.b === SELF) l.b = self;
    }
    return self;
  }

  visit(rootId, 1, 1, null, new Set(), "1");
  for (const r of rows) if (r.dup) r.target = expanded.get(r.personId!) || null;
  return rows;
}

const yearKey = (ev: { date: string } | null) => yearOf(ev?.date);

/** Order ids by birth year; people without a year keep their place next to siblings. */
function byBirth(ids: string[], people: Record<string, Person>): string[] {
  let last = -Infinity;
  const keyed = ids.map((id, i) => {
    const y = yearKey(people[id] && people[id].birth);
    if (y !== null) last = y;
    return { id, k: y !== null ? y : last, i };
  });
  return keyed.sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.id);
}

function spouseLine(fam: Family, spouse: Person | null, o: ChartOptions): string {
  const t = TEXTS[o.lang];
  const marr = formatEvent("marr", fam.marriage, o, fam.divorced ? t.divorced : "");
  const prefix = marr || label("marr", o).trim();
  return `${prefix} ${personLine(spouse, null, null, o)}`;
}

/** Descendant chart: person, then (spouse and) children indented below. */
export function buildDescRows(rootId: string, people: Record<string, Person>,
                              families: Record<string, Family>, o: ChartOptions): Row[] {
  const rows: Row[] = [];
  const expanded = new Map<string, Row>();
  const maxGen = o.generations || 10000;

  function visit(pid: string, gen: number, dab: string, ancestors: Set<string>): number {
    const p = people[pid];
    const dup = expanded.has(pid);
    const number = o.numbering === "generation" ? gen
      : o.numbering === "daboville" ? dab : null;
    const row: Row = { gen, text: personLine(p, number, null, o), personId: pid, dup,
                       tick: gen > 1, links: [], page: 0, target: null, path: dab, ref: dab };
    rows.push(row);
    const self = rows.length - 1;
    if (!dup && !expanded.has(pid)) expanded.set(pid, row);
    if (dup || ancestors.has(pid) || gen >= maxGen) return self;

    const anc = new Set(ancestors).add(pid);
    // marriages in time order (by wedding year, else by the first child's birth)
    const fams = p.fams.map((f, i) => ({ f: families[f], i })).filter((x) => x.f)
      .map((x) => {
        const kidYears = x.f.children.map((c) => yearKey(people[c] && people[c].birth))
          .filter((y): y is number => y !== null);
        const k = yearKey(x.f.marriage);
        return { f: x.f, i: x.i,
                 k: k !== null ? k : kidYears.length ? Math.min(...kidYears) : Infinity };
      })
      .sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.f);
    const withKids = fams.filter((f) => f.children.some((c) => c in people));
    let childNo = 0;
    for (const fam of fams) {
      const spouseId = fam.husb === pid ? fam.wife : fam.husb;
      const spouse = (spouseId && people[spouseId]) || null;
      const kids = byBirth(fam.children.filter((c) => c in people), people);
      let anchor = self;
      if (o.showSpouses && (spouse || (kids.length && withKids.length > 1))) {
        rows.push({ gen, text: spouseLine(fam, spouse, o), personId: null,
                    dup: false, tick: false, links: [], page: 0, target: null,
                    spouse: true, spouseId: spouse ? spouseId : null,
                    path: `${dab}~${fams.indexOf(fam) + 1}`, ref: "" });
        anchor = rows.length - 1;
      }
      if (!kids.length) continue;
      // without spouse lines all children hang on one line from the person
      if (!o.showSpouses && row.links.length) anchor = row.links[row.links.length - 1].b;
      let lastKid = SELF;
      for (const kid of kids) {
        childNo += 1;
        lastKid = visit(kid, gen + 1, `${dab}.${childNo}`, anc);
      }
      if (!o.showSpouses && row.links.length) {
        row.links[row.links.length - 1].b = lastKid;
      } else {
        row.links.push({ gen: gen + 1, a: anchor, b: lastKid, trimA: true });
      }
    }
    return self;
  }

  visit(rootId, 1, "1", new Set());
  for (const r of rows) if (r.dup) r.target = expanded.get(r.personId!) || null;
  return rows;
}

/** Rows of the chart for the chosen kind, with numbering matched to the kind. */
export function chartRows(data: GedcomData, rootId: string, options: Partial<ChartOptions>): Row[] {
  const o = normalize(options);
  return o.chart === "descendants" ? buildDescRows(rootId, data.people, data.families, o)
                                   : buildRows(rootId, data.people, data.families, o);
}

/** Options with defaults filled in and numbering matched to the chart kind. */
export function normalize(options: Partial<ChartOptions>): ChartOptions {
  const o = { ...DEFAULTS, ...options };
  const desc = o.chart === "descendants";
  if (desc && o.numbering === "ahnentafel") o.numbering = "daboville";
  if (!desc && o.numbering === "daboville") o.numbering = "ahnentafel";
  return o;
}
