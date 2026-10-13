import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { SchedulingPolicy, ServiceForecast } from "@/db/schema";
import type { StaffingCalculator } from "../../calculators/staffing-calculator";
import type { StaffingRequirement } from "../../models/staffing-requirement";
import { allocateDaysOff } from "../../days-off-allocator";

// 2026-09-14 is a Monday: Mon 14, Tue 15, Wed 16, Thu 17, Fri 18, Sat 19,
// Sun 20 -- Friday and Sunday are the hard-capped-at-1 days.
const WEEK_START = new Date("2026-09-14");
const MON = "2026-09-14";
const TUE = "2026-09-15";
const WED = "2026-09-16";
const THU = "2026-09-17";
const FRI = "2026-09-18";
const SAT = "2026-09-19";
const SUN = "2026-09-20";

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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

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
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// A controllable stand-in for DefaultStaffingCalculator: puts the entire
// headcount into "closingBartenders" so requiredHeadcount's sum across all
// four fields equals exactly the number given per demand level, with no
// need to reason about an opening/mid/closing/double split in these tests.
const BASELINE_HEADCOUNT: Record<ServiceForecast["demandLevel"], number> = {
  very_low: 2,
  low: 3,
  normal: 5,
  high: 6,
  very_high: 8,
};

function mockStaffingCalculator(): StaffingCalculator {
  return {
    calculate: (forecast: ServiceForecast): StaffingRequirement => ({
      totalBartenders: BASELINE_HEADCOUNT[forecast.demandLevel],
      openingBartenders: 0,
      midBartenders: 0,
      closingBartenders: BASELINE_HEADCOUNT[forecast.demandLevel],
      doubleShifts: 0,
      earlyFinishes: 0,
    }),
  };
}

describe("allocateDaysOff", () => {
  it("gives each active employee their entitled days off when capacity comfortably allows it", () => {
    // very_low demand all week -- plenty of slack capacity everywhere.
    const employees = ["e1", "e2", "e3", "e4"].map(createEmployee);
    const policy = createPolicy({ daysOffPerWeek: 2 });
    const forecasts = [MON, TUE, WED, THU, SAT].map((d) =>
      createForecast(d, "very_low"),
    );

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      policy,
      forecasts,
      mockStaffingCalculator(),
    );

    for (const employee of employees) {
      const count = allocations.filter(
        (a) => a.employeeId === employee.id,
      ).length;
      expect(count).toBe(2);
    }
  });

  it("marks every allocation with shift: 'off'", () => {
    const employees = [createEmployee("e1")];
    const forecasts = [createForecast(MON, "very_low")];

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      createPolicy(),
      forecasts,
      mockStaffingCalculator(),
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
      mockStaffingCalculator(),
    );

    expect(allocations.some((a) => a.employeeId === "e2")).toBe(false);
  });

  it("never allocates more days off on a day than that day's actual capacity allows", () => {
    // 8 employees, Thursday at "high" demand -> needs 6, leaving capacity
    // for only 2 people to be off that day, regardless of how the
    // round-robin would otherwise distribute things.
    const employees = Array.from({ length: 8 }, (_, i) =>
      createEmployee(`e${i}`),
    );
    const policy = createPolicy({ daysOffPerWeek: 2 });
    const forecasts = [
      createForecast(MON, "normal"),
      createForecast(TUE, "normal"),
      createForecast(WED, "low"),
      createForecast(THU, "high"),
      createForecast(SAT, "normal"),
    ];

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      policy,
      forecasts,
      mockStaffingCalculator(),
    );

    const thursdayOffCount = allocations.filter(
      (a) => isoDate(a.date) === THU,
    ).length;

    // capacity = 8 employees - 6 needed = 2
    expect(thursdayOffCount).toBeLessThanOrEqual(2);
  });

  it("respects the Friday/Sunday hard cap of 1 even when supply-based capacity would allow more", () => {
    // very_low demand everywhere, including Friday/Sunday -- supply-based
    // capacity would allow nearly the whole roster off, but the hard cap
    // still applies.
    const employees = Array.from({ length: 6 }, (_, i) =>
      createEmployee(`e${i}`),
    );
    const policy = createPolicy({ daysOffPerWeek: 2 });
    const forecasts = [MON, TUE, WED, THU, FRI, SAT, SUN].map((d) =>
      createForecast(d, "very_low"),
    );

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      policy,
      forecasts,
      mockStaffingCalculator(),
    );

    const fridayCount = allocations.filter(
      (a) => isoDate(a.date) === FRI,
    ).length;
    const sundayCount = allocations.filter(
      (a) => isoDate(a.date) === SUN,
    ).length;

    expect(fridayCount).toBeLessThanOrEqual(1);
    expect(sundayCount).toBeLessThanOrEqual(1);
  });

  it("treats a day with no forecast as 'normal' demand rather than unlimited capacity", () => {
    // No forecast at all for Thursday -- should still be capacity-limited
    // (8 - 5 = 3 for "normal"), not treated as having nobody needed.
    const employees = Array.from({ length: 8 }, (_, i) =>
      createEmployee(`e${i}`),
    );
    const policy = createPolicy({ daysOffPerWeek: 2 });

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      policy,
      [], // no forecasts at all
      mockStaffingCalculator(),
    );

    const thursdayOffCount = allocations.filter(
      (a) => isoDate(a.date) === THU,
    ).length;

    expect(thursdayOffCount).toBeLessThanOrEqual(3);
  });

  it("lets employees fall short of their full entitlement when total week capacity can't cover everyone, rather than overloading any single day", () => {
    // Reproduces the real reported pattern: normal/normal/low/high/
    // very_high/very_high/normal across the week for an 8-person roster.
    // Per-day capacity (roster 8 minus that day's need, with Friday and
    // Sunday additionally capped at 1):
    //   Mon 8-5=3, Tue 8-5=3, Wed 8-3=5, Thu 8-6=2,
    //   Fri min(1, 8-8=0)=0, Sat 8-8=0, Sun min(1, 8-5=3)=1  => 14 total.
    // Everyone's entitlement is 8*2=16, so capacity is short by 2 -- some
    // employees must end up with fewer than 2 days off this week. That is
    // the correct, accepted trade-off: better than forcing any day below
    // what it needs.
    const employees = Array.from({ length: 8 }, (_, i) =>
      createEmployee(`e${i}`),
    );
    const policy = createPolicy({ daysOffPerWeek: 2 });
    const forecasts = [
      createForecast(MON, "normal"),
      createForecast(TUE, "normal"),
      createForecast(WED, "low"),
      createForecast(THU, "high"),
      createForecast(FRI, "very_high"),
      createForecast(SAT, "very_high"),
      createForecast(SUN, "normal"),
    ];

    const allocations = allocateDaysOff(
      employees,
      WEEK_START,
      policy,
      forecasts,
      mockStaffingCalculator(),
    );

    // No day should ever exceed its computed capacity.
    const perDayCounts = new Map<string, number>();
    for (const allocation of allocations) {
      const key = isoDate(allocation.date);
      perDayCounts.set(key, (perDayCounts.get(key) ?? 0) + 1);
    }

    expect(perDayCounts.get(MON) ?? 0).toBeLessThanOrEqual(3);
    expect(perDayCounts.get(TUE) ?? 0).toBeLessThanOrEqual(3);
    expect(perDayCounts.get(WED) ?? 0).toBeLessThanOrEqual(5);
    expect(perDayCounts.get(THU) ?? 0).toBeLessThanOrEqual(2);
    expect(perDayCounts.get(FRI) ?? 0).toBe(0);
    expect(perDayCounts.get(SAT) ?? 0).toBe(0);
    // Sunday is "normal" demand here: supply allows 3 off, but the
    // Friday/Sunday hard cap holds it to 1.
    expect(perDayCounts.get(SUN) ?? 0).toBeLessThanOrEqual(1);

    // At least some employees should have fallen short of the full
    // 2-day entitlement, given capacity (14) is less than demand (16).
    const shortfallCount = employees.filter((employee) => {
      const count = allocations.filter(
        (a) => a.employeeId === employee.id,
      ).length;
      return count < 2;
    }).length;

    expect(shortfallCount).toBeGreaterThan(0);

    // And nobody should ever end up with MORE than their entitlement.
    for (const employee of employees) {
      const count = allocations.filter(
        (a) => a.employeeId === employee.id,
      ).length;
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("returns no allocations when there are no active employees", () => {
    const employees: PlanningEmployee[] = [
      { ...createEmployee("e1"), active: false },
    ];

    expect(
      allocateDaysOff(
        employees,
        WEEK_START,
        createPolicy(),
        [],
        mockStaffingCalculator(),
      ),
    ).toEqual([]);
  });
});
