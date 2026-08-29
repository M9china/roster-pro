import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { FairnessContext } from "../fairness-context";
import type { FairnessFactor } from "../factors/fairness-factor";
import { DefaultFairnessEngine } from "../default-fairness-engine";
import { ShiftCountFactor } from "../factors/shift-count-factor";
import { FairnessAssignment } from "../fairness-assignment";
import { WeekendShiftFactor } from "../factors/weekend-shift-factor";
import { DoubleShiftFactor } from "../factors/double-shift-factor";

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
    employees: [createEmployee()],
    assignments: [],
    weekStart: new Date("2026-08-24"),
    ...overrides,
  };
}

function createAssignments(
  employeeId: string,
  count: number,
): FairnessAssignment[] {
  return Array.from({ length: count }, (_, index) => ({
    employeeId,
    date: new Date(`2026-08-${24 + index}`),
    shiftType: "opening",
  }));
}

describe("DefaultFairnessEngine", () => {
  it("gives an employee with no shifts a score of zero", () => {
    const engine = new DefaultFairnessEngine([new ShiftCountFactor()]);

    const employee = createEmployee();

    const result = engine.evaluate(
      createContext({
        employees: [employee],
        assignments: [],
      }),
    );

    expect(result.scores[0].score).toBe(0);
  });

  it("reduces the score as the employee works more shifts", () => {
  const employee = createEmployee();

  const engine = new DefaultFairnessEngine([
    new ShiftCountFactor(),
  ]);

  const result = engine.evaluate(
    createContext({
      employees: [employee],
      assignments: createAssignments(employee.id, 4),
    }),
  );

  expect(result.scores[0].score).toBe(-4);
});

  it("gives an employee with fewer shifts a higher score", () => {
    const engine = new DefaultFairnessEngine([new ShiftCountFactor()]);

    const employeeWithTwoShifts = engine.evaluate(
      createContext({
        employees: [createEmployee()],
        assignments: createAssignments("employee-1", 2),
      }),
    );

    const employeeWithFiveShifts = engine.evaluate(
      createContext({
        employees: [createEmployee()],
        assignments: createAssignments("employee-1", 5),
      }),
    );

    expect(employeeWithTwoShifts.scores[0].score).toBeGreaterThan(
      employeeWithFiveShifts.scores[0].score,
    );
  });

  it("returns the employee associated with the fairness result", () => {
    const employee = createEmployee({
      id: "employee-42",
      firstName: "Sarah",
      lastName: "Smith",
    });

    const engine = new DefaultFairnessEngine([new ShiftCountFactor()]);

    const result = engine.evaluate(
      createContext({
        employees: [employee],
        assignments: [],
      }),
    );

    expect(result.scores[0].employee).toEqual(employee);
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
        employees: [createEmployee()],
        assignments: createAssignments("employee-1", 3),
      }),
    );

    expect(result.scores[0].score).toBe(-8);
  });

  it("combines shift count and weekend fairness", () => {
  const employeeA = createEmployee({
    id: "employee-a",
  });

  const employeeB = createEmployee({
    id: "employee-b",
  });

  const assignments: FairnessAssignment[] = [
    // Employee A: 2 total shifts, 1 weekend shift
    {
      employeeId: "employee-a",
      date: new Date("2026-08-24"), // Monday
      shiftType: "opening",
    },
    {
      employeeId: "employee-a",
      date: new Date("2026-08-28"), // Friday
      shiftType: "opening",
    },

    // Employee B: 2 total shifts, 2 weekend shifts
    {
      employeeId: "employee-b",
      date: new Date("2026-08-28"), // Friday
      shiftType: "opening",
    },
    {
      employeeId: "employee-b",
      date: new Date("2026-08-29"), // Saturday
      shiftType: "opening",
    },
  ];

  const engine = new DefaultFairnessEngine([
    new ShiftCountFactor(),
    new WeekendShiftFactor(),
  ]);

  const result = engine.evaluate(
    createContext({
      employees: [employeeA, employeeB],
      assignments,
    }),
  );

  const employeeAScore = result.scores.find(
    (score) => score.employee.id === employeeA.id,
  )!.score;

  const employeeBScore = result.scores.find(
    (score) => score.employee.id === employeeB.id,
  )!.score;

  expect(employeeAScore).toBe(-3);
  expect(employeeBScore).toBe(-4);

  expect(employeeAScore).toBeGreaterThan(employeeBScore);
});
it("combines double shift fairness with other factors", () => {
  const employee = createEmployee();

  const engine = new DefaultFairnessEngine([
    new ShiftCountFactor(),
    new DoubleShiftFactor(),
  ]);

  const result = engine.evaluate(
    createContext({
      employees: [employee],
      assignments: [
        {
          employeeId: employee.id,
          date: new Date("2026-08-24"),
          shiftType: "opening",
        },
        {
          employeeId: employee.id,
          date: new Date("2026-08-25"),
          shiftType: "double",
        },
      ],
    }),
  );

  expect(result.scores[0].score).toBe(-3);
});
});
