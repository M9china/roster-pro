import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import { DaysOffValidator } from "../days-off.validator";

const employee: PlanningEmployee = {
  id: "employee-1",
  firstName: "John",
  lastName: "Doe",
  role: "bartender",
  experienceLevel: "senior",
  employmentType: "full_time",
  active: true,
};

function assignment(
  date: string,
  shift: ShiftAssignment["shift"] = "opening",
): ShiftAssignment {
  return {
    employeeId: employee.id,
    date: new Date(date),
    shift,
  };
}

describe("DaysOffValidator", () => {
  const validator = new DaysOffValidator();

  it("allows an employee with fewer than five worked days", () => {
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
    ];

    const proposedShift = assignment("2026-08-27");

    expect(validator.validate(employee, proposedShift, assignments)).toBe(true);
  });

  it("allows an employee to work exactly five days", () => {
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
    ];

    const proposedShift = assignment("2026-08-28");

    expect(validator.validate(employee, proposedShift, assignments)).toBe(true);
  });

  it("rejects a sixth worked day in the same week", () => {
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
      assignment("2026-08-28"),
    ];

    const proposedShift = assignment("2026-08-29");

    expect(validator.validate(employee, proposedShift, assignments)).toBe(
      false,
    );
  });

  it("ignores assignments from another employee", () => {
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
      {
        employeeId: "employee-2",
        date: new Date("2026-08-28"),
        shift: "opening" as const,
      },
    ];

    const proposedShift = assignment("2026-08-28");

    expect(validator.validate(employee, proposedShift, assignments)).toBe(true);
  });

  it("does not count multiple shifts on the same day as multiple worked days", () => {
    const assignments = [
      assignment("2026-08-24", "opening"),
      assignment("2026-08-24", "double"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
    ];

    const proposedShift = assignment("2026-08-28");

    expect(validator.validate(employee, proposedShift, assignments)).toBe(true);
  });
});
