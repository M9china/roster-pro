import type { SchedulingPolicy } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { ShiftType } from "../models/shift";
import type { ValidationEngine } from "../validators/validation-engine";
import {
  addDays,
  isSameCalendarDay,
  toISODateString,
} from "../constants/date-utils";
import { computeShiftWindow, hoursBetween } from "../constants/shift-time";

type WorkShift = Exclude<ShiftType, "off" | "double">;

// Tried least-staffed first; ties fall back to this order. Mid comes first
// because its start adapts to the employee's own rest, so it is the most
// likely to be valid.
const PREFERENCE: WorkShift[] = ["mid", "closing", "opening"];

export interface IdleDayFillResult {
  assignments: ShiftAssignment[];
  warnings: string[];
}

/**
 * Last pass of week generation: gives every employee who still has an
 * EMPTY day (neither a shift nor a day off) a shortened supplementary
 * shift, so no cell on the roster is ever blank.
 *
 * Why it's needed: demand sets how many people each day requires, but
 * "5 working days, 2 off" is fixed per employee. When the week's demand
 * (e.g. 35 person-days for 8 people) is lower than 5 x headcount (40),
 * the surplus person-days have no slot to fill. Taking more days off is
 * not an option (exactly 2 are entitled), so those people work an
 * early-finish shift instead.
 */
export function fillIdleDays(
  employees: PlanningEmployee[],
  assignments: ShiftAssignment[],
  weekStart: Date,
  policy: SchedulingPolicy,
  validationEngine: ValidationEngine,
): IdleDayFillResult {
  const result = [...assignments];
  const warnings: string[] = [];
  const active = employees
    .filter((employee) => employee.active)
    .sort((a, b) => a.id.localeCompare(b.id));
  const maxWorkDays = 7 - policy.daysOffPerWeek;

  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(weekStart, offset);
    const iso = toISODateString(date);

    for (const employee of active) {
      const today = result.filter(
        (a) => a.employeeId === employee.id && isSameCalendarDay(a.date, date),
      );
      if (today.length > 0) continue;

      const worked = result.filter(
        (a) => a.employeeId === employee.id && a.shift !== "off",
      ).length;
      if (worked >= maxWorkDays) continue;

      const countOf = (shift: WorkShift) =>
        result.filter(
          (a) => a.shift === shift && isSameCalendarDay(a.date, date),
        ).length;

      const order = [...PREFERENCE].sort(
        (a, b) =>
          countOf(a) - countOf(b) ||
          PREFERENCE.indexOf(a) - PREFERENCE.indexOf(b),
      );

      for (const shift of order) {
        const candidate: ShiftAssignment = {
          employeeId: employee.id,
          date,
          shift,
          isEarlyFinish: true,
        };

        if (
          validationEngine.validate(employee, candidate, result, policy) &&
          keepsLaterShiftsRested(employee.id, candidate, result, policy)
        ) {
          result.push(candidate);
          warnings.push(
            `${iso}: ${employee.firstName} ${employee.lastName} added to an early-finish ${shift} shift -- demand needs fewer bartenders than everyone's 5 working days supply.`,
          );
          break;
        }
      }
    }
  }

  return { assignments: result, warnings };
}

/**
 * The rest validator only looks backwards from the candidate. Because this
 * pass inserts into the middle of a week, also confirm the employee still
 * gets their minimum rest before every later shift they already hold.
 */
function keepsLaterShiftsRested(
  employeeId: string,
  candidate: ShiftAssignment,
  existing: ShiftAssignment[],
  policy: SchedulingPolicy,
): boolean {
  const withCandidate = [...existing, candidate];
  const timeline = withCandidate
    .filter((a) => a.employeeId === employeeId && a.shift !== "off")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let previousEnd: Date | null = null;
  for (const assignment of timeline) {
    const window = computeShiftWindow(
      assignment.shift as Exclude<ShiftType, "off">,
      assignment.date,
      policy,
      employeeId,
      withCandidate,
    );

    if (
      previousEnd !== null &&
      hoursBetween(previousEnd, window.start) < policy.minimumRestHours
    ) {
      return false;
    }
    previousEnd = window.end;
  }

  return true;
}
