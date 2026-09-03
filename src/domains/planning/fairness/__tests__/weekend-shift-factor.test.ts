import { describe, expect, it } from "vitest";

import type { FairnessContext } from "../fairness-context";
import type { FairnessAssignment } from "../fairness-assignment";
import { WeekendShiftFactor } from "../factors/weekend-shift-factor";

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
  date: string,
  employeeId = "employee-1",
): FairnessAssignment {
  return {
    employeeId,
    date: new Date(date),
    shiftType: "opening",
  };
}

describe("WeekendShiftFactor", () => {
  const factor = new WeekendShiftFactor();

  it("returns zero when the employee has no weekend shifts", () => {
    const context = createContext([
      createAssignment("2026-08-24"), // Monday
      createAssignment("2026-08-25"), // Tuesday
    ]);

    expect(factor.calculate("employee-1", context)).toBe(0);
  });

  it("penalizes a Friday shift", () => {
    const context = createContext([
      createAssignment("2026-08-28"), // Friday
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-1);
  });

  it("penalizes Saturday and Sunday shifts", () => {
    const context = createContext([
      createAssignment("2026-08-29"), // Saturday
      createAssignment("2026-08-30"), // Sunday
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });

  it("counts only the target employee's weekend shifts", () => {
    const context = createContext([
      createAssignment("2026-08-28", "employee-1"),
      createAssignment("2026-08-29", "employee-2"),
      createAssignment("2026-08-30", "employee-1"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });

  it("gives an employee with fewer weekend shifts a higher score", () => {
    const employeeWithOneWeekendShift = factor.calculate(
      "employee-1",
      createContext([createAssignment("2026-08-28")]),
    );

    const employeeWithThreeWeekendShifts = factor.calculate(
      "employee-1",
      createContext([
        createAssignment("2026-08-28"),
        createAssignment("2026-08-29"),
        createAssignment("2026-08-30"),
      ]),
    );

    expect(employeeWithOneWeekendShift).toBeGreaterThan(
      employeeWithThreeWeekendShifts,
    );
  });
});
