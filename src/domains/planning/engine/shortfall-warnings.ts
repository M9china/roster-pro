import type { ShiftAssignment } from "../models/assigner";
import type { StaffingRequirement } from "../models/staffing-requirement";
import { toShiftSlots } from "./shift-slots";

type Shift = "opening" | "mid" | "closing" | "double";

const SHIFTS: Shift[] = ["opening", "mid", "closing", "double"];

/**
 * Compares what a day actually needed against what got assigned, and
 * produces one warning per shift type that came up short (e.g. not enough
 * eligible/available bartenders on the roster).
 *
 * "Needed" is measured against the effective slots (see toShiftSlots),
 * not the raw requirement: each double replaces an opening and a closing
 * slot, so comparing against the raw opening/closing counts would report
 * a false shortfall for every covered double.
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
  const slots = toShiftSlots(requirement);
  const warnings: string[] = [];

  const countOf = (shift: Shift) =>
    assignments.filter((a) => a.shift === shift).length;

  // A double that couldn't be filled hands its opening and closing slots
  // back (the engine does the same), so those are still needed -- measure
  // against what the engine actually tried to fill.
  const uncoveredDoubles = Math.max(0, slots.double - countOf("double"));
  const required: Record<Shift, number> = {
    opening: slots.opening + uncoveredDoubles,
    mid: slots.mid,
    closing: slots.closing + uncoveredDoubles,
    double: slots.double,
  };

  for (const shift of SHIFTS) {
    const actual = countOf(shift);

    if (actual < required[shift]) {
      warnings.push(
        `${serviceDate}: needed ${required[shift]} ${shift} bartender(s), only assigned ${actual}.`,
      );
    }
  }

  // A double stands in for one opening AND one closing slot, so it can't
  // outnumber either. If the requirement asks for more than that, the
  // surplus is dropped by toShiftSlots -- say so rather than do it quietly.
  if (requirement.doubleShifts > slots.double) {
    warnings.push(
      `${serviceDate}: staffing requirement asked for ${requirement.doubleShifts} double shift(s) but only ${slots.double} opening/closing pair(s) exist to replace; planning for ${slots.double}.`,
    );
  }

  return warnings;
}
