import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
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

describe("DoubleShiftValidator", () => {
  const validator = new DoubleShiftValidator();

  it("allows a double shift when the employee has no assignment that day", () => {
    const shift: ShiftAssignment = {
      employeeId: employee.id,
      date,
      shift: "double",
    };

    expect(validator.validate(employee, shift, [])).toBe(true);
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

    expect(validator.validate(employee, shift, assignments)).toBe(false);
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

    expect(validator.validate(employee, shift, assignments)).toBe(true);
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

    expect(validator.validate(employee, shift, assignments)).toBe(true);
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

    expect(validator.validate(employee, shift, assignments)).toBe(true);
  });
});
