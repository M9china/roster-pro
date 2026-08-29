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
