/**
 * GEDCOM dates: the one place that knows their form. The edit form, the file check,
 * the chart order and the overview all read dates through these functions.
 */

export const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/** days in a month; 29 in February, since the year may be a leap year */
export const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Month number 1–12 of a GEDCOM month ("MAR" → 3), else 0. */
export const monthOf = (name: string) => MONTHS.indexOf(name.toUpperCase()) + 1;

/** One date without qualifiers: [day] [month] year, Gregorian; other calendars are taken as they are. */
function validDate(s: string): boolean {
  if (/^@#D(?!GREGORIAN@)/.test(s)) return true;
  s = s.replace(/^@#DGREGORIAN@\s*/, "").replace(/\s+B\.C\.$/, "");
  const m = /^(?:(?:(\d{1,2})\s+)?([A-Z]{3})\s+)?(\d{1,4})(?:\/\d{2})?$/.exec(s);
  if (!m) return false;
  const month = m[2] ? MONTHS.indexOf(m[2]) : -1;
  if (m[2] && month < 0) return false;
  return !m[1] || (+m[1] >= 1 && +m[1] <= DAYS[month]);
}

/** Whether a DATE value has a form GEDCOM 5.5.1 allows. */
export function validDateValue(value: string): boolean {
  const s = value.trim().toUpperCase().replace(/\s+/g, " ");
  if (!s || /^\(.*\)$/.test(s) || /^INT .+ \(.*\)$/.test(s)) return true;
  let m = /^(?:ABT|CAL|EST|BEF|AFT) (.+)$/.exec(s);
  if (m) return validDate(m[1]);
  if ((m = /^BET (.+) AND (.+)$/.exec(s))) return validDate(m[1]) && validDate(m[2]);
  if ((m = /^FROM (.+?)(?: TO (.+))?$/.exec(s))) return validDate(m[1]) && (!m[2] || validDate(m[2]));
  if ((m = /^TO (.+)$/.exec(s))) return validDate(m[1]);
  return validDate(s);
}

/** Year of a GEDCOM date: the first number of three or four digits ("ABT 1890", "BET 1700 AND 1710"). */
export function yearOf(date: string | undefined | null): number | null {
  const m = /(?:^|\D)(\d{3,4})(?!\d)/.exec(date || "");
  return m ? +m[1] : null;
}

/** "1885-12-12" → "12 DEC 1885", "1922-03" → "MAR 1922" inside a date value */
export function isoToGedcom(value: string): string {
  return value.replace(/\b(\d{4})-(\d{2})(?:-(\d{2}))?\b/g, (all, y: string, m: string, d?: string) => {
    const month = MONTHS[+m - 1];
    if (!month || (d && (+d < 1 || +d > DAYS[+m - 1]))) return all;
    return `${d ? `${+d} ` : ""}${month} ${y}`;
  });
}

/** Today (or another day) as a GEDCOM date, "12 OCT 2026". */
export const gedcomDay = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** Year, month and day (0 when not known) of the first date in a GEDCOM date value; null for a phrase. */
export function dateParts(date: string | undefined | null): { y: number; m: number; d: number } | null {
  const s = (date || "").toUpperCase().replace(/\(.*\)/, "");
  const iso = /(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s);
  if (iso) return { y: +iso[1], m: +iso[2], d: iso[3] ? +iso[3] : 0 };
  const m = /(?:(?:^|\s)(\d{1,2})\s+)?(?:\b([A-Z]{3})\s+)?(\d{3,4})(?!\d)/.exec(s);
  if (!m) return null;
  const month = m[2] ? monthOf(m[2]) : 0;
  return { y: +m[3], m: month, d: month && m[1] ? +m[1] : 0 };
}

/** Whole years between two GEDCOM dates (an age), as far as the dates tell; null if unknown or negative. */
export function yearsBetween(from: string | undefined | null, to: string | undefined | null): number | null {
  const a = dateParts(from), b = dateParts(to);
  if (!a || !b) return null;
  let years = b.y - a.y;
  // a birthday not yet reached that year, when both months (and days) are known
  if (a.m && b.m && (b.m < a.m || (b.m === a.m && a.d && b.d && b.d < a.d))) years--;
  return years >= 0 ? years : null;
}

export type AgeUnit = "y" | "m" | "d";
/** An age as a number of whole years, or of months when under a year, or of days when under a month. */
export interface Age { n: number; unit: AgeUnit }

/** A date that says what it says: no qualifier (ABT, BEF, ...), range or phrase. */
const plainDate = (s: string | undefined | null) => !/\b(ABT|CAL|EST|BEF|AFT|BET|FROM|TO|INT)\b|\(/i.test(s || "");

const dayNumber = (y: number, m: number, d: number) => {
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  return Math.round(t.getTime() / 86400000);
};

/**
 * The age between two GEDCOM dates: whole years; under a year whole months; under a month whole days.
 * Months and days are only given when both dates are plain and complete enough (month, and day), since a
 * year or a month alone cannot tell them. Null when unknown, negative (the later date comes first), or
 * when it is under a year and the dates cannot tell more.
 */
export function ageBetween(from: string | undefined | null, to: string | undefined | null): Age | null {
  const years = yearsBetween(from, to);
  if (years === null) return null;
  if (years >= 1) return { n: years, unit: "y" };
  const a = dateParts(from), b = dateParts(to);
  if (!a || !b || !a.m || !b.m || !plainDate(from) || !plainDate(to)) return null;
  let months = (b.y - a.y) * 12 + b.m - a.m;
  if (a.d && b.d && b.d < a.d) months--;
  if (months < 0) return null;
  if (months >= 1) return { n: months, unit: "m" };
  if (!a.d || !b.d) return null;
  const days = dayNumber(b.y, b.m, b.d) - dayNumber(a.y, a.m, a.d);
  return days >= 0 ? { n: days, unit: "d" } : null;
}

/** "79 y.", "5 mo.", "12 d." with the units of a language */
export const formatAge = (age: Age, units: { y: string; m: string; d: string }) => `${age.n} ${units[age.unit]}`;
