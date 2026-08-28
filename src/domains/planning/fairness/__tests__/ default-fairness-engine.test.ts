import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "../fairness-factor";
import { DefaultFairnessEngine } from "../default-fairness-engine";
import { ShiftCountFactor } from "../factors/shift-count-factor";

function createEmployee(
  overrides: Partial<PlanningEmployee> = {},
): PlanningEmployee {
  return {
    id: "employee-1",
    firstName: "John",
    lastName: "Doe",
    role: "bartender",
    experienceLevel: "senior",
    employmentType: "full_time",
    active: true,
    ...overrides,
  };
}

function createContext(
  overrides: Partial<FairnessContext> = {},
): FairnessContext {
  return {
    employee: createEmployee(),
    shiftsWorked: 0,
    weekendShiftsWorked: 0,
    closingShiftsWorked: 0,
    doubleShiftsWorked: 0,
    consecutiveDaysWorked: 0,
    daysOffAssigned: 0,
    ...overrides,
  };
}

describe("DefaultFairnessEngine", () => {
  it("gives an employee with no shifts a score of zero", () => {
    const engine = new DefaultFairnessEngine([
      new ShiftCountFactor(),
    ]);

    const result = engine.evaluate(
      createContext({
        shiftsWorked: 0,
      }),
    );

    expect(result.score).toBe(0);
  });

  it("reduces the score as the employee works more shifts", () => {
    const engine = new DefaultFairnessEngine([
      new ShiftCountFactor(),
    ]);

    const result = engine.evaluate(
      createContext({
        shiftsWorked: 4,
      }),
    );

    expect(result.score).toBe(-4);
  });

  it("gives an employee with fewer shifts a higher score", () => {
    const engine = new DefaultFairnessEngine([
      new ShiftCountFactor(),
    ]);

    const employeeWithTwoShifts = engine.evaluate(
      createContext({
        shiftsWorked: 2,
      }),
    );

    const employeeWithFiveShifts = engine.evaluate(
      createContext({
        shiftsWorked: 5,
      }),
    );

    expect(employeeWithTwoShifts.score).toBeGreaterThan(
      employeeWithFiveShifts.score,
    );
  });

  it("returns the employee associated with the fairness result", () => {
    const employee = createEmployee({
      id: "employee-42",
      firstName: "Sarah",
      lastName: "Smith",
    });

    const engine = new DefaultFairnessEngine([
      new ShiftCountFactor(),
    ]);

    const result = engine.evaluate(
      createContext({
        employee,
      }),
    );

    expect(result.employee).toEqual(employee);
  });

  it("combines scores from multiple fairness factors", () => {
    const secondFactor: FairnessFactor = {
      calculate: () => -5,
    };

    const engine = new DefaultFairnessEngine([
      new ShiftCountFactor(),
      secondFactor,
    ]);

    const result = engine.evaluate(
      createContext({
        shiftsWorked: 3,
      }),
    );

    expect(result.score).toBe(-8);
  });
});