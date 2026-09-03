import { describe, expect, it } from "vitest";

import type { FairnessAssignment } from "../fairness-assignment";
import type { FairnessContext } from "../fairness-context";
import { DoubleShiftFactor } from "../factors/double-shift-factor";

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

describe("DoubleShiftFactor", () => {
  const factor = new DoubleShiftFactor();

  it("returns zero when the employee has no double shifts", () => {
    const context = createContext([
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("closing"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(0);
  });

  it("penalizes one double shift", () => {
    const context = createContext([createAssignment("double")]);

    expect(factor.calculate("employee-1", context)).toBe(-1);
  });

  it("penalizes multiple double shifts", () => {
    const context = createContext([
      createAssignment("double"),
      createAssignment("double"),
      createAssignment("double"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-3);
  });

  it("ignores non-double shifts", () => {
    const context = createContext([
      createAssignment("opening"),
      createAssignment("mid"),
      createAssignment("closing"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(0);
  });

  it("only counts double shifts for the target employee", () => {
    const context = createContext([
      createAssignment("double", "employee-1"),
      createAssignment("double", "employee-2"),
      createAssignment("double", "employee-1"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });
});
