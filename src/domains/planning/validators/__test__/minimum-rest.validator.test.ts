import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import { MinimumRestValidator } from "../minimum-rest.validator";

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

function createAssignment(
  overrides: Partial<ShiftAssignment> = {},
): ShiftAssignment {
  return {
    employeeId: "employee-1",
    date: new Date("2026-08-28"),
    shift: "closing",
    ...overrides,
  };
}

describe("MinimumRestValidator", () => {
  const validator = new MinimumRestValidator();

  it("allows an employee with no previous assignments", () => {
    const employee = createEmployee();

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, [])).toBe(true);
  });

  it("allows an opening shift after a non-closing shift", () => {
    const employee = createEmployee();

    const assignments = [
      createAssignment({
        date: new Date("2026-08-27"),
        shift: "mid",
      }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments)).toBe(true);
  });

  it("rejects an opening shift after a closing shift", () => {
    const employee = createEmployee();

    const assignments = [
      createAssignment({
        date: new Date("2026-08-27"),
        shift: "closing",
      }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments)).toBe(false);
  });

  it("allows a closing shift after a previous closing shift", () => {
    const employee = createEmployee();

    const assignments = [
      createAssignment({
        date: new Date("2026-08-27"),
        shift: "closing",
      }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "closing",
    });

    expect(validator.validate(employee, shift, assignments)).toBe(true);
  });

  it("ignores assignments from earlier dates", () => {
    const employee = createEmployee();

    const assignments = [
      createAssignment({
        date: new Date("2026-08-25"),
        shift: "closing",
      }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments)).toBe(true);
  });
});
