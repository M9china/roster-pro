import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { AssignmentValidator } from "./validator";
import { isSameCalendarDay } from "../constants/date-utils";

export class DaysOffValidator implements AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean {
    const weekStart = this.getWeekStart(shift.date);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const employeeAssignments = assignments.filter(
      (assignment) =>
        assignment.employeeId === employee.id &&
        assignment.date >= weekStart &&
        assignment.date <= weekEnd,
    );

    const workedDays = new Set(
      employeeAssignments.map((assignment) => assignment.date.toDateString()),
    );

    if (!workedDays.has(shift.date.toDateString())) {
      workedDays.add(shift.date.toDateString());
    }

    const daysWorked = workedDays.size;

    return daysWorked <= 5;
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const day = weekStart.getDay();

    const daysFromMonday = day === 0 ? 6 : day - 1;

    weekStart.setDate(weekStart.getDate() - daysFromMonday);

    weekStart.setHours(0, 0, 0, 0);

    return weekStart;
  }
}
