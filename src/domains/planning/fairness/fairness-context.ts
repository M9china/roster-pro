import type { PlanningEmployee } from "../models/employee";

export interface FairnessContext {
  employees: PlanningEmployee[];

  weekStart: Date;
}
