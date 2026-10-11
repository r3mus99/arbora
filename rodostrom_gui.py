#!/usr/bin/env python3
"""rodostrom_gui.py - simple desktop window for rodostrom.py (Tkinter).

    python rodostrom_gui.py [subor.ged]

Pick a GEDCOM file, choose the root person from the list, set the options
and press "Vytvoriť PDF". The last used file and options are remembered in
~/.rodostrom_gui.json.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

import rodostrom as rs

SETTINGS_FILE = Path.home() / ".rodostrom_gui.json"

# (label shown in the window, value passed to rodostrom.generate)
CHOICES = {
    "lang": [("slovensky", "sk"), ("česky", "cs"), ("English", "en")],
    "labels": [("symboly  * ∞ †", "symbols"), ("skratky  nar. sob. zom.", "abbr")],
    "dates": [("len rok", "year"), ("celý dátum", "full")],
    "places": [("bez miest", "none"), ("len obec", "short"), ("celé miesto", "full")],
    "numbering": [("generácia (1, 2, 3…)", "generation"),
                  ("Ahnentafel (otec 2n, matka 2n+1)", "ahnentafel"), ("bez čísel", "none")],
    "marriage_on": [("pri otcovi", "father"), ("pri oboch rodičoch", "both"),
                    ("nezobrazovať", "none")],
    "page_size": [("A4", "a4"), ("A3", "a3"), ("A5", "a5"), ("Letter", "letter"),
                  ("Legal", "legal")],
    "orientation": [("na výšku", "portrait"), ("na šírku", "landscape")],
}
DEFAULTS = {"lang": "sk", "labels": "symbols", "dates": "year", "places": "none",
            "numbering": "generation", "marriage_on": "father", "page_size": "a4",
            "orientation": "portrait", "generations": 0, "font_size": 8.5,
            "repeat": False, "mother_first": False, "show_ids": False, "show_date": True,
            "open_after": True, "gedcom": "", "root": ""}


def load_settings() -> dict:
    data = dict(DEFAULTS)
    try:
        data.update(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        pass
    return data


def save_settings(data: dict) -> None:
    try:
        SETTINGS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1),
                                 encoding="utf-8")
    except OSError:
        pass


def open_file(path: str) -> None:
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except OSError:
        pass


def year_of(ev: rs.Event | None) -> str:
    return rs.format_date(ev.date, False, "sk") if ev and ev.date else ""


class App(tk.Tk):
    def __init__(self, initial_gedcom: str | None = None):
        super().__init__()
        self.title("Rodostrom – PDF z GEDCOM")
        self.minsize(760, 560)
        self.settings = load_settings()
        self.people: dict[str, rs.Person] = {}
        self.families: dict[str, rs.Family] = {}

        self.gedcom_var = tk.StringVar()
        self.search_var = tk.StringVar()
        self.output_var = tk.StringVar()
        self.title_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Vyberte GEDCOM súbor.")
        self.choice_vars: dict[str, tk.StringVar] = {}
        self.generations_var = tk.IntVar(value=int(self.settings["generations"]))
        self.font_size_var = tk.DoubleVar(value=float(self.settings["font_size"]))
        self.bool_vars = {k: tk.BooleanVar(value=bool(self.settings[k]))
                          for k in ("repeat", "mother_first", "show_ids", "show_date",
                                    "open_after")}
        self._output_touched = False

        self._build()
        path = initial_gedcom or self.settings.get("gedcom")
        if path and os.path.isfile(path):
            self.load_gedcom(path, select=self.settings.get("root") or None)

    # -- layout ------------------------------------------------------------
    def _build(self):
        pad = {"padx": 6, "pady": 3}
        root = ttk.Frame(self, padding=10)
        root.pack(fill="both", expand=True)
        root.columnconfigure(0, weight=1)
        root.rowconfigure(1, weight=1)

        # GEDCOM file
        f = ttk.Frame(root)
        f.grid(row=0, column=0, sticky="ew")
        f.columnconfigure(1, weight=1)
        ttk.Label(f, text="GEDCOM súbor:").grid(row=0, column=0, sticky="w", **pad)
        ttk.Entry(f, textvariable=self.gedcom_var, state="readonly").grid(
            row=0, column=1, sticky="ew", **pad)
        ttk.Button(f, text="Vybrať…", command=self.choose_gedcom).grid(row=0, column=2, **pad)

        # person list
        box = ttk.LabelFrame(root, text="Koreňová osoba (číslo 1)", padding=6)
        box.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        box.columnconfigure(0, weight=1)
        box.rowconfigure(1, weight=1)
        s = ttk.Frame(box)
        s.grid(row=0, column=0, columnspan=2, sticky="ew")
        s.columnconfigure(1, weight=1)
        ttk.Label(s, text="Hľadať:").grid(row=0, column=0, sticky="w")
        search = ttk.Entry(s, textvariable=self.search_var)
        search.grid(row=0, column=1, sticky="ew", padx=6)
        self.search_var.trace_add("write", lambda *_: self.refresh_list())
        self.count_label = ttk.Label(s, text="")
        self.count_label.grid(row=0, column=2, sticky="e")

        cols = ("id", "name", "birth", "death")
        self.tree = ttk.Treeview(box, columns=cols, show="headings", height=10,
                                 selectmode="browse")
        for col, text, width, stretch in (("id", "ID", 70, False), ("name", "Meno", 300, True),
                                          ("birth", "Narodenie", 90, False),
                                          ("death", "Úmrtie", 90, False)):
            self.tree.heading(col, text=text)
            self.tree.column(col, width=width, stretch=stretch)
        self.tree.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        sb = ttk.Scrollbar(box, orient="vertical", command=self.tree.yview)
        sb.grid(row=1, column=1, sticky="ns", pady=(6, 0))
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.bind("<<TreeviewSelect>>", lambda e: self.on_select())
        self.tree.bind("<Double-1>", lambda e: self.generate())

        # options
        opt = ttk.LabelFrame(root, text="Nastavenia", padding=6)
        opt.grid(row=2, column=0, sticky="ew", pady=(6, 0))
        for c in (1, 3):
            opt.columnconfigure(c, weight=1)
        rows = [("Jazyk:", "lang"), ("Popisky:", "labels"), ("Dátumy:", "dates"),
                ("Miesta:", "places"), ("Číslovanie:", "numbering"),
                ("Sobáš rodičov:", "marriage_on"), ("Formát strany:", "page_size"),
                ("Orientácia:", "orientation")]
        for i, (text, key) in enumerate(rows):
            r, c = divmod(i, 2)
            ttk.Label(opt, text=text).grid(row=r, column=c * 2, sticky="w", **pad)
            labels = [lbl for lbl, _ in CHOICES[key]]
            current = next((lbl for lbl, val in CHOICES[key]
                            if val == self.settings.get(key)), labels[0])
            var = tk.StringVar(value=current)
            self.choice_vars[key] = var
            ttk.Combobox(opt, textvariable=var, values=labels, state="readonly").grid(
                row=r, column=c * 2 + 1, sticky="ew", **pad)
        r = len(rows) // 2
        ttk.Label(opt, text="Generácie (0 = všetky):").grid(row=r, column=0, sticky="w", **pad)
        ttk.Spinbox(opt, from_=0, to=99, textvariable=self.generations_var, width=6).grid(
            row=r, column=1, sticky="w", **pad)
        ttk.Label(opt, text="Veľkosť písma:").grid(row=r, column=2, sticky="w", **pad)
        ttk.Spinbox(opt, from_=5, to=20, increment=0.5, textvariable=self.font_size_var,
                    width=6).grid(row=r, column=3, sticky="w", **pad)
        r += 1
        ttk.Label(opt, text="Nadpis (prázdne = automaticky):").grid(
            row=r, column=0, sticky="w", **pad)
        ttk.Entry(opt, textvariable=self.title_var).grid(
            row=r, column=1, columnspan=3, sticky="ew", **pad)
        r += 1
        checks = ttk.Frame(opt)
        checks.grid(row=r, column=0, columnspan=4, sticky="w")
        for key, text in (("repeat", "opakovaných predkov rozpísať znova"),
                          ("mother_first", "matka hore, otec dole"),
                          ("show_ids", "zobraziť ID"),
                          ("show_date", "dátum tlače v hlavičke")):
            ttk.Checkbutton(checks, text=text, variable=self.bool_vars[key]).pack(
                side="left", padx=6)

        # output + action
        out = ttk.Frame(root)
        out.grid(row=3, column=0, sticky="ew", pady=(6, 0))
        out.columnconfigure(1, weight=1)
        ttk.Label(out, text="Výstupný PDF:").grid(row=0, column=0, sticky="w", **pad)
        e = ttk.Entry(out, textvariable=self.output_var)
        e.grid(row=0, column=1, sticky="ew", **pad)
        e.bind("<Key>", lambda ev: setattr(self, "_output_touched", True))
        ttk.Button(out, text="Uložiť ako…", command=self.choose_output).grid(
            row=0, column=2, **pad)
        act = ttk.Frame(root)
        act.grid(row=4, column=0, sticky="ew", pady=(6, 0))
        act.columnconfigure(0, weight=1)
        ttk.Label(act, textvariable=self.status_var, foreground="#555").grid(
            row=0, column=0, sticky="w", padx=6)
        ttk.Checkbutton(act, text="po vytvorení otvoriť", variable=self.bool_vars["open_after"]
                        ).grid(row=0, column=1, padx=6)
        self.go = ttk.Button(act, text="Vytvoriť PDF", command=self.generate)
        self.go.grid(row=0, column=2, padx=6)
        self.bind("<Return>", lambda e: self.generate())

    # -- actions -----------------------------------------------------------
    def choose_gedcom(self):
        start = os.path.dirname(self.gedcom_var.get() or self.settings.get("gedcom") or "")
        path = filedialog.askopenfilename(
            title="Vyberte GEDCOM súbor", initialdir=start or None,
            filetypes=[("GEDCOM", "*.ged *.GED"), ("Všetky súbory", "*.*")])
        if path:
            self.load_gedcom(path)

    def load_gedcom(self, path: str, select: str | None = None):
        try:
            self.people, self.families = rs.load(path, True)
        except Exception as exc:  # noqa: BLE001 - show any parse problem to the user
            messagebox.showerror("Chyba", f"Súbor sa nepodarilo načítať:\n{exc}")
            return
        self.gedcom_var.set(path)
        self._output_touched = False
        self.search_var.set("")
        self.refresh_list()
        self.status_var.set(f"Načítaných {len(self.people)} osôb. Vyberte koreňovú osobu.")
        if select and select in self.people:
            self.tree.selection_set(select)
            self.tree.see(select)

    def refresh_list(self):
        self.tree.delete(*self.tree.get_children())
        found = rs.find_people(self.search_var.get(), self.people) \
            if self.search_var.get().strip() else list(self.people.values())
        for p in sorted(found, key=lambda p: rs.fold(p.name)):
            self.tree.insert("", "end", iid=p.id, values=(
                p.id.strip("@"), p.name or "?", year_of(p.birth), year_of(p.death)))
        self.count_label.configure(text=f"{len(found)} osôb")

    def selected(self) -> rs.Person | None:
        sel = self.tree.selection()
        return self.people.get(sel[0]) if sel else None

    def on_select(self):
        p = self.selected()
        if p and not self._output_touched:
            folder = os.path.dirname(self.gedcom_var.get()) or os.getcwd()
            self.output_var.set(os.path.join(folder, rs.default_output(p)))

    def choose_output(self):
        cur = self.output_var.get()
        path = filedialog.asksaveasfilename(
            title="Uložiť PDF", defaultextension=".pdf",
            initialdir=os.path.dirname(cur) or None, initialfile=os.path.basename(cur),
            filetypes=[("PDF", "*.pdf")])
        if path:
            self.output_var.set(path)
            self._output_touched = True

    def value(self, key: str) -> str:
        label = self.choice_vars[key].get()
        return next(val for lbl, val in CHOICES[key] if lbl == label)

    def generate(self):
        p = self.selected()
        if not self.people:
            messagebox.showinfo("Rodostrom", "Najprv vyberte GEDCOM súbor.")
            return
        if p is None:
            messagebox.showinfo("Rodostrom", "Vyberte v zozname koreňovú osobu.")
            return
        out = self.output_var.get().strip() or None
        try:
            generations = int(self.generations_var.get())
            font_size = float(self.font_size_var.get())
        except (tk.TclError, ValueError):
            messagebox.showerror("Chyba", "Počet generácií a veľkosť písma musia byť čísla.")
            return
        kw = {k: self.value(k) for k in CHOICES}
        flags = {k: v.get() for k, v in self.bool_vars.items()}
        self.status_var.set("Vytváram PDF…")
        self.configure(cursor="watch")
        self.update_idletasks()
        try:
            res = rs.generate(self.people, self.families, p.id, out,
                              generations=generations, font_size=font_size,
                              title=self.title_var.get().strip() or None,
                              repeat=flags["repeat"], mother_first=flags["mother_first"],
                              show_ids=flags["show_ids"], show_date=flags["show_date"], **kw)
        except Exception as exc:  # noqa: BLE001
            self.status_var.set("Nepodarilo sa vytvoriť PDF.")
            messagebox.showerror("Chyba", f"PDF sa nepodarilo vytvoriť:\n{exc}")
            return
        finally:
            self.configure(cursor="")
        msg = (f"Hotovo: {os.path.basename(res.output)} – {res.pages} strán, "
               f"{res.generations} generácií")
        if res.shrunk:
            msg += f", písmo zmenšené na {res.font_size:.1f} pt"
        self.status_var.set(msg)
        self.output_var.set(os.path.abspath(res.output))
        save_settings({**kw, **flags, "generations": generations, "font_size": font_size,
                       "gedcom": self.gedcom_var.get(), "root": p.id})
        if flags["open_after"]:
            open_file(res.output)


def main():
    App(sys.argv[1] if len(sys.argv) > 1 else None).mainloop()


if __name__ == "__main__":
    main()
