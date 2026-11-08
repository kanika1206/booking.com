/** Money from the API is integer minor units. Totals display in whole rupees. */
export function money(minor: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
}

/** Dates are YYYY-MM-DD and treated as UTC so they never shift with the viewer's timezone. */
const parse = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(parse(iso));

export const dayMonth = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' });
export const weekdayDayMonth = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const monthYear = (iso: string) => fmt(iso, { month: 'short', year: 'numeric' });

export function dateRange(a: string, b: string) {
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return sameMonth ? `${parse(a).getUTCDate()}–${dayMonth(b)}` : `${dayMonth(a)} – ${dayMonth(b)}`;
}

export const addDays = (iso: string, days: number) =>
  new Date(parse(iso).getTime() + days * 86_400_000).toISOString().slice(0, 10);
export const nightsBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const daysFromToday = (iso: string) => nightsBetween(todayIso(), iso);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function ratingWord(r: number) {
  if (r >= 9.5) return 'Exceptional';
  if (r >= 9) return 'Superb';
  if (r >= 8.5) return 'Fabulous';
  if (r >= 8) return 'Very good';
  if (r >= 7) return 'Good';
  return 'Pleasant';
}

export const initials = (first: string, last: string) => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** The server rule: refundable bookings can be cancelled before the check-in date. */
export const lastFreeCancelDay = (checkIn: string) => addDays(checkIn, -1);
