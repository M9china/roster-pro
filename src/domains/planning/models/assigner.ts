import type { ShiftType } from "./shift";

export interface ShiftAssignment {
  employeeId: string;

  date: Date;

  shift: ShiftType;
}
