/*
 * rodostrom.js - ancestor (pedigree) chart PDF from a GEDCOM file, in the browser.
 *
 * The root person (no. 1) is at the left edge, every further generation is
 * indented to the right, the father's line is drawn above a person and the
 * mother's below. Each line reads "<number>. <name> (<birth>, <marriage>, <death>)".
 *
 * Needs pdf-lib and @pdf-lib/fontkit (globals PDFLib and fontkit in the browser,
 * or passed to generate() in Node).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Rodostrom = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TEXTS = {
    sk: {
      title: "Predkovia: {name}", page: "Strana {n} z {total}", see: "pozri str. {page}",
      abbr: { birt: "nar. ", marr: "sob. ", deat: "zom. " },
      qual: { ABT: "cca ", EST: "cca ", CAL: "cca ", BEF: "pred ", AFT: "po " },
      divorced: "rozv.", unknown: "?", months: null,
    },
    cs: {
      title: "Předkové: {name}", page: "Strana {n} z {total}", see: "viz str. {page}",
      abbr: { birt: "nar. ", marr: "odd. ", deat: "zem. " },
      qual: { ABT: "asi ", EST: "asi ", CAL: "asi ", BEF: "před ", AFT: "po " },
      divorced: "rozv.", unknown: "?", months: null,
    },
    en: {
      title: "Ancestors of {name}", page: "Page {n} of {total}", see: "see p. {page}",
      abbr: { birt: "b. ", marr: "m. ", deat: "d. " },
      qual: { ABT: "abt ", EST: "abt ", CAL: "abt ", BEF: "bef ", AFT: "aft " },
      divorced: "div.", unknown: "?",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
  };
  const SYMBOLS = { birt: "*", marr: "∞", deat: "†" };
  const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
                   JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  // page sizes in points (portrait)
  const PAGE_SIZES = { a4: [595.2756, 841.8898], a3: [841.8898, 1190.5512],
                       a5: [419.5276, 595.2756], letter: [612, 792], legal: [612, 1008] };

  const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

  // ---------------------------------------------------------------- GEDCOM

  function decode(bytes) {
    if (typeof bytes === "string") return bytes;
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8[0] === 0xff && u8[1] === 0xfe) return new TextDecoder("utf-16le").decode(u8);
    if (u8[0] === 0xfe && u8[1] === 0xff) return new TextDecoder("utf-16be").decode(u8);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(u8).replace(/^﻿/, "");
    } catch (e) {
      return new TextDecoder("windows-1250").decode(u8);
    }
  }

  const LINE_RE = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/;

  function parseGedcom(text) {
    const records = [];
    const stack = [];
    for (const line of text.split(/\r\n|\r|\n/)) {
      const m = LINE_RE.exec(line);
      if (!m) continue;
      const level = parseInt(m[1], 10);
      const node = { tag: m[3].toUpperCase(), value: (m[4] || "").trim(), xref: m[2] || null,
                     children: [] };
      if ((node.tag === "CONC" || node.tag === "CONT") && stack.length) {
        const parent = stack[Math.min(level, stack.length) - 1];
        parent.value += (node.tag === "CONT" ? "\n" : "") + node.value;
        continue;
      }
      stack.length = Math.min(stack.length, level);
      if (level === 0) records.push(node);
      else if (stack.length) stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return records;
  }

  const first = (node, tag) => node.children.find((c) => c.tag === tag) || null;
  const all = (node, tag) => node.children.filter((c) => c.tag === tag);

  function cleanName(value) {
    return value.replace(/\//g, " ").replace(/\s+/g, " ").trim();
  }

  function eventOf(rec, tags) {
    for (const tag of tags) {
      const ev = first(rec, tag);
      if (!ev) continue;
      const d = first(ev, "DATE"), p = first(ev, "PLAC");
      const e = { date: d ? d.value : "", place: p ? p.value : "" };
      if (e.date || e.place) return e;
    }
    return null;
  }

  /** Parse GEDCOM bytes or text into {people, families} keyed by xref ("@I1@"). */
  function load(input, fallbackEvents = true) {
    const people = {}, families = {};
    const birthTags = fallbackEvents ? ["BIRT", "CHR", "BAPM"] : ["BIRT"];
    const deathTags = fallbackEvents ? ["DEAT", "BURI", "CREM"] : ["DEAT"];
    for (const rec of parseGedcom(decode(input))) {
      if (rec.tag === "INDI" && rec.xref) {
        const nameNode = first(rec, "NAME");
        let name = nameNode ? cleanName(nameNode.value) : "";
        if (nameNode && !name) {
          name = [first(nameNode, "GIVN"), first(nameNode, "SURN")]
            .filter(Boolean).map((n) => n.value).join(" ");
        }
        const sex = first(rec, "SEX");
        const famc = all(rec, "FAMC").map((n, i) => {
          const pedi = first(n, "PEDI");
          return { id: n.value, rank: !pedi || pedi.value.toLowerCase() === "birth" ? 0 : 1, i };
        }).sort((a, b) => a.rank - b.rank || a.i - b.i).map((x) => x.id).filter(Boolean);
        people[rec.xref] = {
          id: rec.xref, name, sex: sex ? sex.value.toUpperCase() : "",
          birth: eventOf(rec, birthTags), death: eventOf(rec, deathTags), famc,
        };
      } else if (rec.tag === "FAM" && rec.xref) {
        const h = first(rec, "HUSB"), w = first(rec, "WIFE");
        families[rec.xref] = {
          id: rec.xref, husb: h ? h.value : null, wife: w ? w.value : null,
          marriage: eventOf(rec, ["MARR"]), divorced: !!first(rec, "DIV"),
        };
      }
    }
    return { people, families };
  }

  // ------------------------------------------------------------ formatting

  const DATE_RE = /(?:(\d{1,2})\s+)?(?:([A-Z]{3})\s+)?(\d{3,4})\b/;
  const ISO_RE = /(\d{4})-(\d{2})-(\d{2})/;

  function formatDate(raw, full, lang) {
    const t = TEXTS[lang];
    let s = (raw || "").toUpperCase().trim();
    if (!s) return "";
    if (s.startsWith("(") && s.endsWith(")")) return raw.replace(/^[(\s]+|[)\s]+$/g, "");

    const one = (part) => {
      let y, mo, d;
      const iso = ISO_RE.exec(part);
      if (iso) {
        y = +iso[1]; mo = +iso[2]; d = +iso[3];
      } else {
        const m = DATE_RE.exec(part);
        if (!m) return part.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        d = m[1] ? +m[1] : null;
        mo = MONTHS[m[2] || ""] || null;
        y = +m[3];
      }
      if (!full || !mo) return String(y);
      if (t.months) return d ? `${d} ${t.months[mo - 1]} ${y}` : `${t.months[mo - 1]} ${y}`;
      return d ? `${d}.${mo}.${y}` : `${mo}/${y}`;
    };

    let qual = "";
    for (const [key, word] of Object.entries(t.qual)) {
      if (s.startsWith(key + " ")) { qual = word; s = s.slice(key.length + 1); break; }
    }
    const rng = /(?:BET|FROM)\s+(.+?)\s+(?:AND|TO)\s+(.+)/.exec(s);
    if (rng) {
      const a = one(rng[1]), b = one(rng[2]);
      return a === b ? a : `${a}–${b}`;
    }
    s = s.replace(/^(FROM|TO|INT)\s+/, "").replace(/\s*\(.*\)$/, "");
    return qual + one(s);
  }

  function formatPlace(raw, mode) {
    if (mode === "none" || !raw) return "";
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return "";
    return mode === "short" ? parts[0] : parts.join(", ");
  }

  function label(kind, o) {
    return o.labels === "symbols" ? SYMBOLS[kind] : TEXTS[o.lang].abbr[kind];
  }

  function formatEvent(kind, ev, o, extra = "") {
    if (!ev && !extra) return "";
    const date = ev ? formatDate(ev.date, o.dates === "full", o.lang) : "";
    const place = ev ? formatPlace(ev.place, o.places) : "";
    let body = [date, place].filter(Boolean).join(" ");
    if (extra) body = body ? `${body} (${extra})` : extra;
    return body ? label(kind, o) + body : "";
  }

  function personLine(p, number, marriage, o) {
    const t = TEXTS[o.lang];
    let name = p && p.name ? p.name : t.unknown;
    if (p && o.showIds) name += ` [${p.id.replace(/@/g, "")}]`;
    const bits = [];
    if (p) bits.push(formatEvent("birt", p.birth, o));
    if (marriage) bits.push(formatEvent("marr", marriage.marriage, o,
                                        marriage.divorced ? t.divorced : ""));
    if (p) bits.push(formatEvent("deat", p.death, o));
    const b = bits.filter(Boolean);
    let text = number !== null ? `${number}. ${name}` : name;
    if (b.length) text += " (" + b.join(", ") + ")";
    return text;
  }

  // ------------------------------------------------------------ chart rows

  function buildRows(rootId, people, families, o) {
    const rows = [];
    const expanded = new Map();
    const maxGen = o.generations || 10000;

    function visit(pid, gen, ahnen, childFam, ancestors) {
      const p = people[pid];
      const fam = p.famc.length ? families[p.famc[0]] : null;
      let father = fam && fam.husb in people ? fam.husb : null;
      let mother = fam && fam.wife in people ? fam.wife : null;
      if (gen >= maxGen) father = mother = null;
      const dup = expanded.has(pid) && !o.repeat;
      if (dup || ancestors.has(pid)) father = mother = null;

      let marr = null;
      if (childFam && o.marriageOn !== "none") {
        const isFather = childFam.husb === pid;
        const hasFather = childFam.husb in people;
        if (o.marriageOn === "both" || isFather || !hasFather) marr = childFam;
      }
      const number = o.numbering === "generation" ? gen
        : o.numbering === "ahnentafel" ? ahnen : null;
      const row = { gen, text: personLine(p, number, marr, o), personId: pid, dup,
                    fatherRow: null, motherRow: null, page: 0, target: null };
      if (!dup && !expanded.has(pid)) expanded.set(pid, row);

      const anc = new Set(ancestors).add(pid);
      const order = o.motherFirst
        ? [[mother, 2 * ahnen + 1, "m"], [father, 2 * ahnen, "f"]]
        : [[father, 2 * ahnen, "f"], [mother, 2 * ahnen + 1, "m"]];
      let self = null;
      order.forEach(([par, num, which], i) => {
        if (i === 1) { rows.push(row); self = rows.length - 1; }
        if (par) {
          const r = visit(par, gen + 1, num, fam, anc);
          if (which === "f") row.fatherRow = r; else row.motherRow = r;
        }
      });
      return self;
    }

    visit(rootId, 1, 1, null, new Set());
    for (const r of rows) if (r.dup) r.target = expanded.get(r.personId) || null;
    return rows;
  }

  // ------------------------------------------------------------ PDF layout

  class Layout {
    constructor(pageW, pageH, margin, font, bold, size, step, lineH) {
      Object.assign(this, { pageW, pageH, margin, font, bold, size, step, lineH });
      const header = size * 1.6 + 22;
      this.top = pageH - margin - header;
      this.bottom = margin + 14;
      this.perPage = Math.max(1, Math.floor((this.top - this.bottom) / lineH) + 1);
    }
    get tick() { return Math.min(10, this.step * 0.6); }
    x(gen) { return this.margin + (gen - 1) * this.step; }
    textX(gen) { return this.x(gen) + (gen > 1 ? this.tick + 2 : 0); }
    y(row) { return this.top - (row % this.perPage) * this.lineH; }
    with(size, step, baseRatio) {
      return new Layout(this.pageW, this.pageH, this.margin, this.font, this.bold,
                        size, step, size * baseRatio);
    }
  }

  /** Shrink indent and then font size until the widest line fits on the page. */
  function fitLayout(rows, base, seeText) {
    const ratio = base.lineH / base.size;
    let lay = base;
    for (let i = 0; i < 200; i++) {
      let width = 0;
      for (const r of rows) {
        const w = lay.textX(r.gen) +
          lay.font.widthOfTextAtSize(r.text + (r.dup ? ` (${seeText})` : ""), lay.size);
        if (w > width) width = w;
      }
      if (width <= lay.pageW - lay.margin) return { lay, fits: true };
      let size, step;
      if (lay.step > lay.size * 1.8) {
        step = Math.max(lay.size * 1.8, lay.step * 0.92); size = lay.size;
      } else if (lay.size > 5) {
        size = Math.max(5, lay.size - 0.25); step = size * 1.8;
      } else {
        return { lay, fits: false };
      }
      lay = lay.with(size, step, ratio);
    }
    return { lay, fits: false };
  }

  function render(doc, rows, title, lang, lay, showDate, lineWidth, rgb) {
    const t = TEXTS[lang];
    const total = Math.floor((rows.length - 1) / lay.perPage) + 1;
    rows.forEach((r, i) => { r.page = Math.floor(i / lay.perPage) + 1; });
    const black = rgb(0, 0, 0);
    const mid = lay.size * 0.32;
    const gap = lay.lineH * 0.45;
    const today = new Date();
    const dateStr = lang === "en"
      ? today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;

    const pageRange = (pg) => [lay.y(pg * lay.perPage) + lay.lineH * 0.5,
                               lay.y(pg * lay.perPage + lay.perPage - 1) - lay.lineH * 0.5];

    for (let pg = 0; pg < total; pg++) {
      const page = doc.addPage([lay.pageW, lay.pageH]);
      const line = (x1, y1, x2, y2, th = lineWidth) =>
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: th,
                        color: black });
      const vline = (x, rowA, rowB, trimA, trimB) => {
        const [topLim, botLim] = pageRange(pg);
        const pa = Math.floor(rowA / lay.perPage), pb = Math.floor(rowB / lay.perPage);
        if (pg < pa || pg > pb) return;
        const y1 = pa === pg ? lay.y(rowA) + mid - trimA : topLim;
        const y2 = pb === pg ? lay.y(rowB) + mid + trimB : botLim;
        if (y1 > y2) line(x, y1, x, y2);
      };

      // header
      const ts = lay.size * 1.6;
      const tw = lay.bold.widthOfTextAtSize(title, ts);
      page.drawText(title, { x: (lay.pageW - tw) / 2, y: lay.pageH - lay.margin - ts,
                             size: ts, font: lay.bold, color: black });
      const small = lay.size * 0.85;
      if (showDate) {
        page.drawText(dateStr, { x: lay.margin, y: lay.pageH - lay.margin - ts - 6,
                                 size: small, font: lay.font, color: black });
      }
      const pageText = fmt(t.page, { n: pg + 1, total });
      page.drawText(pageText, {
        x: lay.pageW - lay.margin - lay.font.widthOfTextAtSize(pageText, small),
        y: lay.margin - 2, size: small, font: lay.font, color: black });
      const hy = lay.pageH - lay.margin - ts - 9;
      line(lay.margin, hy, lay.pageW - lay.margin, hy, 1.2);
      line(lay.margin, hy - 2, lay.pageW - lay.margin, hy - 2, 1.2);

      // people
      const startRow = pg * lay.perPage;
      const endRow = Math.min(rows.length, startRow + lay.perPage);
      for (let i = startRow; i < endRow; i++) {
        const r = rows[i];
        const y = lay.y(i);
        if (r.gen > 1) line(lay.x(r.gen), y + mid, lay.x(r.gen) + lay.tick, y + mid);
        let text = r.text;
        if (r.dup && r.target) text += `  (${fmt(t.see, { page: r.target.page })})`;
        page.drawText(text, { x: lay.textX(r.gen), y, size: lay.size, font: lay.font,
                              color: black });
      }

      // vertical connectors from father down to mother, broken around the person
      rows.forEach((r, i) => {
        const xv = lay.x(r.gen + 1);
        if (r.fatherRow !== null) vline(xv, r.fatherRow, i, 0, gap);
        if (r.motherRow !== null) vline(xv, i, r.motherRow, gap, 0);
      });
    }
    return total;
  }

  // ------------------------------------------------------------ public API

  function fold(s) {
    return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  }

  function findPeople(query, people) {
    const q = query.trim();
    const key = q.startsWith("@") ? q : `@${q}@`;
    if (people[key]) return [people[key]];
    const words = fold(q).split(/\s+/).filter(Boolean);
    return Object.values(people).filter((p) => words.every((w) => fold(p.name).includes(w)));
  }

  const DEFAULTS = {
    generations: 0, lang: "sk", labels: "symbols", dates: "year", places: "none",
    numbering: "generation", marriageOn: "father", repeat: false, motherFirst: false,
    showIds: false, title: "", showDate: true, pageSize: "a4", orientation: "portrait",
    fontSize: 8.5, lineHeight: 1.7, margin: 36,
  };

  /**
   * Build the chart and return {bytes, pages, rows, generations, fontSize, shrunk}.
   * fonts = {regular: Uint8Array|ArrayBuffer, bold: Uint8Array|ArrayBuffer}
   * libs  = {PDFLib, fontkit} (defaults to browser globals)
   */
  async function generate(data, rootId, options, fonts, libs) {
    const o = Object.assign({}, DEFAULTS, options || {});
    const PDFLib = (libs && libs.PDFLib) || globalThis.PDFLib;
    const fk = (libs && libs.fontkit) || globalThis.fontkit;
    const { people, families } = data;
    const root = people[rootId];
    if (!root) throw new Error(`Osoba ${rootId} neexistuje.`);

    const rows = buildRows(rootId, people, families, o);
    const doc = await PDFLib.PDFDocument.create();
    doc.registerFontkit(fk);
    const font = await doc.embedFont(fonts.regular, { subset: true });
    const bold = await doc.embedFont(fonts.bold || fonts.regular, { subset: true });

    let [w, h] = PAGE_SIZES[o.pageSize] || PAGE_SIZES.a4;
    if (o.orientation === "landscape") [w, h] = [Math.max(w, h), Math.min(w, h)];
    const base = new Layout(w, h, o.margin, font, bold, o.fontSize, o.fontSize * 2.6,
                            o.fontSize * o.lineHeight);
    const { lay } = fitLayout(rows, base, fmt(TEXTS[o.lang].see, { page: 99 }));
    const title = o.title || fmt(TEXTS[o.lang].title, { name: root.name });
    doc.setTitle(title);
    doc.setCreator("rodostrom");
    doc.setProducer("rodostrom (pdf-lib)");
    const pages = render(doc, rows, title, o.lang, lay, o.showDate, 0.6, PDFLib.rgb);
    const bytes = await doc.save();
    return {
      bytes, pages, rows: rows.length, generations: Math.max(...rows.map((r) => r.gen)),
      fontSize: lay.size, shrunk: lay.size < o.fontSize * 0.85, title,
    };
  }

  function defaultFileName(person) {
    return fold(person.name).replace(/[^\w.-]+/g, "_") + "_rodostrom.pdf";
  }

  return { TEXTS, load, parseGedcom, formatDate, formatPlace, personLine, buildRows,
           findPeople, fold, generate, defaultFileName, DEFAULTS };
});
