import type { SchedulingPolicy, ServiceForecast } from "@/db/schema";
import { PlanningEmployee, ShiftAssignment } from "./models";
import { addDays, toISODateString } from "./constants";


const DAYS_IN_WEEK = 7;
const FRIDAY = 5; // Date#getUTCDay(): 0 = Sunday ... 6 = Saturday
const SUNDAY = 0;
const MAX_OFF_ON_CAPPED_DAY = 1;

const DEMAND_WEIGHT: Record<ServiceForecast["demandLevel"], number> = {
  very_low: 0,
  low: 1,
  normal: 2,
  high: 3,
  very_high: 4,
};

/**
 * Pre-allocates each active employee's entitled days off for the week,
 * before any shift-filling happens -- "decide days-off first, then assign
 * shifts", rather than trying to detect and fix cap violations after the
 * fact (the codebase has no backtracking infrastructure, so "assign, then
 * undo if wrong" would mean building that from scratch just for this).
 *
 * Two hard caps apply regardless of policy.daysOffPerWeek: at most one
 * employee may have Friday off, and at most one may have Sunday off.
 * Every other day of the week is "unconstrained" in the sense of having
 * no hard cap -- but unconstrained doesn't mean demand-blind: the
 * highest-demand remaining days are excluded from the preferred pool one
 * at a time, provided the remaining days still comfortably cover
 * everyone's entitlement, so days off don't route onto exactly the day
 * that needs the most coverage. This isn't a hard "never" rule (that was
 * tried and rejected -- forcing full staffing regardless of demand makes
 * no sense) -- it's a preference that only yields if it has to.
 *
 * Off-days are represented as real ShiftAssignment records with
 * shift: "off", meant to be seeded into the week's assignment list before
 * the normal demand-driven fill runs. This reuses existing machinery
 * rather than adding a parallel "who's off" concept: hasAssignmentForDate
 * already treats any same-day assignment (off included) as "unavailable",
 * and DoubleShiftValidator already rejects a double for anyone with a
 * same-day assignment -- both correctly exclude an employee from that
 * day's shifts with no further changes needed there.
 */
export function allocateDaysOff(
  employees: PlanningEmployee[],
  weekStart: Date,
  policy: SchedulingPolicy,
  forecasts: ServiceForecast[],
): ShiftAssignment[] {
  const activeEmployees = employees.filter((employee) => employee.active);
  const weekDates = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    addDays(weekStart, i),
  );

  const unconstrainedDates = weekDates.filter(
    (date) => date.getUTCDay() !== FRIDAY && date.getUTCDay() !== SUNDAY,
  );
  const constrainedDates = weekDates.filter(
    (date) => date.getUTCDay() === FRIDAY || date.getUTCDay() === SUNDAY,
  );

  const constrainedDayUsage = new Map<string, number>(
    constrainedDates.map((date) => [date.toISOString(), 0]),
  );

  // Lowest demand first. Iteratively exclude the current-highest-demand
  // day from the preferred pool, as long as what remains still leaves a
  // buffer beyond the bare entitlement (daysOffPerWeek + 1 spare day, so
  // there's still room to stagger who's off on which day, rather than
  // collapsing everyone onto the same one or two days).
  //
  // A single fixed drop isn't enough here: a week can have more than one
  // elevated-demand day (e.g. high Thursday into very_high Friday/
  // Saturday), and dropping only the single worst day left the
  // second-worst exposed to the same "average" share of days-off that a
  // quiet day could absorb but a high-demand day can't -- this is exactly
  // what caused real understaffing on a "merely high" day sitting next to
  // an even busier one.
  const sortedByDemand = [...unconstrainedDates].sort(
    (a, b) => demandWeight(a, forecasts) - demandWeight(b, forecasts),
  );

  const bufferedMinimum = policy.daysOffPerWeek + 1;
  const preferredPool = [...sortedByDemand];

  while (preferredPool.length - 1 >= bufferedMinimum) {
    preferredPool.pop(); // drop the current highest-demand remaining day
  }

  const allocations: ShiftAssignment[] = [];

  activeEmployees.forEach((employee, employeeIndex) => {
    const daysNeeded = policy.daysOffPerWeek;
    const chosen: Date[] = [];

    // Round-robin through the preferred pool, staggered per employee (by
    // their position in the roster), so days off spread across the week
    // rather than everyone landing on the same day -- which would just
    // relocate the shortfall problem to a different day, not solve it.
    for (
      let offset = 0;
      offset < preferredPool.length && chosen.length < daysNeeded;
      offset++
    ) {
      const date =
        preferredPool[(employeeIndex + offset) % preferredPool.length];
      chosen.push(date);
    }

    // Only reach for a Friday/Sunday if still short after using every
    // preferred-pool day once (relevant only when daysOffPerWeek exceeds
    // the pool size -- not the case for the default policy value), and
    // only while that day's cap allows it.
    for (const date of constrainedDates) {
      if (chosen.length >= daysNeeded) {
        break;
      }

      const key = date.toISOString();
      const used = constrainedDayUsage.get(key) ?? 0;

      if (used < MAX_OFF_ON_CAPPED_DAY) {
        chosen.push(date);
        constrainedDayUsage.set(key, used + 1);
      }
    }

    for (const date of chosen) {
      allocations.push({ employeeId: employee.id, date, shift: "off" });
    }
  });

  return allocations;

  function demandWeight(date: Date, forecasts: ServiceForecast[]): number {
    const forDate = forecasts.filter(
      (forecast) => forecast.serviceDate === toISODateString(date),
    );
    const forecast =
      forDate.find((f) => f.servicePeriod === "full_day") ?? forDate[0];

    // No forecast entered for this day yet -- treat as neutral demand
    // rather than assuming it's safe (very_low) or should be avoided
    // (very_high); missing data shouldn't bias the allocation either way.
    return forecast
      ? DEMAND_WEIGHT[forecast.demandLevel]
      : DEMAND_WEIGHT.normal;
  }
}
