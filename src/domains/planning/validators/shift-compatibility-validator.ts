import type { FairnessAssignment } from "../fairness/fairness-assignment";
import { isNextCalendarDay } from "../constants/date-utils";

export interface ShiftCompatibilityResult {
  valid: boolean;
  reason?: string;
}

export function validateShiftCompatibility(
  previousAssignment: FairnessAssignment | undefined,
  nextAssignment: FairnessAssignment,
): ShiftCompatibilityResult {
  if (!previousAssignment) {
    return {
      valid: true,
    };
  }

  const isNextDay = isNextCalendarDay(
    previousAssignment.date,
    nextAssignment.date,
  );

  if (
    isNextDay &&
    previousAssignment.shiftType === "closing" &&
    nextAssignment.shiftType === "opening"
  ) {
    return {
      valid: false,
      reason:
        "Employee cannot work an opening shift immediately after a closing shift.",
    };
  }

  return {
    valid: true,
  };
}
