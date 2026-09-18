import type { SchedulingPolicy } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { ShiftType } from "../models/shift";
import type { AssignmentValidator } from "./validator";
import { computeShiftWindow, hoursBetween } from "../constants/shift-time";

/**
 * A true elapsed-time check, not a categorical "closing then opening is
 * banned" rule: computes the actual gap in hours between an employee's
 * most recent prior shift ending and the candidate shift starting, using
 * each shift type's real start/end (see constants/shift-time.ts), and
 * compares that gap against policy.minimumRestHours.
 */
export class MinimumRestValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
    policy: SchedulingPolicy,
  ): boolean {
    const mostRecent = assignments
      .filter(
        (assignment) =>
          assignment.employeeId === employee.id &&
          assignment.date.getTime() < shift.date.getTime(),
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (!mostRecent) {
      return true;
    }

    const previousWindow = computeShiftWindow(
      mostRecent.shift as Exclude<ShiftType, "off">,
      mostRecent.date,
      policy,
      employee.id,
      assignments,
    );

    const candidateWindow = computeShiftWindow(
      shift.shift as Exclude<ShiftType, "off">,
      shift.date,
      policy,
      employee.id,
      assignments,
    );

    const restHours = hoursBetween(previousWindow.end, candidateWindow.start);

    return restHours >= policy.minimumRestHours;
  }
}
