/** Surname of a person. */
import { childOf, type GedNode } from "./gedcom";

const ROMAN = /^[IVXLCDM]+\.?$/;

/**
 * Surname from a NAME value: the part between slashes, else SURN, else the last word of a name
 * of two or more words (not a regnal number like "I." or a word in lower case like "von").
 */
export function surnameOf(name: GedNode): string {
  const m = /\/([^/]*)\//.exec(name.value);
  if (m) return m[1].trim();
  const surn = childOf(name, "SURN")?.value.trim();
  if (surn) return surn;
  const words = name.value.trim().split(/\s+/);
  const last = words[words.length - 1] || "";
  if (words.length < 2 || ROMAN.test(last) || last.endsWith(".") || last.toLowerCase() === last) return "";
  return last;
}
