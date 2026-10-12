/** The parts of a person's names beyond what the name line itself says. */

import { childOf, childrenOf, isAka, mainName, type GedNode } from "./gedcom";

/** name pieces written as lines under the main NAME, with the GEDCOM tag that holds them */
export const NAME_PART_TAGS = { NPFX: "prefix", NICK: "nickname", _RUFNAME: "called", SPFX: "surnamePrefix",
                                NSFX: "suffix" } as const;
export type NamePartKind = (typeof NAME_PART_TAGS)[keyof typeof NAME_PART_TAGS];

export interface NamePart { kind: NamePartKind; value: string }

/** a name that is neither the main one nor an aka, with what kind of name it is (TYPE) */
export interface OtherName { name: string; type: string }

export interface NameDetails { parts: NamePart[]; others: OtherName[] }

const readable = (value: string) => value.replace(/\//g, " ").replace(/\s+/g, " ").trim();

/** Prefix, nickname, called name, surname prefix and suffix of the main name, and the other names. */
export function nameDetails(rec: GedNode): NameDetails {
  const main = mainName(rec);
  const parts: NamePart[] = [];
  if (main) {
    for (const [tag, kind] of Object.entries(NAME_PART_TAGS)) {
      for (const n of childrenOf(main, tag)) if (n.value.trim()) parts.push({ kind, value: n.value.trim() });
    }
  }
  const others = childrenOf(rec, "NAME").filter((n) => n !== main && !isAka(n))
    .map((n) => ({ name: readable(n.value), type: (childOf(n, "TYPE")?.value || "").trim() }))
    .filter((n) => n.name);
  return { parts, others };
}
