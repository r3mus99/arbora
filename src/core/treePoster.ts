/**
 * Mock of the poster with the hand-drawn apple tree (src/assets/apple-tree.svg) and the existing hand-cut name plates,
 * filled with dummy data. Static layout; the later generator will take real people.
 */

import treeSvg from "../assets/apple-tree.svg?raw";
import { POSTER_COLORS as C, plateOutline, random, textWidth, type Poster } from "./poster";

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

/**
 * Puts the apple tree into the middle of a finished poster SVG, behind the branches and plates. The foot of the trunk
 * stands at the main person's plate and the crown rises above it; the poster itself is not changed.
 */
export function addTreeToPoster(svg: string, poster: Poster): string {
  const root = poster.plates.find((p) => p.gen === 1);
  if (!root) return svg;
  // The tree grows with the poster: its crown fills the room between the title and the parents (whose level is
  // 735 units above the trunk base in the tree), but the long limbs never stick out past the parents' plates. The
  // trunk is lengthened down to the person.
  const parents = poster.plates.filter((p) => p.gen === 2).sort((p, q) => p.x - q.x);
  let k = Math.min(poster.width * 0.42, poster.height * 0.8) / 1050;
  let tx = poster.width / 2 - 555 * k, ty = root.y - 1050 * k;
  let trunk = 0;
  if (parents.length === 2) {
    const [l, r] = parents;
    const level = (l.y + r.y) / 2;
    const reach = (r.x - l.x) / 2 + Math.min(l.w, r.w) / 2 - 20;
    k = Math.min(Math.max((level - 185) / 735, 0.16), reach / 525);
    tx = poster.width / 2 - 555 * k;
    ty = level - 735 * k;
    trunk = Math.max(0, (root.y - root.h / 2 - ty) / k - 1050);
  }
  const base = trunk > 0
    ? `<path d="M457,1040L657,1040L662.4,${(1046 + trunk).toFixed(1)}L447.6,${(1054 + trunk).toFixed(1)}Z" fill="#6b4626"/>` +
      `<path d="M457,1040L447.6,${(1054 + trunk).toFixed(1)}M657,1040L662.4,${(1046 + trunk).toFixed(1)}" stroke="#4a2f18" stroke-width="2" fill="none"/>`
    : "";
  const inner = treeSvg.slice(treeSvg.indexOf(">") + 1, treeSvg.lastIndexOf("</svg>")).replace(/<ellipse[^>]*\/>/, "") + base;
  const cut = svg.indexOf("/>") + 2;
  return `${svg.slice(0, cut)}\n<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(4)})">${inner}</g>${svg.slice(cut)}`;
}
