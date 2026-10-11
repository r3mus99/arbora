# Arbora

**Online: https://r3mus99.github.io/arbora/**

Webová stránka na prezeranie a úpravu rodokmeňa z GEDCOM súboru, ktorá z neho
vytvorí PDF schému **predkov** alebo **potomkov**. Upravený rodokmeň sa dá
stiahnuť späť ako GEDCOM.
*Web page to view and edit a GEDCOM family tree and turn it into a PDF ancestor or
descendant chart (English summary below).*

### Predkovia

Koreňová osoba má číslo 1 a je pri ľavom okraji. Každá ďalšia generácia je
odsadená doprava, otcova línia je nad osobou, matkina pod ňou. Za menom je
v zátvorke rok narodenia (`*`), sobáša rodičov (`∞`) a úmrtia (`†`):

```
            ┌ 3. Karol Ľudovít Habsburský (*1833, ∞1862, †1896)
      ┌ 2. Otto František Jozef Habsburský (*1865, ∞1886, †1906)
      │     └ 3. Marie Annunziata Neapolsko-Sicilská (*1843, †1871)
1. Karol I. (*1887, †1922)
      │     ┌ 3. Jiří I. Saský (*1832, ∞1859, †1904)
      └ 2. Mária Jozefa Saská (*1867, †1944)
            └ 3. …
```

Ukážka: [public/ukazka_predkovia.pdf](public/ukazka_predkovia.pdf).

### Potomkovia

Vybraný predok má číslo 1. Pod ním je manžel/manželka s rokom sobáša a pod
nimi odsadené deti zoradené podľa narodenia, ďalej vnúčatá atď. Pri viacerých
manželstvách sú deti rozdelené podľa toho, s kým ich osoba mala:

```
1. František I. (*1708, †1765)
∞1736 Mária Terézia (*1717, †1780)
   ├ 2. …
   ├ 2. Leopold II. (*1747, †1792)
   │  ∞1765 Mária Ludovika Španielska (*1745, †1792)
   │     ├ 3. František II. (*1768, †1835)
   │     │  ∞1788 Alžbeta Wilhelmína Württemberská (*1767, †1790)
   │     │     └ 4. …
   │     │  ∞1790 Mária Terézia Neapolsko-sicílska (*1772, †1807)
   │     │     ├ 4. Mária Lujza Habsbursko-lotrinská (*1791, †1847)
   │     │     └ 4. Ferdinand I. (*1793, †1875)
   │     └ 3. …
   └ 2. …
```

Ukážka: [public/ukazka_potomkovia.pdf](public/ukazka_potomkovia.pdf).

Osoba, ktorá sa v strome objaví viackrát (napr. príbuzenské sobáše), sa
rozvinie len raz; pri ďalšom výskyte je odkaz „pozri str. N“.

## Použitie

1. Otvorte stránku a vyberte (alebo pretiahnite) svoj `.ged` súbor. Potom sa
   výber súboru zmenší na úzky pruh hore, kliknutím naň otvoríte iný súbor.
2. Hlavnou časťou stránky je schéma na obrazovke v rovnakom rozložení ako v PDF.
   Nad ňou sa prepína **Predkovia** / **Potomkovia**, osobu č. 1 nájdete
   vyhľadávaním mena alebo ID v hlavičke schémy. Na začiatku je to naposledy
   zvolená osoba, inak prvá osoba v súbore.
3. Klik na osobu v schéme ukáže jej detail (na širokej obrazovke vedľa schémy,
   na úzkej pod ňou): narodenie, úmrtie, zamestnanie, rodičov, manželstvá
   a deti. Mená príbuzných sú odkazy a tlačidlo **Zobraziť schému tejto osoby**
   z nej spraví osobu číslo 1.
4. Opakujúci sa predok má namiesto svojej vetvy odkaz **pozri č. X** (pri
   číslovaní Ahnentafel / d'Aboville, inak **pozri vyššie / nižšie**), ktorý
   skočí na miesto, kde je vetva rozpísaná, a zvýrazní ho. Šípky vedľa nadpisu
   (alebo Alt+← / Alt+→) vracajú späť a vpred po prezeraných osobách.
5. Znamienko **−** na spojnici pred menom zbalí vetvu osoby, **+** ju znova
   rozbalí; so Shiftom sa zbalí alebo rozbalí celá generácia. Počet generácií
   a ostatné voľby sa berú z Nastavení, takže PDF zodpovedá schéme na stránke
   (zbalené vetvy sa do PDF neprenášajú).
6. **Upraviť** v detaile osoby otvorí formulár s jej údajmi (pozri nižšie).
7. **Nastavenia** sú skryté, otvoria sa kliknutím. Menia aj schému na stránke.
8. **Vytvoriť PDF** (hore vedľa Stiahnuť GEDCOM) vytvorí PDF a hneď ho stiahne.

### Úpravy a export do GEDCOM

Formulár v detaile osoby mení údaje už existujúcich osôb: meno a priezvisko (ponúka priezviská zo súboru),
pohlavie, narodenie, krst, úmrtie a pohreb (dátum a miesto), zamestnania
(každé s vlastným dátumom a miestom), vierovyznanie, poznámku a pri každom manželstve dátum
a miesto sobáša a rozvod. Pri miestach ponúka miesta, ktoré už sú v súbore; krst a pohreb
vedia prevziať dátum a miesto z narodenia a úmrtia. **Uložiť** (Ctrl+Enter) zmenu hneď ukáže v schéme
aj v PDF, **Zrušiť** (Esc) ju zahodí. Pridávanie a mazanie osôb zatiaľ nie je.

Dátum sa dá zapísať ako `14.5.1891`, `5/1891`, `1891`, `cca 1890` (alebo `~1890`),
`pred 1890`, `po 1890`, `1890–1895` alebo priamo v tvare GEDCOM (`ABT 1890`,
`14 MAY 1891`). Pod políčkom je vidieť, ako sa dátum uloží. Iný text sa uloží
ako textový dátum v zátvorkách.

Šípky vedľa súboru (alebo Ctrl+Z / Ctrl+Y) vracajú a opakujú uložené zmeny.
**Stiahnuť GEDCOM** stiahne upravený súbor: zmenené záznamy sa zapíšu nanovo,
všetky ostatné riadky ostanú presne také, ako boli, vrátane značiek, ktoré
Arbora nepozná (zdroje, poznámky pri udalostiach, `_UID`, súradnice…). Aj
v zmenenom zázname sa menia len upravené riadky. Súbor sa ukladá v UTF-8.
Pred zatvorením stránky s neuloženými zmenami sa prehliadač opýta.

**Súkromie:** všetko beží iba vo vašom prehliadači. GEDCOM súbor sa nikam
neodosiela a stránka nemá žiadny server; upravený súbor si stiahnete sami. Prehliadač si pamätá len nastavenia
a ID poslednej osoby (localStorage), nie obsah súboru.

### Jazyk

Jazyk sa prepína vlajkou vpravo hore: slovenčina, čeština, poľština, maďarčina,
nemčina, angličtina, francúzština, taliančina, španielčina, portugalčina,
holandčina a ukrajinčina. Zvolený jazyk platí pre stránku aj pre vytvorené PDF
(nadpis, skratky, formát dátumov, čísla strán). Pri prvej návšteve sa vyberie
podľa jazyka prehliadača.

### Nastavenia

Nastavenia majú dve časti. **Spoločné** platia pre schému na stránke aj pre PDF:

| Voľba | Možnosti |
|---|---|
| Popisky | symboly `* ∞ †` alebo skratky `nar. sob. zom.` |
| Dátumy | len rok, alebo celý dátum (`14.5.1991`) |
| Miesta | bez miest, len obec, celé miesto |
| Číslovanie | generácia (1, 2, 3…); pri predkoch Ahnentafel (otec = 2n, matka = 2n+1), pri potomkoch d'Aboville (1.2.1); bez čísel |
| Sobáš rodičov | pri predkoch: pri otcovi, pri oboch rodičoch, nezobrazovať |
| Generácie | maximálny počet vrátane koreňa (0 = všetky) |
| Manželia | pri potomkoch: zobraziť manžela/manželku s rokom sobáša, alebo len pokrvných potomkov |

**Len pre PDF:** formát strany (A4, A3, A5, Letter, Legal), orientácia, veľkosť
písma, vlastný nadpis a dátum tlače v hlavičke.

Opakovaná osoba sa rozpíše len raz, ďalej je na ňu odkaz.

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
  edit.ts           úpravy záznamov, zápis dátumov, zápis GEDCOM-u
  format.ts         voľby, dátumy, miesta, text riadku osoby
  chart.ts          riadky schémy predkov a potomkov
  collapse.ts       zbalené vetvy: ktoré riadky ostanú viditeľné
  pdf.ts            rozloženie na strany a PDF
  texts.ts          texty v PDF v 12 jazykoch
  *.test.ts         testy na ukážkových dátach
src/ui/             stránka v Reacte: schéma na obrazovke (TreeView), detail osoby
                    (PersonDetail) a formulár úprav (PersonEditor), preklady
                    rozhrania (i18n.ts) a vlajky
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

`public/ukazka.ged` je rodokmeň Habsburgovcov z [Wikidata](https://www.wikidata.org)
(CC0): predkovia cisára Karola I. (I1) a potomkovia Františka I. Štefana Lotrinského
(I52) po mužskej línii spolu s manželmi, spolu 1714 osôb. Nie je v ňom nikto
narodený od roku 1950 a od roku 1900 len ľudia so známym dátumom úmrtia, teda
žiadne žijúce osoby. Mená a miesta sú zo slovenských popisov Wikidata, kde chýbajú,
z českých, nemeckých alebo anglických; pri každej osobe je jej Wikidata ID
(`REFN … TYPE Wikidata`). Obsahuje približné dátumy, viac manželstiev, rozvod
(napr. Henrich IV., I416), deti s neznámou matkou a veľa opakovaných predkov.

`.gitignore` ignoruje všetky ostatné `.ged` a `.pdf` súbory, aby sa do
repozitára omylom nedostal skutočný rodokmeň.

## English summary

Open https://r3mus99.github.io/arbora/ (12 European languages, switch with
the flag in the top right), load a GEDCOM file, choose
Ancestors or Descendants, pick the person and download a multi-page PDF chart.
**Edit** in a person's details changes names, sex, birth, christening, death,
burial, occupations, note and marriages of existing people (with undo);
**Download GEDCOM** writes the edited file back, keeping every line the app did
not change, including tags it does not understand.
Ancestors: root is no. 1 on the left, father above, mother below. Descendants:
the ancestor is no. 1, spouses with marriage year, children indented below.
Birth / marriage / death years are in parentheses; repeated people are printed
once with a page reference. The built-in sample is the Habsburg family tree from
Wikidata (CC0, nobody born from 1950 on). Everything
runs client-side; the file never leaves your browser.

## Licencia

MIT, pozri [LICENSE](LICENSE). Knižnice a písmo tretích strán: [public/LICENSES.md](public/LICENSES.md).
