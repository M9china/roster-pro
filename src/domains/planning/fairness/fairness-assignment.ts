export interface FairnessAssignment {
  employeeId: string;

  date: Date;

  shiftType: "opening" | "mid" | "closing" | "double";
}
