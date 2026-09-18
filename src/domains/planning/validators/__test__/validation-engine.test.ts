import { describe, expect, it, vi } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { AssignmentValidator } from "../validator";
import type { SchedulingPolicy } from "@/db/schema";
import {
  DefaultValidationEngine,
  ValidationEngine,
} from "../validation-engine";

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

const policy: SchedulingPolicy = {
  id: "policy-1",
  restaurantId: "restaurant-1",
  defaultShiftHours: 8,
  minimumRestHours: 11,
  daysOffPerWeek: 2,
  allowDoubleShift: true,
  allowEarlyFinish: true,
  openingShiftStart: "09:00:00",
  openingShiftEnd: "17:00:00",
  closingShiftStart: "15:00:00",
  closingShiftEnd: "02:00:00",
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ValidationEngine", () => {
  it("accepts an assignment when all validators pass", () => {
    const validatorOne: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const validatorTwo: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const engine = new DefaultValidationEngine([validatorOne, validatorTwo]);

    const result = engine.validate(employee, shift, [], policy);

    expect(result).toBe(true);
  });

  it("rejects an assignment when one validator fails", () => {
    const passingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const failingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(false),
    };

    const engine = new DefaultValidationEngine([
      passingValidator,
      failingValidator,
    ]);

    const result = engine.validate(employee, shift, [], policy);

    expect(result).toBe(false);
  });

  it("rejects an assignment when the first validator fails", () => {
    const failingValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(false),
    };

    const secondValidator: AssignmentValidator = {
      validate: vi.fn().mockReturnValue(true),
    };

    const engine = new DefaultValidationEngine([
      failingValidator,
      secondValidator,
    ]);

    const result = engine.validate(employee, shift, [], policy);

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

    const engine = new DefaultValidationEngine([validator]);

    engine.validate(employee, shift, existingAssignments, policy);

    expect(validator.validate).toHaveBeenCalledWith(
      employee,
      shift,
      existingAssignments,
      policy,
    );
  });

  it("allows validation when there are no validators", () => {
    const engine = new DefaultValidationEngine([]);

    const result = engine.validate(employee, shift, [], policy);

    expect(result).toBe(true);
  });
});
