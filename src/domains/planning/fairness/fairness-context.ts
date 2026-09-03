import type { PlanningEmployee } from "../models/employee";
import type { FairnessAssignment } from "./fairness-assignment";

export interface FairnessContext {
  employees: PlanningEmployee[];

  assignments: FairnessAssignment[];

  weekStart: Date;
}