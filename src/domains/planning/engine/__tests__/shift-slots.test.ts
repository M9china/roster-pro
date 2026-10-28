import { describe, expect, it } from "vitest";

import { toShiftSlots } from "../shift-slots";
import { StaffingRequirement } from "@/domains";

function req(
  overrides: Partial<StaffingRequirement> = {},
): StaffingRequirement {
  return {
    totalBartenders: 0,
    openingBartenders: 0,
    midBartenders: 0,
    closingBartenders: 0,
    doubleShifts: 0,
    earlyFinishes: 0,
    ...overrides,
  };
}

describe("toShiftSlots", () => {
  it("leaves slots untouched when there are no doubles", () => {
    expect(
      toShiftSlots(
        req({ openingBartenders: 2, midBartenders: 1, closingBartenders: 2 }),
      ),
    ).toEqual({ opening: 2, mid: 1, closing: 2, double: 0, peopleNeeded: 5 });
  });

  it("each double replaces one opening and one closing slot", () => {
    // high demand: 2 opening, 2 mid, 2 closing, 1 double -> 6 people total.
    expect(
      toShiftSlots(
        req({
          openingBartenders: 2,
          midBartenders: 2,
          closingBartenders: 2,
          doubleShifts: 1,
        }),
      ),
    ).toEqual({ opening: 1, mid: 2, closing: 1, double: 1, peopleNeeded: 5 });
  });

  it("caps doubles at the number of opening/closing pairs available", () => {
    const slots = toShiftSlots(
      req({ openingBartenders: 1, closingBartenders: 3, doubleShifts: 2 }),
    );
    expect(slots).toEqual({
      opening: 0,
      mid: 0,
      closing: 2,
      double: 1,
      peopleNeeded: 3,
    });
  });

  it("never returns negative slots", () => {
    const slots = toShiftSlots(req({ doubleShifts: 3 }));
    expect(slots).toEqual({
      opening: 0,
      mid: 0,
      closing: 0,
      double: 0,
      peopleNeeded: 0,
    });
  });
});
