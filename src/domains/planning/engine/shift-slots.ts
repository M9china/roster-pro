import type { StaffingRequirement } from "../models/staffing-requirement";

/**
 * The slots that actually need a person on a given day, after applying the
 * replacement rule for doubles.
 */
export interface ShiftSlots {
  opening: number;
  mid: number;
  closing: number;
  double: number;

  /** Distinct people the day needs: opening + mid + closing + double. */
  peopleNeeded: number;
}

/**
 * Turns a StaffingRequirement into the slots to fill.
 *
 * A double is one person working a long day (12+ hours), covering both
 * ends of it -- so each double REPLACES one opening slot and one closing
 * slot rather than adding another person on top. For a very_high day
 * (opening 3, mid 2, closing 3, doubles 2) that is 2 doubles + 1 opening
 * + 2 mid + 1 closing = 6 people, not 10.
 *
 * This matches the staffing calculator's own numbers: for every demand
 * level opening + mid + closing already equals totalBartenders, so
 * doubleShifts is an overlay on those slots, not extra headcount.
 *
 * Doubles are capped at what can actually be replaced: a double needs both
 * an opening and a closing slot to stand in for, so there can never be
 * more doubles than min(opening, closing). Anything beyond that is
 * dropped here; shortfallWarnings reports it so it isn't silent.
 *
 * This is the single place the rule lives -- the assignment engine, the
 * shortfall warnings and the day-off capacity math all read it from here.
 */
export function toShiftSlots(requirement: StaffingRequirement): ShiftSlots {
  const double = Math.max(
    0,
    Math.min(
      requirement.doubleShifts,
      requirement.openingBartenders,
      requirement.closingBartenders,
    ),
  );

  const opening = requirement.openingBartenders - double;
  const mid = requirement.midBartenders;
  const closing = requirement.closingBartenders - double;

  return {
    opening,
    mid,
    closing,
    double,
    peopleNeeded: opening + mid + closing + double,
  };
}
