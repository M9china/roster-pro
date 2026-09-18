import type { SchedulingPolicy } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";
import { addDays, toISODateString } from "../constants/date-utils";

const DAYS_IN_WEEK = 7;

export class DaysOffValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
    policy: SchedulingPolicy,
  ): boolean {
    const weekStart = this.getWeekStart(shift.date);
    const weekEnd = addDays(weekStart, DAYS_IN_WEEK - 1);

    const employeeAssignments = assignments.filter(
      (assignment) =>
        assignment.employeeId === employee.id &&
        assignment.date.getTime() >= weekStart.getTime() &&
        assignment.date.getTime() <= weekEnd.getTime(),
    );

    const workedDays = new Set(
      employeeAssignments.map((assignment) => toISODateString(assignment.date)),
    );

    workedDays.add(toISODateString(shift.date));

    const maxWorkingDays = DAYS_IN_WEEK - policy.daysOffPerWeek;

    return workedDays.size <= maxWorkingDays;
  }

  private getWeekStart(date: Date): Date {
    // UTC day-of-week: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
    const day = date.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;

    return addDays(date, -daysFromMonday);
  }
}
