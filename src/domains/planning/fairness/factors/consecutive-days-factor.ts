import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "./fairness-factor";
import { isNextCalendarDay } from "../../constants/date-utils";

export class ConsecutiveDaysFactor implements FairnessFactor {
  calculate(
    employeeId: string,
    context: FairnessContext,
  ): number {
    const employeeAssignments = context.assignments
      .filter(
        (assignment) =>
          assignment.employeeId === employeeId,
      )
      .sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime(),
      );

    if (employeeAssignments.length === 0) {
      return 0;
    }

    let longestStreak = 1;
    let currentStreak = 1;

    for (
      let index = 1;
      index < employeeAssignments.length;
      index++
    ) {
      const previous =
        employeeAssignments[index - 1];

      const current =
        employeeAssignments[index];

      if (
        isNextCalendarDay(
          previous.date,
          current.date,
        )
      ) {
        currentStreak += 1;

        longestStreak = Math.max(
          longestStreak,
          currentStreak,
        );
      } else {
        currentStreak = 1;
      }
    }

    return -longestStreak;
  }
}