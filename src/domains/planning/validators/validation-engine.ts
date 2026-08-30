import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";

export class ValidationEngine {
  constructor(private readonly validators: AssignmentValidator[]) {}

  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean {
    return this.validators.every((validator) =>
      validator.validate(employee, shift, assignments),
    );
  }
}
