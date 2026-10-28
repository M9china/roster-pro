import type { ServiceForecast, SchedulingPolicy } from "@/db/schema";
import { shortfallWarnings } from "./shortfall-warnings";
import { allocateDaysOff } from "./days-off-allocator";
import { isSameCalendarDay } from "../constants/date-utils";
import { fillIdleDays } from "./idle-day-filler";
import type { ValidationEngine } from "../validators/validation-engine";
import { AssignmentEngine, PlanningContext, PlanningEmployee, PlanningEngine, PlanningResult, ShiftAssignment, StaffingCalculator } from "@/domains";

export class DefaultPlanningEngine implements PlanningEngine {
  constructor(
    private readonly staffingCalculator: StaffingCalculator,
    private readonly assignmentEngine: AssignmentEngine,
    // Optional so existing callers/tests keep working. When supplied, any
    // day an employee would otherwise be left blank is filled with a
    // supplementary early-finish shift (see idle-day-filler.ts).
    private readonly validationEngine?: ValidationEngine,
  ) {}

  generate(
    employees: PlanningEmployee[],
    forecast: ServiceForecast,
    date: Date,
    policy: SchedulingPolicy,
  ): ShiftAssignment[] {
    const requirement = this.staffingCalculator.calculate(forecast);

    return this.assignmentEngine.assign(employees, requirement, date, policy);
  }

  generateWeek(context: PlanningContext): PlanningResult {
    // Days off are decided before any shift is filled, not detected and
    // patched up afterward -- see day-off-allocator.ts. Seeded into
    // `assignments` up front so the normal demand-driven fill below
    // already treats these employees as unavailable on their off days,
    // with no special-casing needed in the fill loop itself.
    const assignments: ShiftAssignment[] = allocateDaysOff(
      context.employees,
      context.weekStart,
      context.policy,
      context.forecasts,
      this.staffingCalculator,
    );

    const warnings: string[] = [];

    for (const forecast of context.forecasts) {
      const date = new Date(forecast.serviceDate);

      // Recomputed here rather than reusing generate()'s internal call --
      // calculate() is a cheap, pure lookup, and this keeps generate()'s
      // public single-day signature (and its existing tests) untouched.
      const requirement = this.staffingCalculator.calculate(forecast);
      const dayAssignments = this.assignmentEngine.assign(
        context.employees,
        requirement,
        date,
        context.policy,
        assignments,
      );

      warnings.push(
        ...shortfallWarnings(requirement, dayAssignments, forecast.serviceDate),
      );

      // If the assignment engine had to convert someone's day off into a
      // shortened shift to avoid leaving a slot blank, drop that day-off
      // record here too (an employee can't hold both an "off" and a real
      // shift on the same date) and say so, so the manager can see which
      // days off were traded away rather than discovering it later.
      for (const assignment of dayAssignments) {
        const offIndex = assignments.findIndex(
          (existing) =>
            existing.shift === "off" &&
            existing.employeeId === assignment.employeeId &&
            isSameCalendarDay(existing.date, assignment.date),
        );

        if (offIndex !== -1) {
          assignments.splice(offIndex, 1);
          warnings.push(
            dayOffConvertedWarning(context, assignment, forecast.serviceDate),
          );
        }
      }

      assignments.push(...dayAssignments);
    }

    if (this.validationEngine) {
      const filled = fillIdleDays(
        context.employees,
        assignments,
        context.weekStart,
        context.policy,
        this.validationEngine,
      );
      assignments.splice(0, assignments.length, ...filled.assignments);
      warnings.push(...filled.warnings);
    }

    return {
      assignments,
      warnings,
      generatedAt: new Date(),
    };
  }
}

function dayOffConvertedWarning(
  context: PlanningContext,
  assignment: ShiftAssignment,
  serviceDate: string,
): string {
  const employee = context.employees.find(
    (candidate) => candidate.id === assignment.employeeId,
  );
  const name = employee
    ? `${employee.firstName} ${employee.lastName}`
    : assignment.employeeId;

  return `${serviceDate}: ${name}'s day off was converted to an early-finish ${assignment.shift} shift to avoid leaving it unfilled.`;
}