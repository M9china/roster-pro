import type { StaffingRequirement } from "../models/staffing-requirement";

export interface StaffingCalculationWarning {
  code: string;
  message: string;
}

export interface StaffingCalculationResult {
  requirement: StaffingRequirement;

  warnings: StaffingCalculationWarning[];
}