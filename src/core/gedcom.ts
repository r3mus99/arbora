/** GEDCOM reading: bytes → text → record tree → people and families. */

export interface GedNode {
  tag: string;
  value: string;
  xref: string | null;
  children: GedNode[];
}

export interface GedEvent {
  date: string;
  place: string;
}

export interface Person {
  /** xref including the at-signs, e.g. "@I1@" */
  id: string;
  name: string;
  sex: string;
  birth: GedEvent | null;
  death: GedEvent | null;
  /** OCCU values joined with ", " */
  occupation: string;
  /** families where the person is a child, birth family first */
  famc: string[];
  /** families where the person is a spouse */
  fams: string[];
}

export interface Family {
  id: string;
  husb: string | null;
  wife: string | null;
  marriage: GedEvent | null;
  divorced: boolean;
  children: string[];
}

export interface GedcomData {
  people: Record<string, Person>;
  families: Record<string, Family>;
}

/** Text from UTF-8 (with or without BOM), UTF-16 with BOM, else Windows-1250. */
export function decode(bytes: string | ArrayBuffer | Uint8Array): string {
  if (typeof bytes === "string") return bytes;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder("utf-16le").decode(u8);
  if (u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder("utf-16be").decode(u8);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(u8).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1250").decode(u8);
  }
}

const LINE_RE = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/;

/** Level-0 records with their sub-records; CONC/CONT are joined into the value. */
export function parseGedcom(text: string): GedNode[] {
  const records: GedNode[] = [];
  const stack: GedNode[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const level = parseInt(m[1], 10);
    const node: GedNode = { tag: m[3].toUpperCase(), value: (m[4] || "").trim(), xref: m[2] || null,
                            children: [] };
    if ((node.tag === "CONC" || node.tag === "CONT") && stack.length) {
      const parent = stack[Math.min(level, stack.length) - 1];
      parent.value += (node.tag === "CONT" ? "\n" : "") + node.value;
      continue;
    }
    stack.length = Math.min(stack.length, level);
    if (level === 0) records.push(node);
    else if (stack.length) stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return records;
}

const first = (node: GedNode, tag: string) => node.children.find((c) => c.tag === tag) || null;
const all = (node: GedNode, tag: string) => node.children.filter((c) => c.tag === tag);

function cleanName(value: string): string {
  return value.replace(/\//g, " ").replace(/\s+/g, " ").trim();
}

function eventOf(rec: GedNode, tags: string[]): GedEvent | null {
  for (const tag of tags) {
    const ev = first(rec, tag);
    if (!ev) continue;
    const d = first(ev, "DATE"), p = first(ev, "PLAC");
    const e = { date: d ? d.value : "", place: p ? p.value : "" };
    if (e.date || e.place) return e;
  }
  return null;
}

/**
 * Parse GEDCOM bytes or text into people and families keyed by xref ("@I1@").
 * With fallbackEvents a missing birth uses CHR/BAPM and a missing death BURI/CREM.
 */
export function load(input: string | ArrayBuffer | Uint8Array, fallbackEvents = true): GedcomData {
  const people: Record<string, Person> = {}, families: Record<string, Family> = {};
  const birthTags = fallbackEvents ? ["BIRT", "CHR", "BAPM"] : ["BIRT"];
  const deathTags = fallbackEvents ? ["DEAT", "BURI", "CREM"] : ["DEAT"];
  for (const rec of parseGedcom(decode(input))) {
    if (rec.tag === "INDI" && rec.xref) {
      const nameNode = first(rec, "NAME");
      let name = nameNode ? cleanName(nameNode.value) : "";
      if (nameNode && !name) {
        name = [first(nameNode, "GIVN"), first(nameNode, "SURN")]
          .filter((n): n is GedNode => n !== null).map((n) => n.value).join(" ");
      }
      const sex = first(rec, "SEX");
      const famc = all(rec, "FAMC").map((n, i) => {
        const pedi = first(n, "PEDI");
        return { id: n.value, rank: !pedi || pedi.value.toLowerCase() === "birth" ? 0 : 1, i };
      }).sort((a, b) => a.rank - b.rank || a.i - b.i).map((x) => x.id).filter(Boolean);
      people[rec.xref] = {
        id: rec.xref, name, sex: sex ? sex.value.toUpperCase() : "",
        birth: eventOf(rec, birthTags), death: eventOf(rec, deathTags),
        occupation: all(rec, "OCCU").map((n) => n.value).filter(Boolean).join(", "), famc,
        fams: all(rec, "FAMS").map((n) => n.value).filter(Boolean),
      };
    } else if (rec.tag === "FAM" && rec.xref) {
      const h = first(rec, "HUSB"), w = first(rec, "WIFE");
      families[rec.xref] = {
        id: rec.xref, husb: h ? h.value : null, wife: w ? w.value : null,
        marriage: eventOf(rec, ["MARR"]), divorced: !!first(rec, "DIV"),
        children: all(rec, "CHIL").map((n) => n.value).filter(Boolean),
      };
    }
  }
  return { people, families };
}

/** Lower case without diacritics, for searching and sorting. */
export function fold(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** People whose name contains every word of the query, or the one with that ID. */
export function findPeople(query: string, people: Record<string, Person>): Person[] {
  const q = query.trim();
  const key = q.startsWith("@") ? q : `@${q}@`;
  if (people[key]) return [people[key]];
  const words = fold(q).split(/\s+/).filter(Boolean);
  return Object.values(people).filter((p) => words.every((w) => fold(p.name).includes(w)));
}
