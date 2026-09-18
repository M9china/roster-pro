import type { SchedulingPolicy } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";
import { isSameCalendarDay } from "../constants/date-utils";

export class DoubleShiftValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
    policy: SchedulingPolicy,
  ): boolean {
    if (shift.shift !== "double") {
      return true;
    }

    if (!policy.allowDoubleShift) {
      return false;
    }

    const alreadyAssignedToday = assignments.some(
      (assignment) =>
        assignment.employeeId === employee.id &&
        isSameCalendarDay(assignment.date, shift.date),
    );

    return !alreadyAssignedToday;
  }
}
