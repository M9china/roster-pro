export function isSameCalendarDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isNextCalendarDay(previous: Date, next: Date): boolean {
  const previousDay = new Date(
    previous.getFullYear(),
    previous.getMonth(),
    previous.getDate(),
  );

  const nextDay = new Date(next.getFullYear(), next.getMonth(), next.getDate());

  previousDay.setDate(previousDay.getDate() + 1);

  return isSameCalendarDay(previousDay, nextDay);
}

/**
 * UTC-based on purpose: date-only strings from the DB ('YYYY-MM-DD', e.g.
 * service_forecasts.service_date) parse via `new Date(str)` as UTC
 * midnight. Using UTC methods here keeps arithmetic consistent with that,
 * rather than drifting by a day depending on server timezone.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function toISODateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
