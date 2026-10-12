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
