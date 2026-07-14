import { ShiftAssignment } from "../models/assigner";

export interface PlanningResult {
  assignments: ShiftAssignment[];

  warnings: string[];

  generatedAt: Date;
}
