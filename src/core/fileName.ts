import { fold } from "./gedcom";

/** The words a download name is made of: "ancestors" or "descendants" and the plural of "generations", in the interface language. */
export interface FileNameWords {
  chartWord: string;
  generationsWord: string;
}

/**
 * The name of a downloaded PDF or poster: the person, the kind of chart and how many generations it really shows,
 * for example "maria-theresia_ancestors_7-generations.pdf". Only letters, digits, "." and "-" are kept in the name.
 */
export function outputFileName(personName: string, generations: number, words: FileNameWords, extension: string): string {
  const slug = (s: string) => fold(s).replace(/[^\w.]+/g, "-").replace(/^-+|-+$/g, "");
  const person = slug(personName) || "tree";
  return `${person}_${slug(words.chartWord)}_${generations}-${slug(words.generationsWord)}.${extension}`;
}
