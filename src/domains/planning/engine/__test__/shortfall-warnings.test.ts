import { describe, expect, it } from "vitest";

import type { ShiftAssignment } from "../../models/assigner";
import type { StaffingRequirement } from "../../models/staffing-requirement";
import { shortfallWarnings } from "../shortfall-warnings";

function createRequirement(
  overrides: Partial<StaffingRequirement> = {},
): StaffingRequirement {
  return {
    totalBartenders: 5,
    openingBartenders: 2,
    midBartenders: 1,
    closingBartenders: 2,
    doubleShifts: 0,
    earlyFinishes: 0,
    ...overrides,
  };
}

function createAssignment(shift: ShiftAssignment["shift"]): ShiftAssignment {
  return { employeeId: "employee-1", date: new Date("2026-09-12"), shift };
}

describe("shortfallWarnings", () => {
  it("returns no warnings when every shift type is fully staffed", () => {
    const requirement = createRequirement();

    const assignments = [
      createAssignment("opening"),
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("closing"),
      createAssignment("closing"),
    ];

    expect(shortfallWarnings(requirement, assignments, "2026-09-12")).toEqual(
      [],
    );
  });

  it("warns about a single understaffed shift type", () => {
    const requirement = createRequirement({ closingBartenders: 3 });

    const assignments = [
      createAssignment("opening"),
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("closing"),
    ];

    expect(shortfallWarnings(requirement, assignments, "2026-09-12")).toEqual([
      "2026-09-12: needed 3 closing bartender(s), only assigned 1.",
    ]);
  });

  it("warns about multiple understaffed shift types independently", () => {
    const requirement = createRequirement({
      openingBartenders: 3,
      closingBartenders: 3,
    });

    const assignments = [createAssignment("opening"), createAssignment("mid")];

    expect(shortfallWarnings(requirement, assignments, "2026-09-12")).toEqual([
      "2026-09-12: needed 3 opening bartender(s), only assigned 1.",
      "2026-09-12: needed 3 closing bartender(s), only assigned 0.",
    ]);
  });

  it("does not warn when a shift type is over-fulfilled", () => {
    // Not something the assignment engine currently does deliberately, but
    // shouldn't be reported as a shortfall if it happens. Zero out every
    // other shift type so only the over-fulfilled one is under test.
    const requirement = createRequirement({
      openingBartenders: 0,
      midBartenders: 0,
      closingBartenders: 0,
    });

    const assignments = [createAssignment("closing")];

    expect(shortfallWarnings(requirement, assignments, "2026-09-12")).toEqual(
      [],
    );
  });

  it("does not warn about doubles when none are required (the common case)", () => {
    const requirement = createRequirement({
      openingBartenders: 0,
      midBartenders: 0,
      closingBartenders: 0,
      doubleShifts: 0,
    });

    expect(shortfallWarnings(requirement, [], "2026-09-12")).toEqual([]);
  });
});
