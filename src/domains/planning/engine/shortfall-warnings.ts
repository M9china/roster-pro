import type { ShiftAssignment } from "../models/assigner";
import type { StaffingRequirement } from "../models/staffing-requirement";

type Shift = "opening" | "mid" | "closing" | "double";

const SHIFTS: Shift[] = ["opening", "mid", "closing", "double"];

const REQUIREMENT_KEY_BY_SHIFT: Record<Shift, keyof StaffingRequirement> = {
  opening: "openingBartenders",
  mid: "midBartenders",
  closing: "closingBartenders",
  double: "doubleShifts",
};

/**
 * Compares what a day's staffing requirement asked for against what
 * actually got assigned, and produces one warning per shift type that came
 * up short (e.g. not enough eligible/available bartenders on the roster).
 *
 * AssignmentEngine.assign() has no way to signal "I ran out of eligible
 * people" -- it just stops. This turns that silence into something a
 * caller (and eventually a manager reading the schedule) can actually see,
 * without changing the AssignmentEngine interface or its existing tests.
 */
export function shortfallWarnings(
  requirement: StaffingRequirement,
  assignments: ShiftAssignment[],
  serviceDate: string,
): string[] {
  const warnings: string[] = [];

  for (const shift of SHIFTS) {
    const required = requirement[REQUIREMENT_KEY_BY_SHIFT[shift]];
    const actual = assignments.filter((a) => a.shift === shift).length;

    if (actual < required) {
      warnings.push(
        `${serviceDate}: needed ${required} ${shift} bartender(s), only assigned ${actual}.`,
      );
    }
  }

  return warnings;
}
