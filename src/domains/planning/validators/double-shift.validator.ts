import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";

export class DoubleShiftValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean {
    if (shift.shift !== "double") {
      return true;
    }

    const alreadyAssignedToday = assignments.some(
      (assignment) =>
        assignment.employeeId === employee.id &&
        assignment.date.getFullYear() === shift.date.getFullYear() &&
        assignment.date.getMonth() === shift.date.getMonth() &&
        assignment.date.getDate() === shift.date.getDate(),
    );

    return !alreadyAssignedToday;
  }
}
