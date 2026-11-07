/** Date helpers. Dates are stored as 'YYYY-MM-DD' strings in local time; '' means "not set". */

const pad = (n: number) => String(n).padStart(2, '0');

export const isDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today's date as YYYY-MM-DD in local time (toISOString would use UTC). */
export const today = () => fmtDate(new Date());

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  return fmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from a to b (b - a). Rounding absorbs daylight-saving hour shifts. */
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);

export const prettyDate = (s: string, withYear = false) =>
  parseDate(s).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

export const prettyRange = (start: string, end: string) =>
  start === end ? prettyDate(start, true) : `${prettyDate(start)} – ${prettyDate(end, true)}`;

export const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The 6×7 grid of dates shown for a month, starting on Sunday. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => fmtDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}
