import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";
import type { FairnessAssignment } from "../fairness/fairness-assignment";
import { isNextCalendarDay } from "../constants/date-utils";

export interface ShiftCompatibilityResult {
  valid: boolean;
  reason?: string;
}

export function validateShiftCompatibility(
  previousAssignment: FairnessAssignment | undefined,
  nextAssignment: FairnessAssignment,
): ShiftCompatibilityResult {
  if (!previousAssignment) {
    return {
      valid: true,
    };
  }

  const isNextDay = isNextCalendarDay(
    previousAssignment.date,
    nextAssignment.date,
  );

  if (
    isNextDay &&
    previousAssignment.shiftType === "closing" &&
    nextAssignment.shiftType === "opening"
  ) {
    return {
      valid: false,
      reason:
        "Employee cannot work an opening shift immediately after a closing shift.",
    };
  }

  return {
    valid: true,
  };
}

export class ShiftCompatibilityValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean {
    const previousAssignments = assignments
      .filter(
        (assignment) =>
          assignment.employeeId === employee.id && assignment.date < shift.date,
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const previousAssignment = previousAssignments[0];

    if (!previousAssignment) {
      return true;
    }

    if (
      previousAssignment.shift === "closing" &&
      shift.shift === "opening" &&
      isNextCalendarDay(previousAssignment.date, shift.date)
    ) {
      return false;
    }

    return true;
  }
}
