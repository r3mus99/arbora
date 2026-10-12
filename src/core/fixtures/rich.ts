/** Made-up GEDCOM with every tag the person detail shows, and lines Arbora does not know (for tests). */
export const RICH_GED = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Ota /Brandt/
2 NPFX Dr.
2 NICK Otty
2 _RUFNAME Ota
2 _SPECIAL kept as it is
1 NAME Ota /Lake/
2 TYPE married
1 SEX M
1 BIRT
2 DATE 7 APR 1900
2 PLAC Greenfield
3 MAP
4 LATI N48.5
4 LONG E16.25
2 SOUR Parish register
3 PAGE p. 12
1 CHR
2 DATE 15 APR 1900
1 CONF
2 DATE 1912
2 _FUTURE tag
1 RESI
2 DATE 1921
2 PLAC Springfield
1 IMMI
2 DATE 1925
2 AGNC Port office
1 EVEN
2 TYPE Medal of merit
2 DATE 1950
2 NOTE Invented demo note.
1 EDUC Teacher training
2 DATE 1920
1 NATI Fictionian
1 TITL Professor
1 ASSO @I3@
2 RELA godparent
1 _CUSTOM value with  inner spaces
2 CONT second line
1 FAMS @F1@
1 DEAT
2 DATE 1978
2 CAUS Old age
1 OBJE
2 FILE photo.jpg
3 TITL Portrait
1 REFN 42
2 TYPE own
1 RIN 7
1 _UID ABC-123
1 CHAN
2 DATE 2 JAN 2020
3 TIME 10:20:30
0 @I2@ INDI
1 NAME Mia /Lind/
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Pia /Moss/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 ENGA
2 DATE 1925
1 MARR
2 DATE 1926
1 _WITN @I3@
1 DIV Y
2 DATE 1935
1 _FAMCUSTOM x
0 TRLR
`;
