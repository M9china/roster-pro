import type { ServiceForecast } from "@/db/schema";
import type { PlanningContext } from "./planning-context";
import type { PlanningResult } from "./planning-result";
import { PlanningEmployee, ShiftAssignment } from "@/domains";

export interface PlanningEngine {
  generate(
    employees: PlanningEmployee[],
    forecast: ServiceForecast,
    date: Date,
  ): ShiftAssignment[];

  generateWeek(context: PlanningContext): PlanningResult;
}
