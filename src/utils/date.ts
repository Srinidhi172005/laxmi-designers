// Shared date formatting so every screen renders dates identically as DD/MON/YEAR
// (e.g. 20/JUL/2026). Used across the website and the admin panel.

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * Format any date-ish value as `DD/MON/YEAR`, e.g. "20/JUL/2026".
 * Accepts a Date, an ISO string ("2026-07-20"), or any string `Date` can parse.
 * Returns the original string unchanged if it cannot be parsed.
 */
export function formatDateDDMonYYYY(input: string | Date | null | undefined): string {
  if (!input) return "";

  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else {
    const str = String(input).trim();
    // Handle plain "YYYY-MM-DD" without timezone shifting to the previous day.
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (isoMatch) {
      const [, y, m, day] = isoMatch;
      d = new Date(Number(y), Number(m) - 1, Number(day));
    } else {
      d = new Date(str);
    }
  }

  if (isNaN(d.getTime())) return String(input);

  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
