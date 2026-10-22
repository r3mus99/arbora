import { fold } from "./gedcom";

/**
 * The name of a downloaded PDF or poster: the person, the kind of chart ("ancestors" or "descendants" in the interface
 * language) and how many generations it really shows, for example "maria-theresia_ancestors_7g.pdf".
 * Only letters, digits, "." and "-" are kept in the name.
 */
export function outputFileName(personName: string, generations: number, chartWord: string, extension: string): string {
  const slug = (s: string) => fold(s).replace(/[^\w.]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug(personName) || "tree"}_${slug(chartWord)}_${generations}g.${extension}`;
}
