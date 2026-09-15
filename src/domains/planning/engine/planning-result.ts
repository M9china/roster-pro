import { ShiftAssignment } from "@/domains";
export interface PlanningResult {
  assignments: ShiftAssignment[];

  warnings: string[];

  generatedAt: Date;
}
