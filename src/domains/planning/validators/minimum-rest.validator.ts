import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";

export class MinimumRestValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean {
    const previousAssignments = assignments.filter(
      (assignment) =>
        assignment.employeeId === employee.id &&
        assignment.date < shift.date,
    );

    if (previousAssignments.length === 0) {
      return true;
    }

    const previousDay = new Date(shift.date);

    previousDay.setDate(previousDay.getDate() - 1);

    const previousDayAssignments =
      previousAssignments.filter(
        (assignment) =>
          assignment.date.getFullYear() ===
            previousDay.getFullYear() &&
          assignment.date.getMonth() ===
            previousDay.getMonth() &&
          assignment.date.getDate() ===
            previousDay.getDate(),
      );

    if (previousDayAssignments.length === 0) {
      return true;
    }

    const workedClosing = previousDayAssignments.some(
      (assignment) => assignment.shift === "closing",
    );

    if (workedClosing && shift.shift === "opening") {
      return false;
    }

    return true;
  }
}