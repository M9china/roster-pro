import type { ServiceForecast } from "@/db/schema";

import type { PlanningEmployee } from "../models/employee";
import type { ShiftAssignment } from "../models/assigner";
import type { PlanningEngine } from "./planning-engine";
import type { PlanningContext } from "./planning-context";
import type { PlanningResult } from "./planning-result";

import type { StaffingCalculator } from "../calculators/staffing-calculator";
import type { AssignmentEngine } from "../assigners/assignment-engine";

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

      const dayAssignments = this.generate(context.employees, forecast, date);

      assignments.push(...dayAssignments);
    }

    return {
      assignments,
      warnings,
      generatedAt: new Date(),
    };
  }
}
