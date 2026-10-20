import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { SchedulingPolicy } from "@/db/schema";
import { DoubleShiftValidator } from "../double-shift.validator";

const employee: PlanningEmployee = {
  id: "employee-1",
  firstName: "John",
  lastName: "Doe",
  role: "bartender",
  experienceLevel: "senior",
  employmentType: "full_time",
  active: true,
};

const date = new Date("2026-08-28");

function createPolicy(
  overrides: Partial<SchedulingPolicy> = {},
): SchedulingPolicy {
  return {
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
    ...overrides,
  };
}

describe("DoubleShiftValidator", () => {
  const validator = new DoubleShiftValidator();

  it("allows a double shift when the employee has no assignment that day", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    expect(validator.validate(employee, shift, [], createPolicy())).toBe(true);
  });

  it("rejects a double shift when the employee already has an assignment that day", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    const assignments: ShiftAssignment[] = [
      {
        employeeId: employee.id,
        date,
        shift: "opening",
      },
    ];

    expect(
      validator.validate(employee, shift, assignments, createPolicy()),
    ).toBe(false);
  });

  it("allows a normal shift when the employee already has another shift that day", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "closing",
    };

    const assignments: ShiftAssignment[] = [
      {
        employeeId: employee.id,
        date,
        shift: "opening",
      },
    ];

    expect(
      validator.validate(employee, shift, assignments, createPolicy()),
    ).toBe(true);
  });

  it("ignores assignments belonging to another employee", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-2",
        date,
        shift: "opening",
      },
    ];

    expect(
      validator.validate(employee, shift, assignments, createPolicy()),
    ).toBe(true);
  });

  it("allows a double shift when the previous assignment was on another day", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    const assignments: ShiftAssignment[] = [
      {
        employeeId: employee.id,
        date: new Date("2026-08-27"),
        shift: "closing",
      },
    ];

    expect(
      validator.validate(employee, shift, assignments, createPolicy()),
    ).toBe(true);
  });

  it("rejects a double shift outright when the policy disallows doubles", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    // Otherwise a perfectly clean case (no same-day conflict) -- the only
    // thing that should make this fail is allowDoubleShift: false.
    expect(
      validator.validate(
        employee,
        shift,
        [],
        createPolicy({ allowDoubleShift: false }),
      ),
    ).toBe(false);
  });
});
