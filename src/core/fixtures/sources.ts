/** Fictional GEDCOM with sources and notes on a person, its names, events and a family (for tests). */
export const SOURCES_GED = `0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Anna /Example/
2 GIVN Anna
2 SURN Example
2 SOUR @S2@
3 PAGE entry 4
1 SEX F
1 BIRT
2 DATE 3 MAR 1850
2 PLAC Sampletown
2 SOUR @S1@
3 PAGE p. 12, no. 7
3 DATA
4 TEXT Born at home, baptised
5 CONC  the same week.
3 NOTE Handwriting hard to read, see https://example.org/scan/12.
2 NOTE @N1@
1 OCCU weaver
2 NOTE Worked at the mill.
1 FAMS @F1@
1 NOTE Remembered in the family chronicle.
2 CONT Second line of the note.
1 SOUR Family tradition
0 @I2@ INDI
1 NAME Karl /Example/
1 SEX M
1 FAMS @F1@
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 MARR
2 DATE 12 JUN 1872
2 SOUR @S1@
3 PAGE p. 88
1 NOTE Witnesses were two neighbours.
0 @S1@ SOUR
1 TITL Parish register of Sampletown
1 AUTH Example Parish Office
1 WWW https://example.org/register
1 PUBL Handwritten, 1840-1900
1 REPO @R1@
0 @S2@ SOUR
1 ABBR Census 1869
0 @R1@ REPO
1 NAME Sampletown Regional Archive
0 @N1@ NOTE Shared note about the baptism
1 CONT in the parish.
0 TRLR
`;
