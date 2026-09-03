import { describe, expect, it } from "vitest";

import type { FairnessAssignment } from "../fairness-assignment";
import type { FairnessContext } from "../fairness-context";
import { ConsecutiveDaysFactor } from "../factors/consecutive-days-factor";

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

function createContext(
  assignments: FairnessAssignment[] = [],
): FairnessContext {
  return {
    employees: [],
    assignments,
    weekStart: new Date("2026-08-24"),
  };
}

describe("ConsecutiveDaysFactor", () => {
  const factor = new ConsecutiveDaysFactor();

  it("returns zero when the employee has no assignments", () => {
    const context = createContext();

    expect(factor.calculate("employee-1", context)).toBe(0);
  });

  it("penalizes one working day", () => {
    const context = createContext([createAssignment("2026-08-24")]);

    expect(factor.calculate("employee-1", context)).toBe(-1);
  });

  it("penalizes two consecutive working days", () => {
    const context = createContext([
      createAssignment("2026-08-24"),
      createAssignment("2026-08-25"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });

  it("penalizes a longer consecutive streak", () => {
    const context = createContext([
      createAssignment("2026-08-24"),
      createAssignment("2026-08-25"),
      createAssignment("2026-08-26"),
      createAssignment("2026-08-27"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-4);
  });

  it("resets the streak after a day off", () => {
    const context = createContext([
      createAssignment("2026-08-24"),
      createAssignment("2026-08-25"),
      createAssignment("2026-08-27"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });

  it("uses the longest streak rather than total assignments", () => {
    const context = createContext([
      createAssignment("2026-08-24"),
      createAssignment("2026-08-25"),
      createAssignment("2026-08-27"),
      createAssignment("2026-08-28"),
      createAssignment("2026-08-29"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-3);
  });

  it("ignores assignments belonging to other employees", () => {
    const context = createContext([
      createAssignment("2026-08-24"),
      createAssignment("2026-08-25"),
      createAssignment("2026-08-26", "employee-2"),
    ]);

    expect(factor.calculate("employee-1", context)).toBe(-2);
  });
});
