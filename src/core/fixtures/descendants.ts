/** Made-up descendants for tests and measurements: `shape(generation, index)` says how many partners and children the index-th person of a generation has (the root is generation 1, index 0). The partners get no families of their own. */
export type Shape = (gen: number, index: number) => { partners: number; children: number };

export function descendantsGed(shape: Shape, maxGen = 6): string {
  let n = 0;
  const people = new Map<string, string>(), fams: string[] = [];
  const person = (gen: number, sex: "M" | "F", born: number) => {
    const id = `@I${++n}@`;
    people.set(id, `0 ${id} INDI\n1 NAME Name${n} /Family${gen}/\n1 SEX ${sex}\n1 BIRT\n2 DATE ${born}\n2 PLAC Town${n % 7}\n`);
    return id;
  };
  const add = (id: string, line: string) => people.set(id, people.get(id)! + line);
  const counter = new Map<number, number>();
  const grow = (id: string, gen: number, born: number, sex: "M" | "F") => {
    const index = counter.get(gen) ?? 0;
    counter.set(gen, index + 1);
    const { partners, children } = shape(gen, index);
    // a person with children but no partner has one family with no other spouse
    for (let k = 0; k < Math.max(partners, children && gen < maxGen ? 1 : 0); k++) {
      const partner = k < partners ? person(gen, sex === "M" ? "F" : "M", born + (k % 3) - 1) : null;
      const fam = `@F${fams.length + 1}@`;
      const count = gen >= maxGen ? 0 : k === 0 ? children : Math.floor(children / 2);
      const kids = Array.from({ length: count }, (_, c) => ({ id: person(gen + 1, c % 2 ? "M" : "F", born + 25 + c), born: born + 25 + c, sex: (c % 2 ? "M" : "F") as "M" | "F" }));
      fams.push(`0 ${fam} FAM\n1 ${sex === "M" ? "HUSB" : "WIFE"} ${id}\n${partner ? `1 ${sex === "M" ? "WIFE" : "HUSB"} ${partner}\n1 MARR\n2 DATE ${born + 22}\n` : ""}${kids.map((c) => `1 CHIL ${c.id}\n`).join("")}`);
      add(id, `1 FAMS ${fam}\n`);
      if (partner) add(partner, `1 FAMS ${fam}\n`);
      for (const c of kids) {
        add(c.id, `1 FAMC ${fam}\n`);
        grow(c.id, gen + 1, c.born, c.sex);
      }
    }
  };
  const root = person(1, "M", 1800);
  grow(root, 1, 1800, "M");
  return `0 HEAD\n${[...people.values()].join("")}${fams.join("")}0 TRLR\n`;
}
