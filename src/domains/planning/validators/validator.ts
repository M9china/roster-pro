import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";

export interface AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean;
}