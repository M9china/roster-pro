export function isNextCalendarDay(previousDate: Date, nextDate: Date): boolean {
  const previous = new Date(
    previousDate.getFullYear(),
    previousDate.getMonth(),
    previousDate.getDate(),
  );

  const next = new Date(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate(),
  );

  const difference = next.getTime() - previous.getTime();

  return difference === 24 * 60 * 60 * 1000;
}
