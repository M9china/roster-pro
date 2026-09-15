import type { AssignmentEngine } from "./assignment-engine";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";
import type { ShiftAssignment } from "../models/assigner";
import type { ValidationEngine } from "../validators/validation-engine";

export class DefaultAssignmentEngine implements AssignmentEngine {
  constructor(private readonly validationEngine: ValidationEngine) {}

  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
    existingAssignments: ShiftAssignment[] = [],
  ): ShiftAssignment[] {
    const activeEmployees = employees.filter((employee) => employee.active);

    // Seeded with the week's assignments so far (previous days) so
    // validators -- days-off, minimum-rest -- see the full week, not just
    // today in isolation. New assignments are appended to this same array
    // as they're made; only the newly-added ones (from startIndex on) are
    // returned to the caller, so DefaultPlanningEngine's accumulation
    // logic doesn't double-count previous days.
    const assignments: ShiftAssignment[] = [...existingAssignments];
    const startIndex = assignments.length;

    this.assignShifts(
      activeEmployees,
      requirement.openingBartenders,
      "opening",
      date,
      assignments,
    );

    this.assignShifts(
      activeEmployees,
      requirement.midBartenders,
      "mid",
      date,
      assignments,
    );

    this.assignShifts(
      activeEmployees,
      requirement.closingBartenders,
      "closing",
      date,
      assignments,
    );

    this.assignShifts(
      activeEmployees,
      requirement.doubleShifts,
      "double",
      date,
      assignments,
    );

    return assignments.slice(startIndex);
  }

  private assignShifts(
    employees: PlanningEmployee[],
    required: number,
    shift: ShiftAssignment["shift"],
    date: Date,
    assignments: ShiftAssignment[],
  ): void {
    if (required <= 0) {
      return;
    }

    for (const employee of employees) {
      // Normal shifts can only be assigned to an employee
      // who does not already have a shift that day.
      //
      // Double shifts are the exception because they
      // explicitly represent working twice in one day.
      if (
        shift !== "double" &&
        this.hasAssignmentForDate(employee.id, date, assignments)
      ) {
        continue;
      }

      if (this.hasAssignmentForShift(employee.id, shift, date, assignments)) {
        continue;
      }

      const candidate: ShiftAssignment = {
        employeeId: employee.id,
        date,
        shift,
      };

      const valid = this.validationEngine.validate(
        employee,
        candidate,
        assignments,
      );

      if (!valid) {
        continue;
      }

      assignments.push(candidate);

      // Scoped to today: `assignments` can now span the whole week (it's
      // seeded with prior days), so counting every assignment of this
      // shift type across all dates would overcount "how many opening
      // slots has TODAY filled" once earlier days are in the mix.
      const assignedForShift = assignments.filter(
        (assignment) =>
          assignment.shift === shift &&
          this.isSameCalendarDay(assignment.date, date),
      ).length;

      if (assignedForShift >= required) {
        break;
      }
    }
  }

  private hasAssignmentForDate(
    employeeId: string,
    date: Date,
    assignments: ShiftAssignment[],
  ): boolean {
    return assignments.some(
      (assignment) =>
        assignment.employeeId === employeeId &&
        this.isSameCalendarDay(assignment.date, date),
    );
  }

  private hasAssignmentForShift(
    employeeId: string,
    shift: ShiftAssignment["shift"],
    date: Date,
    assignments: ShiftAssignment[],
  ): boolean {
    // Also date-scoped, for the same reason as assignedForShift above --
    // without it, an employee assigned "opening" once this week would be
    // blocked from ever getting "opening" again on any later day, since
    // `assignments` now carries the whole week rather than just today.
    return assignments.some(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.shift === shift &&
        this.isSameCalendarDay(assignment.date, date),
    );
  }

  private isSameCalendarDay(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }
}
