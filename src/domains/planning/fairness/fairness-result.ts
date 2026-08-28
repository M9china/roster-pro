import type { PlanningEmployee } from "../models/employee";

export interface FairnessResult {
  employee: PlanningEmployee;

  score: number;
}