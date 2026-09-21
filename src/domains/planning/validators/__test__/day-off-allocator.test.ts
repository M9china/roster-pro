import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { SchedulingPolicy, ServiceForecast } from "@/db/schema";
import { allocateDaysOff } from "../../days-off-allocator";

// 2026-09-14 is a Monday: Mon 14, Tue 15, Wed 16, Thu 17, Fri 18, Sat 19,
// Sun 20 -- Friday and Sunday are the capped days.
const WEEK_START = new Date("2026-09-14");
const FRIDAY_ISO = "2026-09-18";
const SUNDAY_ISO = "2026-09-20";

function createEmployee(id: string): PlanningEmployee {
  return {
    id,
    firstName: "Test",
    lastName: id,
    role: "bartender",
    experienceLevel: "senior",
    employmentType: "full_time",
    active: true,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("allocateDaysOff", () => {
  it("gives each active employee exactly their policy-entitled number of days off", () => {
    const employees = ["e1", "e2", "e3", "e4"].map(createEmployee);
    const policy = createPolicy({ daysOffPerWeek: 2 });

    const allocations = allocateDaysOff(employees, WEEK_START, policy, []);

    for (const employee of employees) {
      const count = allocations.filter(
        (a) => a.employeeId === employee.id,
      ).length;
      expect(count).toBe(2);
    }
  });

  it("marks every allocation with shift: 'off'", () => {
    const employees = [createEmployee("e1")];
    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      createPolicy(),
      [],
    );

    expect(allocations.every((a) => a.shift === "off")).toBe(true);
  });

  it("excludes inactive employees entirely", () => {
    const employees: PlanningEmployee[] = [
      createEmployee("e1"),
      { ...createEmployee("e2"), active: false },
    ];

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      createPolicy(),
      [],
    );

    expect(allocations.some((a) => a.employeeId === "e2")).toBe(false);
    expect(allocations.filter((a) => a.employeeId === "e1")).toHaveLength(2);
  });

  it("spreads days off across employees rather than clustering everyone on the same day", () => {
    const employees = ["e1", "e2", "e3", "e4", "e5"].map(createEmployee);
    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      createPolicy(),
      [],
    );

    const mondayCount = allocations.filter(
      (a) => isoDate(a.date) === "2026-09-14",
    ).length;

    // With 5 employees and 2 days off each spread round-robin across 5
    // unconstrained days, no single day should end up with everyone on it.
    expect(mondayCount).toBeLessThan(employees.length);
  });

  it("never allocates more than one employee off on Friday, even under pressure", () => {
    // daysOffPerWeek: 6 forces every employee to need a 6th day beyond the
    // 5 unconstrained ones -- exactly the scenario that exercises the cap.
    const employees = ["e1", "e2", "e3", "e4"].map(createEmployee);
    const policy = createPolicy({ daysOffPerWeek: 6 });

    const allocations = allocateDaysOff(employees, WEEK_START, policy, []);

    const fridayCount = allocations.filter(
      (a) => isoDate(a.date) === FRIDAY_ISO,
    ).length;

    expect(fridayCount).toBeLessThanOrEqual(1);
  });

  it("never allocates more than one employee off on Sunday, even under pressure", () => {
    const employees = ["e1", "e2", "e3", "e4"].map(createEmployee);
    const policy = createPolicy({ daysOffPerWeek: 6 });

    const allocations = allocateDaysOff(employees, WEEK_START, policy, []);

    const sundayCount = allocations.filter(
      (a) => isoDate(a.date) === SUNDAY_ISO,
    ).length;

    expect(sundayCount).toBeLessThanOrEqual(1);
  });

  it("lets some employees fall short of their full entitlement when demand for capped days exceeds the cap", () => {
    // 4 employees each need a 6th day; only 2 capped slots exist (1
    // Friday + 1 Sunday) to hand out beyond the 5 unconstrained days --
    // so at least 2 employees end up with only 5 days off, not 6. This is
    // an accepted trade-off of a hard cap, not a bug.
    const employees = ["e1", "e2", "e3", "e4"].map(createEmployee);
    const policy = createPolicy({ daysOffPerWeek: 6 });

    const allocations = allocateDaysOff(employees, WEEK_START, policy, []);

    const shortfallCount = employees.filter((employee) => {
      const count = allocations.filter(
        (a) => a.employeeId === employee.id,
      ).length;
      return count < 6;
    }).length;

    expect(shortfallCount).toBeGreaterThanOrEqual(2);
  });

  it("returns no allocations when there are no active employees", () => {
    const employees: PlanningEmployee[] = [
      { ...createEmployee("e1"), active: false },
    ];

    expect(allocateDaysOff(employees, WEEK_START, createPolicy(), [])).toEqual(
      [],
    );
  });

  describe("demand-awareness", () => {
    function createForecast(
      serviceDate: string,
      demandLevel: ServiceForecast["demandLevel"],
    ): ServiceForecast {
      return {
        id: `forecast-${serviceDate}`,
        restaurantId: "restaurant-1",
        serviceDate,
        servicePeriod: "full_day",
        expectedReservations: 0,
        expectedWalkIns: 0,
        demandLevel,
        specialEvent: false,
        eventName: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    it("avoids allocating days off on the week's highest-demand day when other days can absorb the entitlement", () => {
      const employees = ["e1", "e2", "e3", "e4", "e5", "e6"].map(
        createEmployee,
      );
      const policy = createPolicy({ daysOffPerWeek: 2 });

      const forecasts = [
        createForecast("2026-09-14", "normal"), // Mon
        createForecast("2026-09-15", "normal"), // Tue
        createForecast("2026-09-16", "low"), // Wed
        createForecast("2026-09-17", "normal"), // Thu
        createForecast("2026-09-19", "very_high"), // Sat -- should be avoided
      ];

      const allocations = allocateDaysOff(
        employees,
        WEEK_START,
        policy,
        forecasts,
      );

      const saturdayCount = allocations.filter(
        (a) => isoDate(a.date) === "2026-09-19",
      ).length;

      expect(saturdayCount).toBe(0);
    });

    it("still gives every employee their full entitlement while avoiding the busy day", () => {
      const employees = ["e1", "e2", "e3", "e4", "e5", "e6"].map(
        createEmployee,
      );
      const policy = createPolicy({ daysOffPerWeek: 2 });

      const forecasts = [createForecast("2026-09-19", "very_high")];

      const allocations = allocateDaysOff(
        employees,
        WEEK_START,
        policy,
        forecasts,
      );

      for (const employee of employees) {
        const count = allocations.filter(
          (a) => a.employeeId === employee.id,
        ).length;
        expect(count).toBe(2);
      }
    });

    it("falls back to including the highest-demand day when the entitlement can't be covered without it", () => {
      // daysOffPerWeek: 5 needs more days than the 4-day reduced pool
      // (Mon/Tue/Wed/Thu) can provide -- Saturday must come back into
      // play even though it's forecasted as the busiest day.
      const employees = ["e1", "e2"].map(createEmployee);
      const policy = createPolicy({ daysOffPerWeek: 5 });

      const forecasts = [createForecast("2026-09-19", "very_high")];

      const allocations = allocateDaysOff(
        employees,
        WEEK_START,
        policy,
        forecasts,
      );

      const saturdayCount = allocations.filter(
        (a) => isoDate(a.date) === "2026-09-19",
      ).length;

      expect(saturdayCount).toBeGreaterThan(0);

      for (const employee of employees) {
        const count = allocations.filter(
          (a) => a.employeeId === employee.id,
        ).length;
        expect(count).toBe(5);
      }
    });

    it("treats a day with no forecast as neutral demand, neither preferred nor avoided", () => {
      // Only Wednesday has a forecast (very_low -- the most attractive
      // day); the rest are unforecasted. The allocator shouldn't crash or
      // misbehave on missing data, and should still respect the
      // entitlement and caps.
      const employees = ["e1", "e2", "e3"].map(createEmployee);
      const policy = createPolicy({ daysOffPerWeek: 2 });

      const forecasts = [createForecast("2026-09-16", "very_low")];

      const allocations = allocateDaysOff(
        employees,
        WEEK_START,
        policy,
        forecasts,
      );

      for (const employee of employees) {
        const count = allocations.filter(
          (a) => a.employeeId === employee.id,
        ).length;
        expect(count).toBe(2);
      }

      const fridayCount = allocations.filter(
        (a) => isoDate(a.date) === FRIDAY_ISO,
      ).length;
      expect(fridayCount).toBeLessThanOrEqual(1);
    });
  });
});
