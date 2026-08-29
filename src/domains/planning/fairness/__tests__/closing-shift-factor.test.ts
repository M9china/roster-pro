import { describe, expect, it } from "vitest";

import type { FairnessAssignment } from "../fairness-assignment";
import type { FairnessContext } from "../fairness-context";
import { ClosingShiftFactor } from "../factors/closing-shift-factor";

function createContext(
  assignments: FairnessAssignment[] = [],
): FairnessContext {
  return {
    employees: [
      {
        id: "employee-1",
        firstName: "John",
        lastName: "Doe",
        role: "bartender",
        experienceLevel: "senior",
        employmentType: "full_time",
        active: true,
      },
    ],
    assignments,
    weekStart: new Date("2026-08-24"),
  };
}

function createAssignment(
  shiftType: FairnessAssignment["shiftType"],
  employeeId = "employee-1",
): FairnessAssignment {
  return {
    employeeId,
    date: new Date("2026-08-28"),
    shiftType,
  };
}

describe("ClosingShiftFactor", () => {
  const factor = new ClosingShiftFactor();

  it("returns zero when the employee has no closing shifts", () => {
    const context = createContext([
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("double"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(0);
  });

  it("penalizes one closing shift", () => {
    const context = createContext([createAssignment("closing")]);

    expect(factor.calculate("employee-1", context)).toBe(-1);
  });

  it("penalizes multiple closing shifts", () => {
    const context = createContext([
      createAssignment("closing"),
      createAssignment("closing"),
      createAssignment("closing"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-3);
  });

  it("ignores non-closing shifts", () => {
    const context = createContext([
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("double"),
      createAssignment("closing"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-1);
  });

  it("only counts closing shifts for the target employee", () => {
    const context = createContext([
      createAssignment("closing", "employee-1"),
      createAssignment("closing", "employee-2"),
      createAssignment("closing", "employee-1"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });
});
