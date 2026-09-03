export interface FairnessPolicy {
  shiftCountWeight: number;
  weekendShiftWeight: number;
  closingShiftWeight: number;
  doubleShiftWeight: number;
  consecutiveDaysWeight: number;
}
