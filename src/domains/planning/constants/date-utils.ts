/**
 * Every function here is UTC-based, deliberately and consistently.
 * Date-only strings from the DB ('YYYY-MM-DD', e.g. service_forecasts.
 * service_date) parse via `new Date(str)` as UTC midnight, so every
 * ShiftAssignment.date downstream represents a UTC instant. Reading them
 * back with local-time getters (getFullYear/getMonth/getDate) would only
 * happen to give the right calendar day when the server's timezone offset
 * doesn't shift the date across midnight -- true for some timezones, not
 * guaranteed on a production host in a different one. UTC getters avoid
 * that entirely.
 */

export function isSameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function isNextCalendarDay(previous: Date, next: Date): boolean {
  return isSameCalendarDay(addDays(previous, 1), next);
}

export function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
