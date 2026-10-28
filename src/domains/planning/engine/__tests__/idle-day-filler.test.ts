import { describe, expect, it } from "vitest";

import type { SchedulingPolicy } from "@/db/schema";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import { DefaultValidationEngine } from "../../validators/validation-engine";
import { fillIdleDays } from "../idle-day-filler";

// 2026-09-14 is a Monday.
const WEEK_START = new Date("2026-09-14");
const day = (n: number) => new Date(Date.UTC(2026, 8, 14 + n));

function createEmployee(
  id: string,
  overrides: Partial<PlanningEmployee> = {},
): PlanningEmployee {
  return {
    id,
    firstName: "Test",
    lastName: id,
    role: "bartender",
    experienceLevel: "senior",
    employmentType: "full_time",
    active: true,
    ...overrides,
  };
}

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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

const noRules = new DefaultValidationEngine([]);

describe("fillIdleDays", () => {
  it("gives an employee with an empty day a supplementary early-finish shift", () => {
    // Works Mon-Thu and Sat, off Fri and Sun -> Friday is not blank here;
    // make Friday the blank: off Sat and Sun, nothing on Friday.
    const assignments: ShiftAssignment[] = [
      { employeeId: "e1", date: day(0), shift: "opening" },
      { employeeId: "e1", date: day(1), shift: "opening" },
      { employeeId: "e1", date: day(2), shift: "opening" },
      { employeeId: "e1", date: day(3), shift: "opening" },
      { employeeId: "e1", date: day(5), shift: "off" },
      { employeeId: "e1", date: day(6), shift: "off" },
    ];

    const result = fillIdleDays(
      [createEmployee("e1")],
      assignments,
      WEEK_START,
      createPolicy(),
      noRules,
    );

    const friday = result.assignments.filter(
      (a) => a.date.getTime() === day(4).getTime(),
    );

    expect(friday).toHaveLength(1);
    expect(friday[0].shift).not.toBe("off");
    expect(friday[0].isEarlyFinish).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("2026-09-18");
  });

  it("never touches days off", () => {
    const assignments: ShiftAssignment[] = [
      { employeeId: "e1", date: day(0), shift: "off" },
      { employeeId: "e1", date: day(1), shift: "off" },
    ];

    const result = fillIdleDays(
      [createEmployee("e1")],
      assignments,
      WEEK_START,
      createPolicy(),
      noRules,
    );

    expect(result.assignments.filter((a) => a.shift === "off")).toHaveLength(2);
    // Idle days get filled, but never beyond 5 working days.
    const working = result.assignments.filter((a) => a.shift !== "off");
    expect(working.length).toBeGreaterThan(0);
    expect(working.length).toBeLessThanOrEqual(5);
  });

  it("does not exceed the employee's working days per week", () => {
    const assignments: ShiftAssignment[] = [0, 1, 2, 3, 4].map((n) => ({
      employeeId: "e1",
      date: day(n),
      shift: "opening" as const,
    }));

    const result = fillIdleDays(
      [createEmployee("e1")],
      assignments,
      WEEK_START,
      createPolicy({ daysOffPerWeek: 2 }),
      noRules,
    );

    expect(result.assignments).toHaveLength(5);
    expect(result.warnings).toEqual([]);
  });

  it("ignores inactive employees", () => {
    const result = fillIdleDays(
      [createEmployee("e1", { active: false })],
      [],
      WEEK_START,
      createPolicy(),
      noRules,
    );

    expect(result.assignments).toEqual([]);
  });

  it("does not choose a shift that would leave too little rest before a later shift", () => {
    // Saturday opening starts 09:00. A Friday closing ends 02:00 Saturday
    // (7h rest) so it must not be chosen for the idle Friday.
    const assignments: ShiftAssignment[] = [
      { employeeId: "e1", date: day(0), shift: "off" },
      { employeeId: "e1", date: day(1), shift: "off" },
      { employeeId: "e1", date: day(5), shift: "opening" },
    ];

    const result = fillIdleDays(
      [createEmployee("e1")],
      assignments,
      WEEK_START,
      createPolicy(),
      noRules,
    );

    const friday = result.assignments.find(
      (a) => a.date.getTime() === day(4).getTime(),
    );

    expect(friday).toBeDefined();
    expect(friday?.shift).not.toBe("closing");
  });
});
