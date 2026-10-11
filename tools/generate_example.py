#!/usr/bin/env python3
"""Generate a fictional GEDCOM file for testing the rodostrom web page.

All people, dates and family links are random (seeded, so the output is
reproducible). The file deliberately contains the cases the chart has to
handle: missing parents, approximate dates (ABT/BEF), full and year-only
dates, a divorce, and pedigree collapse (one ancestral couple appears twice).

    python3 tools/generate_example.py -o docs/ukazka.ged
"""

from __future__ import annotations

import argparse
import random

MALE = ["Ján", "Jozef", "Štefan", "Michal", "Martin", "Ondrej", "Juraj", "Pavol",
        "Peter", "Anton", "Matej", "Tomáš", "Andrej", "Vincent", "Imrich", "Samuel"]
FEMALE = ["Anna", "Mária", "Zuzana", "Katarína", "Helena", "Terézia", "Agnesa",
          "Veronika", "Alžbeta", "Rozália", "Margita", "Johana", "Magdaléna", "Eva"]
SURNAMES = ["Lipták", "Hruška", "Kováč", "Mlynár", "Babič", "Ondruš", "Kolár", "Šimko",
            "Rybár", "Kmeť", "Bielik", "Pastorek", "Zelený", "Malý", "Hudec", "Sokol",
            "Krajč", "Javorek", "Paleta", "Tkáč", "Čierny", "Vrba", "Dubec", "Gálik"]
PLACES = ["Lipová Lehota", "Horná Ráztoka", "Dolné Brezovo", "Kamenná Lúka",
          "Javorník", "Nová Hôrka", "Stará Lesná Ves", "Vŕbovec", "Bukovina nad Váhom",
          "Malé Pole", "Sokolovce", "Medzibrod pri Rieke"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
CURRENT_YEAR = 2025


def female_surname(s: str) -> str:
    if s.endswith(("ý", "y")):
        return s[:-1] + "á"
    if s.endswith(("a", "o")):
        return s[:-1] + "ová"   # Hruška -> Hrušková, Šimko -> Šimková
    if s.endswith(("ec", "ek")):
        return s[:-2] + s[-1] + "ová"   # Dubec -> Dubcová, Javorek -> Javorková
    return s + "ová"


class Gen:
    def __init__(self, seed: int, generations: int):
        self.r = random.Random(seed)
        self.max_gen = generations
        self.people: dict[str, dict] = {}
        self.families: dict[str, dict] = {}

    # -- helpers -----------------------------------------------------------
    def date(self, year: int, depth: int) -> str:
        """Older generations get vaguer dates."""
        r = self.r.random()
        if depth >= 7 and r < 0.45:
            return f"ABT {year}"
        if depth >= 5 and r < 0.3:
            return str(year)
        if r < 0.1:
            return f"{MONTHS[self.r.randrange(12)]} {year}"
        return f"{self.r.randint(1, 28)} {MONTHS[self.r.randrange(12)]} {year}"

    def place(self) -> str:
        return f"{self.r.choice(PLACES)}, Slovensko"

    def person(self, sex: str, surname: str, born: int, depth: int) -> str:
        pid = f"I{len(self.people) + 1}"
        given = self.r.choice(MALE if sex == "M" else FEMALE)
        if sex == "F" and self.r.random() < 0.12:
            given += " " + self.r.choice(FEMALE)
        p = {"id": pid, "sex": sex, "given": given,
             "surname": surname if sex == "M" else female_surname(surname),
             "birth": (self.date(born, depth), self.place() if self.r.random() < 0.85 else ""),
             "famc": None, "fams": []}
        if depth >= 9 and self.r.random() < 0.3:
            p["birth"] = None  # nothing known about the oldest ones
        died = born + self.r.randint(35, 88)
        if died < CURRENT_YEAR:
            when = self.date(died, depth)
            if depth >= 6 and self.r.random() < 0.15:
                when = f"BEF {died}"
            p["death"] = (when, self.place() if self.r.random() < 0.6 else "")
        self.people[pid] = p
        return pid

    def family(self, husb: str | None, wife: str | None, married: int, depth: int) -> str:
        fid = f"F{len(self.families) + 1}"
        self.families[fid] = {"id": fid, "husb": husb, "wife": wife, "children": [],
                              "marr": (self.date(married, depth), self.place())
                              if self.r.random() < 0.85 else None, "div": False}
        for pid in (husb, wife):
            if pid:
                self.people[pid]["fams"].append(fid)
        return fid

    # -- tree --------------------------------------------------------------
    def ancestors(self, pid: str, born: int, depth: int, surname: str):
        """Create parents of `pid` (born in `born`), recursively."""
        if depth >= self.max_gen:
            return
        keep = 1.0 if depth < 4 else 0.93 - 0.06 * (depth - 4)
        has_f = self.r.random() < keep
        has_m = self.r.random() < keep
        if not (has_f or has_m):
            return
        f_born = born - self.r.randint(24, 38)
        m_born = born - self.r.randint(19, 32)
        father = self.person("M", surname, f_born, depth + 1) if has_f else None
        mother = None
        m_surname = self.r.choice(SURNAMES)
        if has_m:
            mother = self.person("F", m_surname, m_born, depth + 1)
        fid = self.family(father, mother, born - self.r.randint(1, 3), depth + 1)
        self.families[fid]["children"].append(pid)
        self.people[pid]["famc"] = fid
        if father:
            self.ancestors(father, f_born, depth + 1, surname)
        if mother:
            self.ancestors(mother, m_born, depth + 1, m_surname)

    def build(self) -> str:
        surname = self.r.choice(SURNAMES)
        root = self.person("M", surname, 1994, 1)
        self.people[root]["given"] = "Adam"
        self.ancestors(root, 1994, 1, surname)

        # a divorce: the root's parents
        self.families[self.people[root]["famc"]]["div"] = True

        # pedigree collapse: a 5th-generation man on the mother's side becomes a
        # brother of a 5th-generation woman on the father's side, so their
        # parents appear in both halves of the chart
        def line(pid, path):
            for step in path:
                fam = self.families[self.people[pid]["famc"]]
                pid = fam["husb"] if step == "f" else fam["wife"]
            return pid
        try:
            a = line(root, "ffmm")   # father's side, gen 5, female, has parents
            b = line(root, "mmff")   # mother's side, gen 5, male
            fam_a = self.people[a]["famc"]
            if fam_a and b:
                old = self.people[b]["famc"]
                if old:
                    self.families[old]["children"].remove(b)
                self.people[b]["famc"] = fam_a
                self.people[b]["surname"] = self.people[self.families[fam_a]["husb"]]["surname"]
                self.families[fam_a]["children"].append(b)
                year = int(self.people[a]["birth"][0].split()[-1]) + self.r.randint(2, 6)
                self.people[b]["birth"] = (self.date(year, 5), self.place())
        except (KeyError, TypeError):
            pass
        return root

    # -- output ------------------------------------------------------------
    def gedcom(self) -> str:
        out = ["0 HEAD", "1 SOUR rodostrom-example", "2 NAME rodostrom example generator",
               "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8",
               "1 NOTE Fiktívne osoby vygenerované náhodne / fictional people, random data"]
        for p in self.people.values():
            out += [f"0 @{p['id']}@ INDI", f"1 NAME {p['given']} /{p['surname']}/",
                    f"2 GIVN {p['given']}", f"2 SURN {p['surname']}", f"1 SEX {p['sex']}"]
            for tag, ev in (("BIRT", p.get("birth")), ("DEAT", p.get("death"))):
                if ev:
                    out.append(f"1 {tag}")
                    out.append(f"2 DATE {ev[0]}")
                    if ev[1]:
                        out.append(f"2 PLAC {ev[1]}")
            if p["famc"]:
                out.append(f"1 FAMC @{p['famc']}@")
            out += [f"1 FAMS @{f}@" for f in p["fams"]]
        for f in self.families.values():
            out.append(f"0 @{f['id']}@ FAM")
            if f["husb"]:
                out.append(f"1 HUSB @{f['husb']}@")
            if f["wife"]:
                out.append(f"1 WIFE @{f['wife']}@")
            out += [f"1 CHIL @{c}@" for c in f["children"]]
            if f["marr"]:
                out += ["1 MARR", f"2 DATE {f['marr'][0]}", f"2 PLAC {f['marr'][1]}"]
            if f["div"]:
                out.append("1 DIV Y")
        out.append("0 TRLR")
        return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("-o", "--output", default="docs/ukazka.ged")
    ap.add_argument("--seed", type=int, default=1848)
    ap.add_argument("-g", "--generations", type=int, default=10)
    a = ap.parse_args()
    g = Gen(a.seed, a.generations)
    root = g.build()
    with open(a.output, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(g.gedcom())
    p = g.people[root]
    print(f"{a.output}: {len(g.people)} osôb, {len(g.families)} rodín, "
          f"koreň {p['id']} {p['given']} {p['surname']}")


if __name__ == "__main__":
    main()
