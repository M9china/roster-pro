import type { PlanningEmployee } from "../models/employee";

export interface EmployeeFairnessScore {
  employee: PlanningEmployee;

  score: number;
}

export interface FairnessResult {
  scores: EmployeeFairnessScore[];
}
