import type { ServiceForecast } from "@/db/schema";
import { shortfallWarnings } from "./shortfall-warnings";
import { AssignmentEngine, PlanningContext, PlanningEmployee, PlanningEngine, PlanningResult, ShiftAssignment, StaffingCalculator } from "@/domains";

export class DefaultPlanningEngine implements PlanningEngine {
  constructor(
    private readonly staffingCalculator: StaffingCalculator,
    private readonly assignmentEngine: AssignmentEngine,
  ) {}

  generate(
    employees: PlanningEmployee[],
    forecast: ServiceForecast,
    date: Date,
  ): ShiftAssignment[] {
    const requirement = this.staffingCalculator.calculate(forecast);

    return this.assignmentEngine.assign(employees, requirement, date);
  }

  generateWeek(context: PlanningContext): PlanningResult {
    const assignments: ShiftAssignment[] = [];
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
        assignments,
      );

      warnings.push(
        ...shortfallWarnings(requirement, dayAssignments, forecast.serviceDate),
      );

      assignments.push(...dayAssignments);
    }

    return {
      assignments,
      warnings,
      generatedAt: new Date(),
    };
  }
}
