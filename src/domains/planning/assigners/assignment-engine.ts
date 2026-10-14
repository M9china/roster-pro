import { ShiftAssignment } from "../models/assigner";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";
import type { SchedulingPolicy } from "@/db/schema";

export interface AssignmentEngine {
  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
    policy: SchedulingPolicy,
    existingAssignments?: ShiftAssignment[],
  ): ShiftAssignment[];
}
