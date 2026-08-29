import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "./fairness-factor";

export class DoubleShiftFactor implements FairnessFactor {
  calculate(employeeId: string, context: FairnessContext): number {
    const doubleShifts = context.assignments.filter(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.shiftType === "double",
    ).length;

    if (doubleShifts === 0) {
      return 0;
    }

    return -doubleShifts;
  }
}
