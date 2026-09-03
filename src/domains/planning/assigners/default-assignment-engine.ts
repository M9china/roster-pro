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
  ): ShiftAssignment[] {
    const activeEmployees = employees.filter((employee) => employee.active);

    const assignments: ShiftAssignment[] = [];

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

    return assignments;
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

      if (this.hasAssignmentForShift(employee.id, shift, assignments)) {
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

      const assignedForShift = assignments.filter(
        (assignment) => assignment.shift === shift,
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
    assignments: ShiftAssignment[],
  ): boolean {
    return assignments.some(
      (assignment) =>
        assignment.employeeId === employeeId && assignment.shift === shift,
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
