/** How a person is named in the people lists: "Surname, Given" (the surname first, so the list reads like a register). */

import type { Person } from "./gedcom";

/** the surname part of the name: what follows the given name(s); empty when there is none */
export function surnameOf(p: Pick<Person, "name" | "given">): string {
  const name = p.name.trim(), given = p.given.trim();
  if (!given) return name;
  if (name === given) return "";
  return name.startsWith(given + " ") ? name.slice(given.length).trim() : "";
}

/** "Hrabovsky, Adam"; without a surname just the given name, without any name "?" */
export function listName(p: Pick<Person, "name" | "given">): string {
  const sn = surnameOf(p), given = p.given.trim();
  if (sn && given) return `${sn}, ${given}`;
  return sn || given || p.name.trim() || "?";
}

const collator = new Intl.Collator("sk");

/** Surname, then given name, in Slovak order (Č after C, Ch after H); people without a surname go last. */
export function compareByListName(a: Pick<Person, "name" | "given">, b: Pick<Person, "name" | "given">): number {
  const sa = surnameOf(a), sb = surnameOf(b);
  if (!sa !== !sb) return sa ? -1 : 1;
  return collator.compare(sa, sb) || collator.compare(a.given, b.given) || collator.compare(a.name, b.name);
}
