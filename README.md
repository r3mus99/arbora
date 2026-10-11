# gedcom-to-pdf (rodostrom)

**Online: https://r3mus99.github.io/gedcom-to-pdf/**

Webová stránka, ktorá z GEDCOM súboru vytvorí PDF schému **predkov** alebo **potomkov**.
*Web page that turns a GEDCOM file into a PDF ancestor or descendant chart (English summary below).*

### Predkovia

Koreňová osoba má číslo 1 a je pri ľavom okraji. Každá ďalšia generácia je
odsadená doprava, otcova línia je nad osobou, matkina pod ňou. Za menom je
v zátvorke rok narodenia (`*`), sobáša rodičov (`∞`) a úmrtia (`†`):

```
            ┌ 3. Pavol Sokol (*1922, †1988)
      ┌ 2. Ondrej Sokol (*1960, ∞1992 (rozv.), †2009)
      │     └ 3. …
1. Adam Sokol (*1994)
      │     ┌ 3. …
      └ 2. …
            └ 3. …
```

Ukážka: [public/ukazka_predkovia.pdf](public/ukazka_predkovia.pdf).

### Potomkovia

Vybraný predok má číslo 1. Pod ním je manžel/manželka s rokom sobáša a pod
nimi odsadené deti zoradené podľa narodenia, ďalej vnúčatá atď. Pri viacerých
manželstvách sú deti rozdelené podľa toho, s kým ich osoba mala:

```
1. Juraj Sokol (*cca 1761, †cca 1806)
∞1791 Magdaléna Mlynárová (*cca 1762, †cca 1804)
   ├ 2. Tomáš Sokol (*cca 1792, †1869)
   │  ∞cca 1821 Veronika Ondrušová (*1803, †cca 1845)
   │     └ 3. Ján Sokol (*1822, †1875)
   │        ∞1849 Mária Mlynárová (*1826, †1862)
   │           └ 4. …
   └ 2. …
```

Ukážka: [public/ukazka_potomkovia.pdf](public/ukazka_potomkovia.pdf).

Osoba, ktorá sa v strome objaví viackrát (napr. príbuzenské sobáše), sa
rozvinie len raz; pri ďalšom výskyte je odkaz „pozri str. N“.

## Použitie

1. Otvorte stránku a vyberte (alebo pretiahnite) svoj `.ged` súbor.
2. Zvoľte **Predkovia** alebo **Potomkovia** a v zozname kliknite na osobu.
3. Schéma sa hneď zobrazí na stránke v rovnakom rozložení ako v PDF. Klik na
   osobu v schéme ukáže vedľa jej detail: narodenie, úmrtie, zamestnanie,
   rodičov, manželstvá a deti. Mená príbuzných v detaile sú odkazy a tlačidlo
   **Zobraziť schému tejto osoby** z nej spraví osobu číslo 1.
4. Nastavte voľby (menia aj schému na stránke) a stlačte **Vytvoriť PDF**, potom **Stiahnuť PDF**.

**Súkromie:** všetko beží iba vo vašom prehliadači. GEDCOM súbor sa nikam
neodosiela a stránka nemá žiadny server. Prehliadač si pamätá len nastavenia
a ID poslednej osoby (localStorage), nie obsah súboru.

### Jazyk

Jazyk sa prepína vlajkou vpravo hore: slovenčina, čeština, poľština, maďarčina,
nemčina, angličtina, francúzština, taliančina, španielčina, portugalčina,
holandčina a ukrajinčina. Zvolený jazyk platí pre stránku aj pre vytvorené PDF
(nadpis, skratky, formát dátumov, čísla strán). Pri prvej návšteve sa vyberie
podľa jazyka prehliadača.

### Nastavenia

| Voľba | Možnosti |
|---|---|
| Popisky | symboly `* ∞ †` alebo skratky `nar. sob. zom.` |
| Dátumy | len rok, alebo celý dátum (`14.5.1991`) |
| Miesta | bez miest, len obec, celé miesto |
| Číslovanie | generácia (1, 2, 3…); pri predkoch Ahnentafel (otec = 2n, matka = 2n+1), pri potomkoch d'Aboville (1.2.1); bez čísel |
| Sobáš rodičov | pri predkoch: pri otcovi, pri oboch rodičoch, nezobrazovať |
| Manželia | pri potomkoch: zobraziť manžela/manželku s rokom sobáša, alebo len pokrvných potomkov |
| Formát a orientácia | A4, A3, A5, Letter, Legal; na výšku / na šírku |
| Generácie | maximálny počet vrátane koreňa (0 = všetky) |
| Ďalšie | veľkosť písma, vlastný nadpis, opakované osoby rozpísať znova, matka hore (predkovia), zobraziť ID, dátum tlače |

Ak sa najdlhší riadok nezmestí na šírku strany, odsadenie generácií a potom
písmo sa automaticky zmenšia.

### Poznámky k údajom

- Dátumy `ABT`, `EST`, `CAL` sa zobrazia ako „cca“, `BEF` ako „pred“, `AFT` ako „po“,
  rozsahy `BET … AND …` / `FROM … TO …` ako „1903–1905“.
- Rozvod sa zobrazí („∞1991 (rozv.)“), ak má rodina v GEDCOM-e záznam `1 DIV`.
- Ak chýba narodenie, použije sa krst (`CHR`/`BAPM`); ak chýba úmrtie, použije sa pohreb (`BURI`).
- Kódovanie súboru: UTF-8 (aj s BOM), UTF-16, inak Windows-1250.

## Štruktúra

Stránka je napísaná v TypeScripte s Reactom a zostavuje sa cez Vite.

```
src/core/           jadro bez UI: GEDCOM → riadky schémy → PDF (pdf-lib + fontkit)
  gedcom.ts         načítanie GEDCOM-u (kódovanie, záznamy, osoby, rodiny), vyhľadávanie
  format.ts         voľby, dátumy, miesta, text riadku osoby
  chart.ts          riadky schémy predkov a potomkov
  pdf.ts            rozloženie na strany a PDF
  texts.ts          texty v PDF v 12 jazykoch
  core.test.ts      testy na ukážkových dátach
src/ui/             stránka v Reacte: schéma na obrazovke (TreeView), detail osoby
                    (PersonDetail), preklady rozhrania (i18n.ts) a vlajky
public/             súbory stránky: písmo DejaVu Sans, ukážkový GEDCOM a PDF, licencie
```

Vývoj (Node.js 22):

```
npm install
npm run dev       # http://localhost:5173
npm test          # testy jadra
npm run build     # stránka do dist/
```

Stránku na GitHub Pages zostaví a nasadí GitHub Actions (`.github/workflows/pages.yml`)
pri každom pushi do `main`; v nastaveniach repozitára je *Pages → Source: GitHub Actions*.

## Testovacie dáta

`public/ukazka.ged` obsahuje **len vymyslené osoby, dátumy a obce**. Zámerne obsahuje
chýbajúcich rodičov, približné dátumy (`ABT`, `BEF`), rozvod, opakovaného predka
a rozvetvených potomkov (vyskúšajte napr. Juraj Sokol, I13).

`.gitignore` ignoruje všetky ostatné `.ged` a `.pdf` súbory, aby sa do
repozitára omylom nedostal skutočný rodokmeň.

## English summary

Open https://r3mus99.github.io/gedcom-to-pdf/ (12 European languages, switch with
the flag in the top right), load a GEDCOM file, choose
Ancestors or Descendants, pick the person and download a multi-page PDF chart.
Ancestors: root is no. 1 on the left, father above, mother below. Descendants:
the ancestor is no. 1, spouses with marriage year, children indented below.
Birth / marriage / death years are in parentheses; repeated people are printed
once with a page reference. Everything
runs client-side; the file never leaves your browser.

## Licencia

MIT, pozri [LICENSE](LICENSE). Knižnice a písmo tretích strán: [public/LICENSES.md](public/LICENSES.md).
