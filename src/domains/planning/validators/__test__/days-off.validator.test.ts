import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { SchedulingPolicy } from "@/db/schema";
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

    expect(
      validator.validate(employee, proposedShift, assignments, createPolicy()),
    ).toBe(true);
  });

  it("allows an employee to work exactly five days", () => {
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
    ];

    const proposedShift = assignment("2026-08-28");

    expect(
      validator.validate(employee, proposedShift, assignments, createPolicy()),
    ).toBe(true);
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

    expect(
      validator.validate(employee, proposedShift, assignments, createPolicy()),
    ).toBe(false);
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

    expect(
      validator.validate(employee, proposedShift, assignments, createPolicy()),
    ).toBe(true);
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

    expect(
      validator.validate(employee, proposedShift, assignments, createPolicy()),
    ).toBe(true);
  });

  it("respects the policy's configured daysOffPerWeek, not a hardcoded value", () => {
    // Same five-worked-days scenario the "allows exactly five days" test
    // above passes with the default policy (daysOffPerWeek: 2) -- but a
    // restaurant requiring 3 days off (max 4 working days) should reject
    // it.
    const assignments = [
      assignment("2026-08-24"),
      assignment("2026-08-25"),
      assignment("2026-08-26"),
      assignment("2026-08-27"),
    ];

    const proposedShift = assignment("2026-08-28");

    expect(
      validator.validate(
        employee,
        proposedShift,
        assignments,
        createPolicy({ daysOffPerWeek: 3 }),
      ),
    ).toBe(false);
  });
});
