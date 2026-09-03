import type { FairnessPolicy } from "./fairness-policy";

export const DEFAULT_FAIRNESS_POLICY: FairnessPolicy = {
  shiftCountWeight: 1,
  weekendShiftWeight: 1,
  closingShiftWeight: 1,
  doubleShiftWeight: 1,
  consecutiveDaysWeight: 1,
};
