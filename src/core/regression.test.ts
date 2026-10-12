/**
 * Safety net for the 1.1 refactoring: properties that must keep holding however
 * the code inside is reorganised. Only the sample and made-up data are used.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  LANGS, applyFamily, applyPerson, checkGedcom, parseDate, validDateValue, decode, familyFields, fixIssue, generate, lineEnding, load, parseGedcom,
  personFields, readRecords, renameVariants, variantGroups, writeGedcom, type GedNode, type PersonFields,
} from "./index";

const sampleText = decode(readFileSync(new URL("../../public/sample.ged", import.meta.url)));
const fonts = {
  regular: readFileSync(new URL("../../public/fonts/DejaVuSans.ttf", import.meta.url)),
  bold: readFileSync(new URL("../../public/fonts/DejaVuSans-Bold.ttf", import.meta.url)),
};

/** The records without their original lines, so the writer builds every line anew. */
const rewritten = (records: GedNode[]): GedNode[] => {
  const strip = ({ raw: _, ...n }: GedNode): GedNode => ({ ...n, children: n.children.map(strip) });
  return records.map(strip);
};

// made-up family using what the app reads and what it must keep untouched
const FAMILY = [
  "0 HEAD",
  "1 SOUR TEST",
  "1 GEDC",
  "2 VERS 5.5.1",
  "2 FORM LINEAGE-LINKED",
  "1 CHAR UTF-8",
  "0 @I1@ INDI",
  "1 NAME Adam /Lindner/",
  "2 GIVN Adam",
  "2 SURN Lindner",
  "1 SEX M",
  "1 BIRT",
  "2 DATE ABT 1801",
  "2 PLAC Ostbach, Nordkreis",
  "1 OCCU miller",
  "2 DATE 1830",
  "1 OCCU innkeeper",
  "1 RELI catholic",
  "1 NOTE First line",
  "2 CONT second line",
  "1 NOTE @N1@",
  "1 _CUSTOM kept as it is",
  "1 FAMS @F1@",
  "1 FAMS @F2@",
  "0 @I2@ INDI",
  "1 NAME Berta /Lindnerová/",
  "1 SEX F",
  "1 DEAT Y",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 NAME Clara /Ostova/",
  "1 SEX F",
  "1 BIRT",
  "2 DATE BET 1805 AND 1806",
  "1 DEAT",
  "2 DATE 12 MAR 1870",
  "1 BURI",
  "2 PLAC Ostbach",
  "1 FAMS @F2@",
  "0 @I4@ INDI",
  "1 NAME Dora /Lindner/",
  "1 SEX F",
  "1 CHR",
  "2 DATE 2 FEB 1830",
  "1 FAMC @F2@",
  "2 PEDI adopted",
  "1 FAMC @F1@",
  "2 PEDI birth",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 MARR",
  "2 DATE 1828",
  "1 DIV Y",
  "1 CHIL @I4@",
  "0 @F2@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I3@",
  "1 CHIL @I4@",
  "0 @N1@ NOTE A shared note",
  "1 CONT on two lines",
  "0 TRLR",
].join("\n") + "\n";

describe("round trip", () => {
  test("lines written anew are the same as the original ones", () => {
    for (const text of [FAMILY, sampleText]) {
      expect(writeGedcom(rewritten(parseGedcom(text)), lineEnding(text))).toBe(text);
    }
  });

  test("reading a written file gives the same people and families", () => {
    for (const text of [FAMILY, sampleText]) {
      const records = parseGedcom(text);
      expect(load(writeGedcom(rewritten(records)))).toEqual(readRecords(records));
    }
  });

  test("Windows line endings stay", () => {
    const crlf = FAMILY.replace(/\n/g, "\r\n");
    expect(writeGedcom(rewritten(parseGedcom(crlf)), lineEnding(crlf))).toBe(crlf);
  });

  test("the made-up family reads as intended", () => {
    const { people, families } = load(FAMILY);
    expect(people["@I4@"].famc).toEqual(["@F1@", "@F2@"]);
    expect(people["@I4@"].birth).toEqual({ date: "2 FEB 1830", place: "" });
    expect(people["@I1@"].occupation).toBe("miller, innkeeper");
    expect(families["@F1@"]).toMatchObject({ divorced: true, marriage: { date: "1828", place: "" } });
  });
});

describe("editing and going back", () => {
  const records = parseGedcom(FAMILY);
  const rec = (xref: string) => records.find((r) => r.xref === xref)!;
  /** change the person, then change the fields back; the file must be as before */
  const andBack = (xref: string, change: (f: PersonFields) => Partial<PersonFields>) => {
    const original = rec(xref);
    const before = personFields(original);
    const changed = applyPerson(original, before, { ...before, ...change(before) });
    expect(changed).not.toBe(original);
    const back = applyPerson(changed, personFields(changed), before);
    expect(writeGedcom(records.map((r) => (r === original ? back : r)))).toBe(FAMILY);
  };

  test("name, sex and religion", () => {
    andBack("@I1@", () => ({ given: "Anton", surname: "Linder", sex: "U", religion: "" }));
  });

  test("events", () => {
    andBack("@I1@", (f) => ({ birth: { date: "1801", place: "" }, death: { date: "1850", place: "Ostbach" },
                              deceased: true, christening: { ...f.christening, place: "Ostbach" } }));
    andBack("@I3@", () => ({ burial: { date: "1870", place: "Westbach" }, death: { date: "", place: "" } }));
  });

  test("occupations and note", () => {
    andBack("@I1@", (f) => ({ occupations: [f.occupations[0], { ...f.occupations[1], value: "brewer", place: "Ostbach" }],
                              note: "Another note" }));
  });

  test("died without details", () => {
    andBack("@I2@", () => ({ deceased: false }));
  });

  test("marriage and divorce", () => {
    const original = rec("@F1@");
    const before = familyFields(original);
    const changed = applyFamily(original, before, { marriage: { date: "1829", place: "Ostbach" }, divorced: false });
    const back = applyFamily(changed, familyFields(changed), before);
    expect(writeGedcom(records.map((r) => (r === original ? back : r)))).toBe(FAMILY);
  });

  test("the sample stays the same after its people are opened and saved without changes", () => {
    const sample = parseGedcom(sampleText);
    const saved = sample.map((r) => (r.tag === "INDI" ? applyPerson(r, personFields(r), personFields(r)) : r));
    expect(saved.every((r, i) => r === sample[i])).toBe(true);
  });
});

describe("dates", () => {
  // every way a person may type a date, in every language: what the form accepts, the file check accepts
  const days = ["", "1", "14", "29", "30", "31", "32"], months = ["", "1", "2", "4", "12", "13", "FEB", "feb", "XYZ"];
  const typed = [...new Set(days.flatMap((d) => months.flatMap((m) => [
    [d, m, "1890"].filter(Boolean).join("."), [d, m, "1890"].filter(Boolean).join(" "),
  ])))];
  const shapes = (t: string) => [t, `ABT ${t}`, `BEF ${t}`, `~${t}`, `>${t}`, `${t}–1895`, `BET ${t} AND 1895`,
                                 `FROM ${t}`, `TO ${t}`, `INT ${t}`, `INT ${t} (x)`, `${t}/91`, `(${t})`];

  test.each(LANGS)("a date the form accepts in %s passes the file check", (lang) => {
    const accepted = typed.flatMap(shapes).map((input) => ({ input, ...parseDate(input, lang) })).filter((d) => d.ok);
    expect(accepted.length).toBeGreaterThan(100);
    expect(accepted.filter((d) => !validDateValue(d.value)).map((d) => `${d.input} → ${d.value}`)).toEqual([]);
  });
});

describe("fixing the file", () => {
  // links missing on one side or pointing nowhere, ISO dates, no trailer
  const BROKEN = [
    "0 HEAD",
    "1 CHAR UTF-8",
    "0 @I1@ INDI",
    "1 NAME Emil /Ferber/",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 1885-12-12",
    "1 FAMS @F1@",
    "1 FAMS @F9@",
    "0 @I2@ INDI",
    "1 NAME Greta /Holm/",
    "1 SEX F",
    "0 @I3@ INDI",
    "1 NAME Ida /Ferber/",
    "1 MARR",
    "2 DATE 1922-03",
    "1 FAMC @F1@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "1 CHIL @I8@",
  ].join("\n") + "\n";

  const key = (i: { kind: string; args: Record<string, string> }) => `${i.kind} ${JSON.stringify(i.args)}`;

  test("each fix removes its issue and adds none", () => {
    const records = parseGedcom(BROKEN);
    const issues = checkGedcom(records);
    expect(issues.filter((i) => i.fixable).map((i) => i.kind).sort())
      .toEqual(["badDate", "badDate", "missingRef", "missingRef", "noTrlr", "oneWay", "oneWay"]);
    for (const issue of issues.filter((i) => i.fixable)) {
      const after = checkGedcom(fixIssue(records, issue)).map(key);
      expect(after).not.toContain(key(issue));
      expect(after.every((k) => issues.map(key).includes(k))).toBe(true);
      expect(after).toHaveLength(issues.length - 1);
    }
  });

  test("fixing everything one by one leaves no issues", () => {
    let records = parseGedcom(BROKEN);
    for (let n = 0; n < 20; n++) {
      const next = checkGedcom(records).find((i) => i.fixable);
      if (!next) break;
      records = fixIssue(records, next);
    }
    expect(checkGedcom(records)).toEqual([]);
    expect(load(writeGedcom(records)).people["@I3@"].famc).toEqual(["@F1@"]);
  });

  test("an issue that cannot be fixed leaves the same records", () => {
    const records = parseGedcom(FAMILY);
    const issue = { kind: "deathBeforeBirth", level: "warn", person: "@I1@", args: { id: "@I1@" }, fixable: false } as const;
    expect(fixIssue(records, issue)).toBe(records);
  });
});

describe("unifying spellings", () => {
  const GED = [
    "0 HEAD",
    "0 @I1@ INDI", "1 NAME Karl /Weidenbaum/", "1 BIRT", "2 PLAC Ostbach, Nordkreis",
    "0 @I2@ INDI", "1 NAME Paul /Weydenbaum/", "1 BIRT", "2 PLAC Osttbach 12",
    "0 @I3@ INDI", "1 NAME Otto /Weidenbaum/", "1 DEAT", "2 PLAC Ostbach",
    "0 TRLR",
  ].join("\n") + "\n";

  test("a unified group is gone and unifying again changes nothing", () => {
    for (const kind of ["surname", "place"] as const) {
      const records = parseGedcom(GED);
      const [group] = variantGroups(records, kind);
      expect(group.variants).toHaveLength(2);
      const [keep, ...rest] = group.variants.map((v) => v.value);
      const once = renameVariants(records, kind, rest, keep);
      expect(variantGroups(once, kind)).toEqual([]);
      expect(renameVariants(once, kind, rest, keep)).toBe(once);
    }
  });

  test("only the changed records are written anew", () => {
    const records = parseGedcom(GED);
    const out = renameVariants(records, "place", ["Osttbach"], "Ostbach");
    expect(out.filter((r, i) => r !== records[i]).map((r) => r.xref)).toEqual(["@I2@"]);
    expect(writeGedcom(out)).toBe(GED.replace("Osttbach 12", "Ostbach 12"));
  });
});

describe("PDF layout", () => {
  test("a line too long for the page makes the font smaller, down to 5 pt", async () => {
    const long = "Maximilian Ferdinand Leopold Karl Joseph Wenzel Johann Nepomuk Franz Xaver";
    const ged = `0 HEAD\n0 @I1@ INDI\n1 NAME ${long} /von Weidenbaum-Ostbach/\n0 TRLR\n`;
    const small = await generate(load(ged), "@I1@", { pageSize: "a5", fontSize: 12 }, fonts);
    expect(small.shrunk).toBe(true);
    expect(small.fontSize).toBeLessThan(12);
    expect(small.fontSize).toBeGreaterThanOrEqual(5);
    const wide = await generate(load(ged), "@I1@", { pageSize: "a3", orientation: "landscape", fontSize: 12 }, fonts);
    expect(wide).toMatchObject({ shrunk: false, fontSize: 12 });
  });
});

describe("speed on a large file", () => {
  // 10 000 made-up people with many spellings and broken links; the work after every edit
  // must stay well under a second (it took tens of seconds while every pair was compared)
  const SYL = ["ka", "no", "va", "ri", "lo", "mi", "še", "ta", "ber", "ko", "la", "ny", "sz", "cz", "ová", "ská"];
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const word = (n: number) => Array.from({ length: n }, () => SYL[Math.floor(random() * SYL.length)]).join("");
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const lines = ["0 HEAD"];
  for (let k = 1; k <= 10000; k++) {
    lines.push(`0 @I${k}@ INDI`, `1 NAME Jan /${cap(word(2 + (k % 3)))}/`, "1 SEX M", "1 BIRT",
               `2 DATE ${k % 2 ? "1890-05-01" : "1 MAY 1890"}`, `2 PLAC ${cap(word(2 + (k % 4)))}, Kraj`,
               `1 FAMS @F${k}@`, `0 @F${k}@ FAM`, `1 WIFE @X${k}@`);
  }
  lines.push("0 TRLR");
  const records = parseGedcom(lines.join("\n"));
  const timed = <T>(run: () => T): [T, number] => {
    const start = performance.now();
    const out = run();
    return [out, performance.now() - start];
  };

  test("spelling variants", () => {
    const [groups, ms] = timed(() => [...variantGroups(records, "surname"), ...variantGroups(records, "place")]);
    expect(groups.length).toBeGreaterThan(10);
    expect(ms).toBeLessThan(1500);
  });

  test("file check", () => {
    const [issues, ms] = timed(() => checkGedcom(records));
    expect(issues.filter((i) => i.fixable).length).toBeGreaterThan(10000);
    expect(ms).toBeLessThan(1500);
  });
});
