/**
 * Mock of the poster with the hand-drawn apple tree (src/assets/apple-tree.svg) and the existing hand-cut name plates,
 * filled with dummy data. Static layout; the later generator will take real people.
 */

import treeSvg from "../assets/apple-tree.svg?raw";
import type { GedcomData, Person } from "./gedcom";
import { yearOf } from "./date";
import { POSTER_COLORS as C, plateOutline, random, textWidth } from "./poster";

export interface MockPerson { name: string; dates: string; sex: "M" | "F" }

export const DUMMY_PEOPLE: { main: MockPerson; father: MockPerson; mother: MockPerson } = {
  main: { name: "Ján Novák", dates: "*1984", sex: "M" },
  father: { name: "Peter Novák", dates: "*1956 †2019", sex: "M" },
  mother: { name: "Anna Nováková", dates: "*1959", sex: "F" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plate anchors in the tree's coordinates: the trunk and the ends of the two long limbs. */
const ANCHORS = { main: [555, 905, 1.6], father: [-130, 735, 1.4], mother: [1240, 735, 1.4] } as const;

export function mockTreePoster(people = DUMMY_PEOPLE): string {
  const rnd = random(7);
  const plates = (Object.keys(ANCHORS) as (keyof typeof ANCHORS)[]).map((key) => {
    const [cx, cy, k] = ANCHORS[key], p = people[key];
    const w = 190 * k, h = 62 * k;
    const [outer, inner] = plateOutline(rnd, cx, cy, w, h, k);
    const nameSize = Math.min(17 * k, (w * 0.84) / textWidth(p.name, 1, true));
    const fill = p.sex === "M" ? C.male : C.female;
    return `<path d="${outer}" fill="${C.branchEdge}"/><path d="${inner}" fill="${C.plate}"/>` +
      `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="${nameSize}" font-weight="700" fill="${fill}">${esc(p.name)}</text>` +
      `<text x="${cx}" y="${cy + 17 * k}" text-anchor="middle" font-size="${11 * k}" fill="${C.ink}">${esc(p.dates)}</text>`;
  }).join("");
  return treeSvg.replace("</svg>", `<g>${plates}</g></svg>`);
}

const mockOf = (p: Person | null, fallback: string, sex: "M" | "F"): MockPerson => {
  const b = yearOf(p?.birth?.date), d = yearOf(p?.death?.date);
  const dates = [b ? `*${b}` : "", d ? `\u2020${d}` : ""].filter(Boolean).join(" ");
  return { name: p?.name || fallback, dates, sex: p ? (p.sex === "F" ? "F" : p.sex === "M" ? "M" : sex) : sex };
};

/** The tree poster of one real person: their name on the trunk, the father and the mother on the two long limbs. */
export function treePosterFor(data: GedcomData, id: string): string {
  const person = data.people[id];
  const fam = data.families[person.famc[0]];
  const father = fam?.husb ? data.people[fam.husb] : null;
  const mother = fam?.wife ? data.people[fam.wife] : null;
  return mockTreePoster({ main: mockOf(person, "", "M"), father: mockOf(father, "?", "M"), mother: mockOf(mother, "?", "F") });
}
