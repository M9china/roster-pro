import { describe, expect, it } from "vitest";

import type { FairnessAssignment } from "../../fairness/fairness-assignment";
import { validateShiftCompatibility } from "../shift-compatibility-validator";

function createAssignment(
  date: string,
  shiftType: FairnessAssignment["shiftType"],
): FairnessAssignment {
  return {
    employeeId: "employee-1",
    date: new Date(date),
    shiftType,
  };
}

describe("validateShiftCompatibility", () => {
  it("allows an employee with no previous assignment", () => {
    const nextAssignment = createAssignment("2026-08-25", "opening");

    expect(validateShiftCompatibility(undefined, nextAssignment).valid).toBe(
      true,
    );
  });

  it("rejects a closing shift followed by an opening shift", () => {
    const previous = createAssignment("2026-08-24", "closing");

    const next = createAssignment("2026-08-25", "opening");

    const result = validateShiftCompatibility(previous, next);

    expect(result.valid).toBe(false);
  });

  it("allows closing followed by a mid shift", () => {
    const previous = createAssignment("2026-08-24", "closing");

    const next = createAssignment("2026-08-25", "mid");

    expect(validateShiftCompatibility(previous, next).valid).toBe(true);
  });

  it("allows closing followed by another closing shift", () => {
    const previous = createAssignment("2026-08-24", "closing");

    const next = createAssignment("2026-08-25", "closing");

    expect(validateShiftCompatibility(previous, next).valid).toBe(true);
  });

  it("allows opening after closing when it is not the next calendar day", () => {
    const previous = createAssignment("2026-08-24", "closing");

    const next = createAssignment("2026-08-26", "opening");

    expect(validateShiftCompatibility(previous, next).valid).toBe(true);
  });
});
