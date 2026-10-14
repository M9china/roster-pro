import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { SchedulingPolicy } from "@/db/schema";
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

// Matches the DB's default policy values, so hour arithmetic in these
// tests lines up with what a fresh restaurant actually gets.
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

describe("MinimumRestValidator", () => {
  const validator = new MinimumRestValidator();

  it("allows an employee with no previous assignments", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, [], policy)).toBe(true);
  });

  it("rejects a shift that doesn't leave the required rest gap", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    // Closing on the 27th: 15:00 -> 02:00 (rolls to the 28th, since its
    // configured end is earlier than its start). Opening on the 28th
    // starts 09:00. Gap: 02:00 -> 09:00 = 7 hours, short of the 11 hour
    // minimum.
    const assignments = [
      createAssignment({ date: new Date("2026-08-27"), shift: "closing" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(
      false,
    );
  });

  it("allows a shift once the elapsed gap meets the minimum", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    // Closing on the 27th ends 02:00 on the 28th. Closing again on the
    // 28th starts 15:00. Gap: 13 hours, clears the 11 hour minimum.
    const assignments = [
      createAssignment({ date: new Date("2026-08-27"), shift: "closing" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "closing",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(true);
  });

  it("allows a shift after a prior shift several days earlier", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    // Closing on the 25th ends 02:00 on the 26th. Opening on the 28th
    // starts 09:00 -- 55 hours later, comfortably clearing 11.
    const assignments = [
      createAssignment({ date: new Date("2026-08-25"), shift: "closing" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(true);
  });

  it("respects the policy's configured minimumRestHours, not a hardcoded value", () => {
    const employee = createEmployee();
    // Same 13-hour gap as the "allows once the minimum is met" case above,
    // but this restaurant requires 14 hours -- should now be rejected.
    const policy = createPolicy({ minimumRestHours: 14 });

    const assignments = [
      createAssignment({ date: new Date("2026-08-27"), shift: "closing" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "closing",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(
      false,
    );
  });

  it("correctly evaluates rest against a mid shift's dynamically-anchored window", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    // Opening on the 27th (this employee's first shift, so its window is
    // the fixed 09:00-17:00 policy window) ends 17:00. A mid shift on the
    // 28th is, by construction, anchored to start exactly
    // minimumRestHours (11h) after that -- 04:00 on the 28th. The
    // validator should independently compute the same 11-hour gap and
    // allow it (a boundary case: exactly the minimum, not more).
    const assignments = [
      createAssignment({ date: new Date("2026-08-27"), shift: "opening" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-28"),
      shift: "mid",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(true);
  });

  it("evaluates rest correctly when the prior shift was a double", () => {
    const employee = createEmployee();
    const policy = createPolicy();

    // Double on the 27th spans the full opening-start-to-closing-end
    // window: 09:00 -> 02:00 on the 28th (17 hours, already over the 12
    // hour floor, so no flooring needed here). Opening on the 29th starts
    // 09:00 -- 31 hours later.
    const assignments = [
      createAssignment({ date: new Date("2026-08-27"), shift: "double" }),
    ];

    const shift = createAssignment({
      date: new Date("2026-08-29"),
      shift: "opening",
    });

    expect(validator.validate(employee, shift, assignments, policy)).toBe(true);
  });
});
