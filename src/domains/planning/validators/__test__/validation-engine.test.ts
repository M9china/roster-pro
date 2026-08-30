import { describe, expect, it, vi } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { AssignmentValidator } from "../validator";
import { ValidationEngine } from "../validation-engine";

const employee: PlanningEmployee = {
  id: "employee-1",
  firstName: "John",
  lastName: "Doe",
  role: "bartender",
  experienceLevel: "senior",
  employmentType: "full_time",
  active: true,
};

const shift: ShiftAssignment = {
  employeeId: "employee-1",
  date: new Date("2026-08-28"),
  shift: "opening",
};

describe("ValidationEngine", () => {
  it("accepts an assignment when all validators pass", () => {
    const validatorOne: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const validatorTwo: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const engine = new ValidationEngine([validatorOne, validatorTwo]);

    const result = engine.validate(employee, shift, []);

    expect(result).toBe(true);
  });

  it("rejects an assignment when one validator fails", () => {
    const passingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const failingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(false),
    };

    const engine = new ValidationEngine([passingValidator, failingValidator]);

    const result = engine.validate(employee, shift, []);

    expect(result).toBe(false);
  });

  it("rejects an assignment when the first validator fails", () => {
    const failingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(false),
    };

    const secondValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const engine = new ValidationEngine([failingValidator, secondValidator]);

    const result = engine.validate(employee, shift, []);

    expect(result).toBe(false);
  });

  it("calls validators with the correct arguments", () => {
    const validator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const existingAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-2",
        date: new Date("2026-08-27"),
        shift: "closing",
      },
    ];

    const engine = new ValidationEngine([validator]);

    engine.validate(employee, shift, existingAssignments);

    expect(validator.validate).toHaveBeenCalledWith(
      employee,
      shift,
      existingAssignments,
    );
  });

  it("allows validation when there are no validators", () => {
    const engine = new ValidationEngine([]);

    const result = engine.validate(employee, shift, []);

    expect(result).toBe(true);
  });
});
