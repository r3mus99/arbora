#!/usr/bin/env python3
"""rodostrom.py - generate a printable ancestor (pedigree) chart PDF from a GEDCOM file.

The chart is laid out sideways: the root person (no. 1) is at the left edge,
every further generation is indented one step to the right, the father's
line is drawn above a person and the mother's line below. Each line reads
"<number>. <name> (<birth>, <marriage>, <death>)".

Only dependency: reportlab  (pip install reportlab)
"""

from __future__ import annotations

import argparse
import datetime as _dt
import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field

try:
    from reportlab.lib import pagesizes
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas
except ImportError:  # pragma: no cover
    sys.exit("Chýba knižnica reportlab / reportlab is missing:\n    python3 -m pip install reportlab   (Windows: py -m pip install reportlab)")

__version__ = "1.0.0"

# ---------------------------------------------------------------------------
# Texts per language
# ---------------------------------------------------------------------------

TEXTS = {
    "sk": {
        "title": "Predkovia: {name}",
        "page": "Strana {n} z {total}",
        "see": "pozri str. {page}",
        "abbr": {"birt": "nar. ", "marr": "sob. ", "deat": "zom. "},
        "qual": {"ABT": "cca ", "EST": "cca ", "CAL": "cca ", "BEF": "pred ", "AFT": "po "},
        "divorced": "rozv.",
        "unknown": "?",
        "months": None,
    },
    "cs": {
        "title": "Předkové: {name}",
        "page": "Strana {n} z {total}",
        "see": "viz str. {page}",
        "abbr": {"birt": "nar. ", "marr": "odd. ", "deat": "zem. "},
        "qual": {"ABT": "asi ", "EST": "asi ", "CAL": "asi ", "BEF": "před ", "AFT": "po "},
        "divorced": "rozv.",
        "unknown": "?",
        "months": None,
    },
    "en": {
        "title": "Ancestors of {name}",
        "page": "Page {n} of {total}",
        "see": "see p. {page}",
        "abbr": {"birt": "b. ", "marr": "m. ", "deat": "d. "},
        "qual": {"ABT": "abt ", "EST": "abt ", "CAL": "abt ", "BEF": "bef ", "AFT": "aft "},
        "divorced": "div.",
        "unknown": "?",
        "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
}
SYMBOLS = {"birt": "*", "marr": "\u221e", "deat": "\u2020"}  # *  ∞  †
MONTHS = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}

# ---------------------------------------------------------------------------
# GEDCOM parsing
# ---------------------------------------------------------------------------


@dataclass
class Node:
    tag: str
    value: str = ""
    xref: str | None = None
    children: list["Node"] = field(default_factory=list)

    def first(self, *path: str) -> "Node | None":
        node: Node | None = self
        for tag in path:
            node = next((c for c in node.children if c.tag == tag), None)
            if node is None:
                return None
        return node

    def all(self, tag: str) -> list["Node"]:
        return [c for c in self.children if c.tag == tag]


@dataclass
class Event:
    date: str = ""
    place: str = ""


@dataclass
class Person:
    id: str
    name: str
    sex: str = ""
    birth: Event | None = None
    death: Event | None = None
    famc: list[str] = field(default_factory=list)


@dataclass
class Family:
    id: str
    husb: str | None = None
    wife: str | None = None
    marriage: Event | None = None
    divorced: bool = False


LINE_RE = re.compile(r"^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$")


def read_gedcom_text(path: str) -> str:
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "utf-16", "cp1250", "latin-1"):
        try:
            text = raw.decode(enc)
        except UnicodeDecodeError:
            continue
        if enc == "utf-16" and "HEAD" not in text[:200]:
            continue
        return text
    return raw.decode("latin-1")


def parse_gedcom(path: str) -> list[Node]:
    records: list[Node] = []
    stack: list[Node] = []
    for line in read_gedcom_text(path).splitlines():
        m = LINE_RE.match(line)
        if not m:
            continue
        level = int(m.group(1))
        node = Node(tag=m.group(3).upper(), value=(m.group(4) or "").strip(),
                    xref=m.group(2))
        if node.tag in ("CONC", "CONT") and stack:
            parent = stack[min(level, len(stack)) - 1]
            parent.value += ("\n" if node.tag == "CONT" else "") + node.value
            continue
        del stack[level:]
        if level == 0:
            records.append(node)
        elif stack:
            stack[-1].children.append(node)
        stack.append(node)
    return records


def clean_name(value: str) -> str:
    # "Ján /Kováč/" -> "Ján Kováč";  "Anna //" -> "Anna"
    name = value.replace("/", " ")
    return re.sub(r"\s+", " ", name).strip()


def event_of(rec: Node, *tags: str) -> Event | None:
    for tag in tags:
        ev = rec.first(tag)
        if ev is None:
            continue
        date = ev.first("DATE")
        place = ev.first("PLAC")
        e = Event(date.value if date else "", place.value if place else "")
        if e.date or e.place:
            return e
    return None


def load(path: str, fallback_events: bool) -> tuple[dict[str, Person], dict[str, Family]]:
    people: dict[str, Person] = {}
    families: dict[str, Family] = {}
    birth_tags = ("BIRT", "CHR", "BAPM") if fallback_events else ("BIRT",)
    death_tags = ("DEAT", "BURI", "CREM") if fallback_events else ("DEAT",)
    for rec in parse_gedcom(path):
        if rec.tag == "INDI" and rec.xref:
            name_node = rec.first("NAME")
            name = clean_name(name_node.value) if name_node else ""
            if name_node and not name:
                given = name_node.first("GIVN")
                surn = name_node.first("SURN")
                name = " ".join(n.value for n in (given, surn) if n)
            sex = rec.first("SEX")
            famc = rec.all("FAMC")
            # prefer the birth family when PEDI says so
            famc.sort(key=lambda n: 0 if (n.first("PEDI") is None
                                          or n.first("PEDI").value.lower() == "birth") else 1)
            people[rec.xref] = Person(
                id=rec.xref, name=name, sex=sex.value.upper() if sex else "",
                birth=event_of(rec, *birth_tags), death=event_of(rec, *death_tags),
                famc=[n.value for n in famc if n.value])
        elif rec.tag == "FAM" and rec.xref:
            h, w = rec.first("HUSB"), rec.first("WIFE")
            families[rec.xref] = Family(
                id=rec.xref, husb=h.value if h else None, wife=w.value if w else None,
                marriage=event_of(rec, "MARR"),
                divorced=rec.first("DIV") is not None)
    return people, families


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

DATE_RE = re.compile(r"(?:(\d{1,2})\s+)?(?:([A-Z]{3})\s+)?(\d{3,4})\b")
ISO_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


def format_date(raw: str, full: bool, lang: str) -> str:
    t = TEXTS[lang]
    s = raw.upper().strip()
    if not s:
        return ""
    if s.startswith("(") and s.endswith(")"):  # date phrase
        return raw.strip("() ")

    def one(part: str) -> str:
        iso = ISO_RE.search(part)
        if iso:
            y, mo, d = int(iso.group(1)), int(iso.group(2)), int(iso.group(3))
        else:
            m = DATE_RE.search(part)
            if not m:
                return part.strip().title()
            d = int(m.group(1)) if m.group(1) else None
            mo = MONTHS.get(m.group(2) or "")
            y = int(m.group(3))
        if not full or not mo:
            return str(y)
        if t["months"]:
            return f"{d} {t['months'][mo - 1]} {y}" if d else f"{t['months'][mo - 1]} {y}"
        return f"{d}.{mo}.{y}" if d else f"{mo}/{y}"

    qual = ""
    for key, word in t["qual"].items():
        if s.startswith(key + " "):
            qual, s = word, s[len(key) + 1:]
            break
    rng = re.match(r"(?:BET|FROM)\s+(.+?)\s+(?:AND|TO)\s+(.+)", s)
    if rng:
        a, b = one(rng.group(1)), one(rng.group(2))
        return a if a == b else f"{a}\u2013{b}"
    s = re.sub(r"^(FROM|TO|INT)\s+", "", s)
    s = re.sub(r"\s*\(.*\)$", "", s)
    return qual + one(s)


def format_place(raw: str, mode: str) -> str:
    if mode == "none" or not raw:
        return ""
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        return ""
    return parts[0] if mode == "short" else ", ".join(parts)


@dataclass
class Options:
    lang: str = "sk"
    labels: str = "symbols"     # symbols | abbr
    dates: str = "year"         # year | full
    places: str = "none"        # none | short | full
    numbering: str = "generation"  # generation | ahnentafel | none
    marriage_on: str = "father"    # father | both | none
    show_ids: bool = False


def label(kind: str, opt: Options) -> str:
    return SYMBOLS[kind] if opt.labels == "symbols" else TEXTS[opt.lang]["abbr"][kind]


def format_event(kind: str, ev: Event | None, opt: Options, extra: str = "") -> str:
    if ev is None and not extra:
        return ""
    date = format_date(ev.date, opt.dates == "full", opt.lang) if ev else ""
    place = format_place(ev.place, opt.places) if ev else ""
    body = " ".join(x for x in (date, place) if x)
    if extra:
        body = f"{body} ({extra})" if body else extra
    return f"{label(kind, opt)}{body}" if body else ""


def person_line(p: Person | None, number: int | None, marriage: Family | None,
                opt: Options) -> str:
    t = TEXTS[opt.lang]
    name = (p.name if p and p.name else t["unknown"])
    if p and opt.show_ids:
        name += f" [{p.id.strip('@')}]"
    bits = []
    if p:
        bits.append(format_event("birt", p.birth, opt))
    if marriage is not None:
        bits.append(format_event("marr", marriage.marriage, opt,
                                 t["divorced"] if marriage.divorced else ""))
    if p:
        bits.append(format_event("deat", p.death, opt))
    bits = [b for b in bits if b]
    text = f"{number}. {name}" if number is not None else name
    if bits:
        text += " (" + ", ".join(bits) + ")"
    return text


# ---------------------------------------------------------------------------
# Building the chart rows
# ---------------------------------------------------------------------------


@dataclass
class Row:
    gen: int
    text: str
    person_id: str
    dup: bool = False                     # already printed elsewhere
    father_row: int | None = None
    mother_row: int | None = None
    page: int = 0


def build_rows(root: str, people: dict[str, Person], families: dict[str, Family],
               opt: Options, max_gen: int, repeat: bool, mother_first: bool) -> list[Row]:
    rows: list[Row] = []
    expanded: dict[str, Row] = {}
    first_row: dict[str, Row] = {}

    def visit(pid: str, gen: int, ahnen: int, child_fam: Family | None,
              ancestors: frozenset) -> int:
        p = people[pid]
        fam = families.get(p.famc[0]) if p.famc else None
        father = fam.husb if fam and fam.husb in people else None
        mother = fam.wife if fam and fam.wife in people else None
        if gen >= max_gen:
            father = mother = None
        dup = pid in expanded and not repeat
        if dup or pid in ancestors:  # pedigree collapse or a broken (cyclic) file
            father = mother = None

        marr = None
        if child_fam is not None and opt.marriage_on != "none":
            is_father = child_fam.husb == pid
            has_father = child_fam.husb in people
            if opt.marriage_on == "both" or is_father or not has_father:
                marr = child_fam

        if opt.numbering == "generation":
            number = gen
        elif opt.numbering == "ahnentafel":
            number = ahnen
        else:
            number = None
        row = Row(gen=gen, text=person_line(p, number, marr, opt), person_id=pid,
                  dup=bool(dup))
        if not dup:
            expanded.setdefault(pid, row)
        first_row.setdefault(pid, row)

        anc = ancestors | {pid}
        order = [(mother, 2 * ahnen + 1, "m"), (father, 2 * ahnen, "f")] if mother_first \
            else [(father, 2 * ahnen, "f"), (mother, 2 * ahnen + 1, "m")]
        idx_self = None
        for i, (par, num, which) in enumerate(order):
            if i == 1:
                rows.append(row)
                idx_self = len(rows) - 1
            if par:
                r = visit(par, gen + 1, num, fam, anc)
                if which == "f":
                    row.father_row = r
                else:
                    row.mother_row = r
        if idx_self is None:
            rows.append(row)
            idx_self = len(rows) - 1
        return idx_self

    visit(root, 1, 1, None, frozenset())
    # remember which row holds the expanded copy of each duplicated person
    for r in rows:
        r._target = expanded.get(r.person_id) if r.dup else None  # type: ignore[attr-defined]
    return rows


# ---------------------------------------------------------------------------
# PDF rendering
# ---------------------------------------------------------------------------

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]
BOLD_GUESSES = [("DejaVuSans.ttf", "DejaVuSans-Bold.ttf"),
                ("LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"),
                ("NotoSans-Regular.ttf", "NotoSans-Bold.ttf"),
                ("arial.ttf", "arialbd.ttf"), ("Arial.ttf", "Arial Bold.ttf"),
                ("segoeui.ttf", "segoeuib.ttf")]


def register_fonts(font_path: str | None) -> tuple[str, str]:
    paths = [font_path] if font_path else FONT_CANDIDATES
    for path in paths:
        if path and os.path.isfile(path):
            pdfmetrics.registerFont(TTFont("Chart", path))
            bold = "Chart"
            folder, base = os.path.split(path)
            for reg, bld in BOLD_GUESSES:
                cand = os.path.join(folder, bld)
                if base == reg and os.path.isfile(cand):
                    pdfmetrics.registerFont(TTFont("Chart-Bold", cand))
                    bold = "Chart-Bold"
            return "Chart", bold
    if font_path:
        sys.exit(f"Font sa nenašiel / font not found: {font_path}")
    print("Upozornenie: nenašiel sa TTF font, diakritika sa nemusí zobraziť. "
          "Použite --font cesta/k/fontu.ttf", file=sys.stderr)
    return "Helvetica", "Helvetica-Bold"


@dataclass
class Layout:
    page_w: float
    page_h: float
    margin: float
    font: str
    bold: str
    size: float
    step: float
    line_h: float
    top: float = 0.0       # y of the first row's baseline
    bottom: float = 0.0    # lowest allowed baseline
    per_page: int = 0

    def __post_init__(self):
        header = self.size * 1.6 + 22
        self.top = self.page_h - self.margin - header
        self.bottom = self.margin + 14
        self.per_page = max(1, int((self.top - self.bottom) // self.line_h) + 1)

    @property
    def tick(self) -> float:
        return min(10.0, self.step * 0.6)

    def x(self, gen: int) -> float:
        return self.margin + (gen - 1) * self.step

    def text_x(self, gen: int) -> float:
        return self.x(gen) + (self.tick + 2 if gen > 1 else 0)

    def y(self, row: int) -> float:
        return self.top - (row % self.per_page) * self.line_h


def fit_layout(rows: list[Row], base: Layout, see_text: str) -> Layout:
    """Shrink indent and then font size until the widest line fits on the page."""
    lay = base
    for _ in range(200):
        width = max(lay.text_x(r.gen) +
                    pdfmetrics.stringWidth(r.text + (f" ({see_text})" if r.dup else ""),
                                           lay.font, lay.size) for r in rows)
        if width <= lay.page_w - lay.margin:
            return lay
        if lay.step > lay.size * 1.8:
            step = max(lay.size * 1.8, lay.step * 0.92)
            size = lay.size
        elif lay.size > 5:
            size = max(5.0, lay.size - 0.25)
            step = size * 1.8
        else:
            print("Upozornenie: niektoré riadky presahujú okraj strany; skúste --orientation "
                  "landscape, väčší formát alebo menej generácií.", file=sys.stderr)
            return lay
        lay = Layout(lay.page_w, lay.page_h, lay.margin, lay.font, lay.bold, size, step,
                     size * base.line_h / base.size)
    return lay


def render(rows: list[Row], out: str, title: str, lang: str, lay: Layout,
           show_date: bool, line_width: float) -> int:
    t = TEXTS[lang]
    total = (len(rows) - 1) // lay.per_page + 1
    for i, r in enumerate(rows):
        r.page = i // lay.per_page + 1
    c = canvas.Canvas(out, pagesize=(lay.page_w, lay.page_h))
    c.setTitle(title)
    c.setCreator(f"rodostrom.py {__version__}")
    mid = lay.size * 0.32  # offset from baseline to the middle of lowercase letters
    gap = lay.line_h * 0.45  # keep vertical lines clear of a person's own text

    by_page: dict[int, list[int]] = {}
    for i in range(len(rows)):
        by_page.setdefault(i // lay.per_page, []).append(i)

    def page_y_range(page: int) -> tuple[float, float]:
        return lay.y(page * lay.per_page) + lay.line_h * 0.5, \
            lay.y(page * lay.per_page + lay.per_page - 1) - lay.line_h * 0.5

    def vline(x: float, row_a: int, row_b: int, page: int, trim_a: float, trim_b: float):
        """Draw the part of a vertical line between two rows that lies on `page`."""
        top_lim, bot_lim = page_y_range(page)
        pa, pb = row_a // lay.per_page, row_b // lay.per_page
        if not (pa <= page <= pb):
            return
        y1 = lay.y(row_a) + mid - trim_a if pa == page else top_lim
        y2 = lay.y(row_b) + mid + trim_b if pb == page else bot_lim
        if y1 > y2:
            c.line(x, y1, x, y2)

    today = _dt.date.today()
    date_str = (today.strftime("%d %b %Y") if lang == "en"
                else f"{today.day}.{today.month}.{today.year}")

    for page in range(total):
        # header
        c.setFont(lay.bold, lay.size * 1.6)
        c.drawCentredString(lay.page_w / 2, lay.page_h - lay.margin - lay.size * 1.6, title)
        c.setFont(lay.font, lay.size * 0.85)
        if show_date:
            c.drawString(lay.margin, lay.page_h - lay.margin - lay.size * 1.6 - 6, date_str)
        c.drawRightString(lay.page_w - lay.margin, lay.margin - 2,
                          t["page"].format(n=page + 1, total=total))
        hy = lay.page_h - lay.margin - lay.size * 1.6 - 9
        c.setLineWidth(1.2)
        c.line(lay.margin, hy, lay.page_w - lay.margin, hy)
        c.line(lay.margin, hy - 2, lay.page_w - lay.margin, hy - 2)

        c.setLineWidth(line_width)
        c.setFont(lay.font, lay.size)
        for i in by_page.get(page, []):
            r = rows[i]
            y = lay.y(i)
            if r.gen > 1:
                c.line(lay.x(r.gen), y + mid, lay.x(r.gen) + lay.tick, y + mid)
            text = r.text
            if r.dup:
                target = getattr(r, "_target", None)
                if target is not None:
                    text += f"  ({t['see'].format(page=target.page)})"
            c.drawString(lay.text_x(r.gen), y, text)

        # vertical connectors: from a person's father down to the mother,
        # interrupted around the person's own line
        for i, r in enumerate(rows):
            xv = lay.x(r.gen + 1)
            if r.father_row is not None:
                vline(xv, r.father_row, i, page, 0, gap)
            if r.mother_row is not None:
                vline(xv, i, r.mother_row, page, gap, 0)
        c.showPage()
    c.save()
    return total


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def fold(s: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", s.lower())
                   if not unicodedata.combining(ch))


def describe(p: Person) -> str:
    b = p.birth.date if p.birth else ""
    d = p.death.date if p.death else ""
    years = f" ({b}{' - ' + d if d else ''})" if b or d else ""
    return f"  {p.id.strip('@'):>8}  {p.name}{years}"


def find_people(query: str, people: dict[str, Person]) -> list[Person]:
    q = query.strip()
    key = q if q.startswith("@") else f"@{q}@"
    if key in people:
        return [people[key]]
    words = fold(q).split()
    return [p for p in people.values() if all(w in fold(p.name) for w in words)]


PAGE_SIZES = {"a4": pagesizes.A4, "a3": pagesizes.A3, "a5": pagesizes.A5,
              "letter": pagesizes.LETTER, "legal": pagesizes.LEGAL}


@dataclass
class Result:
    output: str
    rows: int
    generations: int
    pages: int
    font_size: float
    shrunk: bool


def default_output(root: Person) -> str:
    return re.sub(r"[^\w.-]+", "_", fold(root.name)) + "_rodostrom.pdf"


def generate(people: dict[str, Person], families: dict[str, Family], root_id: str,
             output: str | None = None, *, generations: int = 0, lang: str = "sk",
             labels: str = "symbols", dates: str = "year", places: str = "none",
             numbering: str = "generation", marriage_on: str = "father",
             repeat: bool = False, mother_first: bool = False, show_ids: bool = False,
             title: str | None = None, show_date: bool = True, page_size: str = "a4",
             orientation: str = "portrait", font_size: float = 8.5,
             line_height: float = 1.7, indent: float = 0, margin: float = 36,
             font: str | None = None) -> Result:
    """Build the chart for `root_id` and write it to `output`. Used by the CLI and the GUI."""
    root = people[root_id]
    opt = Options(lang=lang, labels=labels, dates=dates, places=places,
                  numbering=numbering, marriage_on=marriage_on, show_ids=show_ids)
    rows = build_rows(root.id, people, families, opt, generations or 10_000,
                      repeat, mother_first)
    w, h = PAGE_SIZES[page_size]
    if orientation == "landscape":
        w, h = max(w, h), min(w, h)
    font_name, bold = register_fonts(font)
    step = indent or font_size * 2.6
    base = Layout(w, h, margin, font_name, bold, font_size, step, font_size * line_height)
    lay = fit_layout(rows, base, TEXTS[lang]["see"].format(page=99)) if not indent else base
    title = title or TEXTS[lang]["title"].format(name=root.name)
    out = output or default_output(root)
    pages = render(rows, out, title, lang, lay, show_date, 0.6)
    return Result(out, len(rows), max(r.gen for r in rows), pages, lay.size,
                  lay.size < font_size * 0.85)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Generate an ancestor chart PDF from a GEDCOM file "
                    "(root = 1, father above, mother below).")
    ap.add_argument("gedcom", help="input .ged file")
    ap.add_argument("-p", "--person",
                    help="root person: GEDCOM ID (e.g. I1) or part of the name")
    ap.add_argument("-o", "--output", help="output PDF (default: <name>_rodostrom.pdf)")
    ap.add_argument("--find", metavar="TEXT", help="list people matching TEXT and exit")
    ap.add_argument("-g", "--generations", type=int, default=0,
                    help="max generations incl. the root (0 = all, default)")
    ap.add_argument("--lang", choices=sorted(TEXTS), default="sk", help="chart language")
    ap.add_argument("--labels", choices=["symbols", "abbr"], default="symbols",
                    help="symbols: * ∞ †   abbr: nar./sob./zom. (b./m./d.)")
    ap.add_argument("--dates", choices=["year", "full"], default="year",
                    help="year only (default) or full date")
    ap.add_argument("--places", choices=["none", "short", "full"], default="none",
                    help="show places: none, first part only, or full")
    ap.add_argument("--numbering", choices=["generation", "ahnentafel", "none"],
                    default="generation",
                    help="number = generation (root 1, parents 2...) or Ahnentafel (Kekule)")
    ap.add_argument("--marriage-on", choices=["father", "both", "none"], default="father",
                    help="on which parent's line to print the parents' marriage")
    ap.add_argument("--no-fallback-events", action="store_true",
                    help="do not use baptism/burial when birth/death is missing")
    ap.add_argument("--repeat", action="store_true",
                    help="expand repeated ancestors again instead of a page reference")
    ap.add_argument("--mother-first", action="store_true", help="mother above, father below")
    ap.add_argument("--show-ids", action="store_true", help="print GEDCOM IDs after names")
    ap.add_argument("--title", help="custom title")
    ap.add_argument("--no-date", action="store_true", help="omit the print date in the header")
    ap.add_argument("--page-size", choices=sorted(PAGE_SIZES), default="a4")
    ap.add_argument("--orientation", choices=["portrait", "landscape"], default="portrait")
    ap.add_argument("--font-size", type=float, default=8.5)
    ap.add_argument("--line-height", type=float, default=1.7,
                    help="row height as a multiple of the font size")
    ap.add_argument("--indent", type=float, default=0,
                    help="indent per generation in points (default: auto)")
    ap.add_argument("--margin", type=float, default=36, help="page margin in points")
    ap.add_argument("--font", help="path to a .ttf font (default: auto-detect)")
    ap.add_argument("--version", action="version", version=__version__)
    a = ap.parse_args(argv)

    people, families = load(a.gedcom, not a.no_fallback_events)
    if not people:
        sys.exit("V súbore nie sú žiadne osoby / no individuals found.")

    if a.find:
        for p in sorted(find_people(a.find, people), key=lambda p: p.name):
            print(describe(p))
        return 0
    if not a.person:
        ap.error("zadajte koreňovú osobu cez --person (ID alebo meno); "
                 "na hľadanie použite --find")
    matches = find_people(a.person, people)
    if not matches:
        sys.exit(f"Osoba '{a.person}' sa nenašla. Skúste --find.")
    if len(matches) > 1:
        print(f"'{a.person}' zodpovedá viacerým osobám, zadajte ID:", file=sys.stderr)
        for p in matches:
            print(describe(p), file=sys.stderr)
        return 2
    root = matches[0]

    res = generate(people, families, root.id, a.output, generations=a.generations,
                   lang=a.lang, labels=a.labels, dates=a.dates, places=a.places,
                   numbering=a.numbering, marriage_on=a.marriage_on, repeat=a.repeat,
                   mother_first=a.mother_first, show_ids=a.show_ids, title=a.title,
                   show_date=not a.no_date, page_size=a.page_size,
                   orientation=a.orientation, font_size=a.font_size,
                   line_height=a.line_height, indent=a.indent, margin=a.margin,
                   font=a.font)
    print(f"{res.output}: {res.rows} riadkov, {res.generations} generácií, "
          f"{res.pages} strán (písmo {res.font_size:.2f} pt)")
    if res.shrunk:
        print("Tip: písmo bolo zmenšené, aby sa riadky zmestili; pre väčšie písmo skúste "
              "--orientation landscape, --page-size a3 alebo --places short.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
