/** GEDCOM reading: bytes → text → record tree → people and families. */

export interface GedNode {
  tag: string;
  value: string;
  xref: string | null;
  children: GedNode[];
  /** level-0 records: the original lines, so an unedited record is written back unchanged */
  raw?: string[];
}

export interface GedEvent {
  date: string;
  place: string;
}

export interface Person {
  /** xref including the at-signs, e.g. "@I1@" */
  id: string;
  name: string;
  /** other forms of the name (NAME with TYPE aka), cleaned like `name` */
  aka: string[];
  sex: string;
  birth: GedEvent | null;
  death: GedEvent | null;
  /** OCCU values joined with ", " */
  occupation: string;
  /** RELI */
  religion: string;
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

/**
 * Level-0 records with their sub-records; CONC/CONT are joined into the value.
 * Each record keeps its original lines in `raw`.
 */
export function parseGedcom(text: string): GedNode[] {
  const records: GedNode[] = [];
  const stack: GedNode[] = [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  for (const line of lines) {
    const m = LINE_RE.exec(line);
    if (!m) {
      records[records.length - 1]?.raw?.push(line);
      continue;
    }
    const level = parseInt(m[1], 10);
    const tag = m[3].toUpperCase();
    // spaces at the edges of a CONC/CONT piece belong to the joined text
    const node: GedNode = { tag, value: tag === "CONC" || tag === "CONT" ? m[4] || "" : (m[4] || "").trim(),
                            xref: m[2] || null, children: [] };
    if (level > 0) records[records.length - 1]?.raw?.push(line);
    if ((tag === "CONC" || tag === "CONT") && stack.length) {
      const parent = stack[Math.min(level, stack.length) - 1];
      parent.value += (tag === "CONT" ? "\n" : "") + node.value;
      continue;
    }
    stack.length = Math.min(stack.length, level);
    if (level === 0) records.push({ ...node, raw: [line] });
    else if (stack.length) stack[stack.length - 1].children.push(node);
    stack.push(level === 0 ? records[records.length - 1] : node);
  }
  return records;
}

/** The first sub-record with the tag, or null. */
export const childOf = (node: GedNode, tag: string) => node.children.find((c) => c.tag === tag) || null;
/** Every sub-record with the tag. */
export const childrenOf = (node: GedNode, tag: string) => node.children.filter((c) => c.tag === tag);

/** A new line `tag value` with its sub-lines, not read from a file. */
export const gedNode = (tag: string, value = "", children: GedNode[] = []): GedNode =>
  ({ tag, value, xref: null, children });

/** The node with (new) children; its original lines are dropped, so it is written anew. */
export function rewritten(node: GedNode, children = node.children): GedNode {
  const { raw: _, ...rest } = node;
  return { ...rest, children };
}

/** a NAME kept as another known form of the name: `2 TYPE aka` */
export const isAka = (name: GedNode) =>
  name.children.some((c) => c.tag === "TYPE" && c.value.trim().toLowerCase() === "aka");

/** The person's own name: the first NAME that is not an aka, else the first NAME. */
export function mainName(rec: GedNode): GedNode | null {
  const names = childrenOf(rec, "NAME");
  return names.find((n) => !isAka(n)) || names[0] || null;
}

export function cleanName(value: string): string {
  return value.replace(/\//g, " ").replace(/\s+/g, " ").trim();
}

function eventOf(rec: GedNode, tags: string[]): GedEvent | null {
  for (const tag of tags) {
    const ev = childOf(rec, tag);
    if (!ev) continue;
    const d = childOf(ev, "DATE"), p = childOf(ev, "PLAC");
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
  return readRecords(parseGedcom(decode(input)), fallbackEvents);
}

/** People and families of parsed records (see `load`). */
export function readRecords(records: GedNode[], fallbackEvents = true): GedcomData {
  const people: Record<string, Person> = {}, families: Record<string, Family> = {};
  const birthTags = fallbackEvents ? ["BIRT", "CHR", "BAPM"] : ["BIRT"];
  const deathTags = fallbackEvents ? ["DEAT", "BURI", "CREM"] : ["DEAT"];
  for (const rec of records) {
    if (rec.tag === "INDI" && rec.xref) {
      const nameNode = mainName(rec);
      let name = nameNode ? cleanName(nameNode.value) : "";
      if (nameNode && !name) {
        name = [childOf(nameNode, "GIVN"), childOf(nameNode, "SURN")]
          .filter((n): n is GedNode => n !== null).map((n) => n.value).join(" ");
      }
      const sex = childOf(rec, "SEX");
      const famc = childrenOf(rec, "FAMC").map((n, i) => {
        const pedi = childOf(n, "PEDI");
        return { id: n.value, rank: !pedi || pedi.value.toLowerCase() === "birth" ? 0 : 1, i };
      }).sort((a, b) => a.rank - b.rank || a.i - b.i).map((x) => x.id).filter(Boolean);
      people[rec.xref] = {
        id: rec.xref, name, sex: sex ? sex.value.toUpperCase() : "",
        aka: all(rec, "NAME").filter((n) => n !== nameNode && isAka(n)).map((n) => cleanName(n.value)).filter(Boolean),
        birth: eventOf(rec, birthTags), death: eventOf(rec, deathTags),
        occupation: childrenOf(rec, "OCCU").map((n) => n.value).filter(Boolean).join(", "), famc,
        religion: childOf(rec, "RELI")?.value || "",
        fams: childrenOf(rec, "FAMS").map((n) => n.value).filter(Boolean),
      };
    } else if (rec.tag === "FAM" && rec.xref) {
      const h = childOf(rec, "HUSB"), w = childOf(rec, "WIFE");
      families[rec.xref] = {
        id: rec.xref, husb: h ? h.value : null, wife: w ? w.value : null,
        marriage: eventOf(rec, ["MARR"]), divorced: !!childOf(rec, "DIV"),
        children: childrenOf(rec, "CHIL").map((n) => n.value).filter(Boolean),
      };
    }
  }
  return { people, families };
}

/** Lower case without diacritics, for searching and sorting. */
export function fold(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

const queryWords = (query: string) => fold(query).split(/\s+/).filter(Boolean);
const hasAll = (text: string, words: string[]) => words.every((w) => fold(text).includes(w));

/** People whose name, or another form of it (aka), contains every word of the query, or the one with that ID. */
export function findPeople(query: string, people: Record<string, Person>): Person[] {
  const q = query.trim();
  const key = q.startsWith("@") ? q : `@${q}@`;
  if (people[key]) return [people[key]];
  const words = queryWords(q);
  return Object.values(people).filter((p) => hasAll(p.name, words) || p.aka.some((a) => hasAll(a, words)));
}

/** The aka a person was found by, when the name itself does not match the query. */
export function matchedAka(query: string, p: Person): string | null {
  const words = queryWords(query);
  if (!words.length || hasAll(p.name, words)) return null;
  return p.aka.find((a) => hasAll(a, words)) || null;
}
