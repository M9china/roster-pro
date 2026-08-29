import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "../fairness-factor";

export class WeekendShiftFactor implements FairnessFactor {
  calculate(employeeId: string, context: FairnessContext): number {
    const weekendShifts = context.assignments.filter((assignment) => {
      if (assignment.employeeId !== employeeId) {
        return false;
      }

      const day = assignment.date.getDay();

      return day === 5 || day === 6 || day === 0;
    }).length;

    if (weekendShifts === 0) {
      return 0;
    }

    return -weekendShifts;
  }
}
