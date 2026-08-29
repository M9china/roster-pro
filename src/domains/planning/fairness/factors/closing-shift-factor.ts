import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "../fairness-factor";

export class ClosingShiftFactor implements FairnessFactor {
  calculate(employeeId: string, context: FairnessContext): number {
    const closingShifts = context.assignments.filter(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.shiftType === "closing",
    ).length;

    if (closingShifts === 0) {
      return 0;
    }

    return -closingShifts;
  }
}
