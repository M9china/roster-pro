import type { PlanningEmployee } from "../models/employee";
import type { ServiceForecast } from "@/db/schema";
import type { ShiftAssignment } from "../models/assigner";
import type { PlanningContext } from "./planning-context";
import type { PlanningResult } from "./planning-result";

export interface PlanningEngine {
  generate(
    employees: PlanningEmployee[],
    forecast: ServiceForecast,
    date: Date,
  ): ShiftAssignment[];

  generateWeek(context: PlanningContext): PlanningResult;
}
