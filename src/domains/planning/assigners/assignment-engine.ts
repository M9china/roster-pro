
import { ShiftAssignment } from "../models/assigner";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";

export interface AssignmentEngine {
  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
  ): ShiftAssignment[];
}