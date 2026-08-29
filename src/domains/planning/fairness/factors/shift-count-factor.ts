import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "./fairness-factor";

export class ShiftCountFactor implements FairnessFactor {
  calculate(employeeId: string, context: FairnessContext): number {
    const shiftsWorked = context.assignments.filter(
      (assignment) => assignment.employeeId === employeeId,
    ).length;

    return -shiftsWorked;
  }
}
