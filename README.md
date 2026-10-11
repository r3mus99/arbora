# gedcom-to-pdf (rodostrom)

**Online: https://r3mus99.github.io/gedcom-to-pdf/**

Webová stránka, ktorá z GEDCOM súboru vytvorí PDF schému predkov (rodostrom).
*Web page that turns a GEDCOM file into a PDF ancestor chart (English summary below).*

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

Ukážka: [docs/ukazka.pdf](docs/ukazka.pdf) vytvorené z
[docs/ukazka.ged](docs/ukazka.ged).

Predok, ktorý sa v strome objaví viackrát (napr. príbuzenské sobáše), sa
rozvinie len raz; pri ďalšom výskyte je odkaz „pozri str. N“.

## Použitie

1. Otvorte stránku a vyberte (alebo pretiahnite) svoj `.ged` súbor.
2. V zozname nájdite a kliknite na koreňovú osobu.
3. Nastavte voľby a stlačte **Vytvoriť PDF**, potom **Stiahnuť PDF**.

**Súkromie:** všetko beží iba vo vašom prehliadači. GEDCOM súbor sa nikam
neodosiela a stránka nemá žiadny server. Prehliadač si pamätá len nastavenia
a ID poslednej osoby (localStorage), nie obsah súboru.

### Nastavenia

| Voľba | Možnosti |
|---|---|
| Jazyk | slovensky, česky, English (nadpis, skratky, čísla strán) |
| Popisky | symboly `* ∞ †` alebo skratky `nar. sob. zom.` |
| Dátumy | len rok, alebo celý dátum (`14.5.1991`) |
| Miesta | bez miest, len obec, celé miesto |
| Číslovanie | generácia (1, 2, 3…), Ahnentafel (otec = 2n, matka = 2n+1), bez čísel |
| Sobáš rodičov | pri otcovi, pri oboch rodičoch, nezobrazovať |
| Formát a orientácia | A4, A3, A5, Letter, Legal; na výšku / na šírku |
| Generácie | maximálny počet vrátane koreňa (0 = všetky) |
| Ďalšie | veľkosť písma, vlastný nadpis, opakovaných predkov rozpísať znova, matka hore, zobraziť ID, dátum tlače |

Ak sa najdlhší riadok nezmestí na šírku strany, odsadenie generácií a potom
písmo sa automaticky zmenšia.

### Poznámky k údajom

- Dátumy `ABT`, `EST`, `CAL` sa zobrazia ako „cca“, `BEF` ako „pred“, `AFT` ako „po“,
  rozsahy `BET … AND …` / `FROM … TO …` ako „1903–1905“.
- Rozvod sa zobrazí („∞1991 (rozv.)“), ak má rodina v GEDCOM-e záznam `1 DIV`.
- Ak chýba narodenie, použije sa krst (`CHR`/`BAPM`); ak chýba úmrtie, použije sa pohreb (`BURI`).
- Kódovanie súboru: UTF-8 (aj s BOM), UTF-16, inak Windows-1250.

## Štruktúra

```
docs/               stránka pre GitHub Pages
  index.html        formulár
  app.js            logika stránky
  rodostrom.js      generátor (GEDCOM → riadky → PDF), funguje aj v Node.js
  vendor/           pdf-lib + fontkit (MIT), licencie v vendor/LICENSES.md
  fonts/            DejaVu Sans (písmo s diakritikou)
  ukazka.ged/.pdf   vymyslené testovacie dáta
```

Lokálne spustenie: `cd docs && python3 -m http.server`, potom http://localhost:8000.

## Testovacie dáta

`docs/ukazka.ged` obsahuje **len vymyslené osoby, dátumy a obce**. Zámerne obsahuje
chýbajúcich rodičov, približné dátumy (`ABT`, `BEF`), rozvod a opakovaného predka.

`.gitignore` ignoruje všetky ostatné `.ged` a `.pdf` súbory, aby sa do
repozitára omylom nedostal skutočný rodokmeň.

## English summary

Open https://r3mus99.github.io/gedcom-to-pdf/, load a GEDCOM file, pick the
root person and download a multi-page PDF ancestor chart: root is no. 1 on the
left, father above, mother below, birth / parents' marriage / death years in
parentheses, repeated ancestors printed once with a page reference. Everything
runs client-side; the file never leaves your browser.

## Licencia

MIT, pozri [LICENSE](LICENSE). Knižnice a písmo tretích strán: [docs/vendor/LICENSES.md](docs/vendor/LICENSES.md).
