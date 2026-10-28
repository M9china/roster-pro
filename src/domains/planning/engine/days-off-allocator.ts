import type { SchedulingPolicy, ServiceForecast } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { StaffingCalculator } from "../calculators/staffing-calculator";
import { toShiftSlots } from "./shift-slots";
import { addDays, toISODateString } from "../constants/date-utils";

const DAYS_IN_WEEK = 7;
const FRIDAY = 5; // Date#getUTCDay(): 0 = Sunday ... 6 = Saturday
const SUNDAY = 0;
const MAX_OFF_ON_CAPPED_DAY = 1;

/**
 * Pre-allocates each active employee's entitled days off for the week,
 * before any shift-filling happens -- "decide days-off first, then assign
 * shifts". Represented as real ShiftAssignment records with shift: "off",
 * seeded into the week's assignment list so the normal demand-driven fill
 * already treats these employees as unavailable that day.
 *
 * Capacity-aware, not demand-ranked: an earlier version avoided the
 * highest-demand day(s) by relative ranking, which turned out to just
 * relocate the problem -- concentrating the same total off-days onto
 * fewer days made THOSE days understaffed instead. This version instead
 * computes each day's actual required headcount (via the real staffing
 * calculator) and caps how many people can be off that day at
 * `roster size - that day's requirement`, so a day can never be allocated
 * more absences than it can structurally absorb. Friday and Sunday
 * additionally never exceed 1 person off, regardless of how much spare
 * capacity exists.
 *
 * When capacity runs out everywhere before an employee's full entitlement
 * is used, that employee simply gets fewer days off this week rather than
 * risking an understaffed day -- the same trade-off already made for the
 * Friday/Sunday cap. This is a soft shortfall, not a hard guarantee
 * violation; pairs with the "never leave a shift unfilled" fallback in
 * DefaultAssignmentEngine, which is the actual backstop against blanks.
 */
export function allocateDaysOff(
  employees: PlanningEmployee[],
  weekStart: Date,
  policy: SchedulingPolicy,
  forecasts: ServiceForecast[],
  staffingCalculator: StaffingCalculator,
): ShiftAssignment[] {
  const activeEmployees = employees.filter((employee) => employee.active);

  // Nothing to allocate -- skip the capacity computation entirely rather
  // than calling the staffing calculator for every day of the week just to
  // arrive at an empty result.
  if (activeEmployees.length === 0 || policy.daysOffPerWeek <= 0) {
    return [];
  }

  const weekDates = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    addDays(weekStart, i),
  );
  const dateIndex = new Map(weekDates.map((date, i) => [date.toISOString(), i]));

  const capacity = new Map<string, number>(
    weekDates.map((date) => {
      const key = date.toISOString();
      const needed = requiredHeadcount(
        date,
        forecasts,
        staffingCalculator,
        policy,
      );
      const bySupply = Math.max(0, activeEmployees.length - needed);
      const dayOfWeek = date.getUTCDay();
      const cap =
        dayOfWeek === FRIDAY || dayOfWeek === SUNDAY
          ? Math.min(MAX_OFF_ON_CAPPED_DAY, bySupply)
          : bySupply;

      return [key, cap];
    }),
  );

  const allocations: ShiftAssignment[] = [];

  activeEmployees.forEach((employee, employeeIndex) => {
    const daysNeeded = policy.daysOffPerWeek;
    const chosen: Date[] = [];

    while (chosen.length < daysNeeded) {
      const candidates = weekDates
        .filter((date) => !chosen.some((d) => d.getTime() === date.getTime()))
        .filter((date) => (capacity.get(date.toISOString()) ?? 0) > 0);

      if (candidates.length === 0) {
        // Capacity genuinely exhausted everywhere this employee doesn't
        // already have off -- they fall short of full entitlement rather
        // than forcing a day below what it needs.
        break;
      }

      // Most spare capacity first; ties broken by a rotation keyed to
      // this employee's position, so days off still spread across
      // employees rather than everyone preferring the identical day.
      candidates.sort((a, b) => {
        const capDiff =
          (capacity.get(b.toISOString()) ?? 0) -
          (capacity.get(a.toISOString()) ?? 0);

        if (capDiff !== 0) {
          return capDiff;
        }

        const rankA =
          (((dateIndex.get(a.toISOString()) ?? 0) - employeeIndex) % DAYS_IN_WEEK +
            DAYS_IN_WEEK) %
          DAYS_IN_WEEK;
        const rankB =
          (((dateIndex.get(b.toISOString()) ?? 0) - employeeIndex) % DAYS_IN_WEEK +
            DAYS_IN_WEEK) %
          DAYS_IN_WEEK;

        return rankA - rankB;
      });

      const picked = candidates[0];
      chosen.push(picked);
      capacity.set(
        picked.toISOString(),
        (capacity.get(picked.toISOString()) ?? 0) - 1,
      );
    }

    for (const date of chosen) {
      allocations.push({ employeeId: employee.id, date, shift: "off" });
    }
  });

  return allocations;
}

/**
 * How many distinct people a day needs, after the replacement rule for
 * doubles (a double stands in for one opening and one closing slot -- see
 * toShiftSlots). This, not the raw sum of the requirement's fields, is
 * what determines how many people that day can safely lose to a day off.
 */
function requiredHeadcount(
  date: Date,
  forecasts: ServiceForecast[],
  staffingCalculator: StaffingCalculator,
  policy: SchedulingPolicy,
): number {
  const forDate = forecasts.filter(
    (forecast) => forecast.serviceDate === toISODateString(date),
  );
  const forecast =
    forDate.find((f) => f.servicePeriod === "full_day") ??
    forDate[0] ??
    neutralForecast(date);

  const requirement = staffingCalculator.calculate(forecast);

  // If the policy disallows doubles, none can ever be worked, so nothing
  // is replaced and every opening/mid/closing slot needs its own person.
  if (!policy.allowDoubleShift) {
    return (
      requirement.openingBartenders +
      requirement.midBartenders +
      requirement.closingBartenders
    );
  }

  return toShiftSlots(requirement).peopleNeeded;
}

/**
 * No forecast entered for this day yet -- assumed "normal" demand rather
 * than treating the day as needing nobody (which would make every
 * unforecasted day look like unlimited days-off capacity). Built as a
 * real ServiceForecast and run through the real calculator rather than a
 * second hardcoded baseline, so this can never drift out of sync with
 * what DefaultStaffingCalculator actually does for "normal" demand.
 */
function neutralForecast(date: Date): ServiceForecast {
  return {
    id: "synthetic-neutral-forecast",
    restaurantId: "synthetic",
    serviceDate: toISODateString(date),
    servicePeriod: "full_day",
    expectedReservations: 0,
    expectedWalkIns: 0,
    demandLevel: "normal",
    specialEvent: false,
    eventName: null,
    notes: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}