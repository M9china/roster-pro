import type { PlanningEmployee } from "../models/employee";

export interface FairnessContext {
  employee: PlanningEmployee;

  shiftsWorked: number;

  weekendShiftsWorked: number;

  closingShiftsWorked: number;

  doubleShiftsWorked: number;

  consecutiveDaysWorked: number;

  daysOffAssigned: number;
}
