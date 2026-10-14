import { describe, expect, it, vi } from "vitest";
import type { ServiceForecast } from "@/db/schema";
import { DefaultPlanningEngine } from "../default-planning-engine";
import { PlanningEmployee } from "../../models";
import { PlanningContext } from "../planning-context";

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

function createForecast(
  overrides: Partial<ServiceForecast> = {},
): ServiceForecast {
  return {
    id: "forecast-1",
    restaurantId: "restaurant-1",
    serviceDate: "2026-08-24",
    servicePeriod: "full_day",
    expectedReservations: 20,
    expectedWalkIns: 10,
    demandLevel: "normal",
    specialEvent: false,
    eventName: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createContext(
  overrides: Partial<PlanningContext> = {},
): PlanningContext {
  return {
    restaurantId: "restaurant-1",
    weekStart: new Date("2026-08-24"),
    employees: [createEmployee()],
    forecasts: [],
    policy: {
      id: "policy-1",
      restaurantId: "restaurant-1",
      defaultShiftHours: 8,
      minimumRestHours: 11,
      // Zero by default so existing tests that don't care about day-off
      // behavior aren't affected by day-off records getting seeded into
      // result.assignments. Tests that specifically exercise day-off
      // seeding override this explicitly -- see the "day-off allocation"
      // describe block below.
      daysOffPerWeek: 0,
      allowDoubleShift: true,
      allowEarlyFinish: true,
      openingShiftStart: "09:00:00",
      openingShiftEnd: "17:00:00",
      closingShiftStart: "15:00:00",
      closingShiftEnd: "02:00:00",
      version: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

describe("DefaultPlanningEngine - weekly planning", () => {
  it("returns an empty result when there are no forecasts", () => {
    const staffingCalculator = {
      calculate: vi.fn(),
    };

    const assignmentEngine = {
      assign: vi.fn(),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const result = engine.generateWeek(
      createContext({
        forecasts: [],
      }),
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("generates assignments for every forecast", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const forecasts = [
      createForecast({
        id: "forecast-1",
        serviceDate: "2026-08-24",
      }),
      createForecast({
        id: "forecast-2",
        serviceDate: "2026-08-25",
      }),
      createForecast({
        id: "forecast-3",
        serviceDate: "2026-08-26",
      }),
    ];

    const result = engine.generateWeek(createContext({ forecasts }));

    expect(result.assignments).toHaveLength(3);
    expect(assignmentEngine.assign).toHaveBeenCalledTimes(3);
  });

  it("uses the forecast service date for each day's assignments", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const forecasts = [
      createForecast({
        serviceDate: "2026-08-24",
      }),
      createForecast({
        id: "forecast-2",
        serviceDate: "2026-08-29",
      }),
    ];

    const result = engine.generateWeek(createContext({ forecasts }));

    expect(result.assignments[0].date).toEqual(new Date("2026-08-24"));

    expect(result.assignments[1].date).toEqual(new Date("2026-08-29"));
  });

  it("passes each forecast to the staffing calculator", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const forecastA = createForecast({
      id: "forecast-a",
      serviceDate: "2026-08-24",
      demandLevel: "low",
    });

    const forecastB = createForecast({
      id: "forecast-b",
      serviceDate: "2026-08-25",
      demandLevel: "high",
    });

    engine.generateWeek(
      createContext({
        forecasts: [forecastA, forecastB],
      }),
    );

    expect(staffingCalculator.calculate).toHaveBeenCalledTimes(2);
    expect(staffingCalculator.calculate).toHaveBeenNthCalledWith(1, forecastA);
    expect(staffingCalculator.calculate).toHaveBeenNthCalledWith(2, forecastB);
  });

  it("combines assignments from all forecast days into one result", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
        {
          employeeId: employees[0].id,
          date,
          shift: "closing" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const forecasts = [
      createForecast({
        serviceDate: "2026-08-24",
      }),
      createForecast({
        id: "forecast-2",
        serviceDate: "2026-08-25",
      }),
    ];

    const result = engine.generateWeek(createContext({ forecasts }));

    expect(result.assignments).toHaveLength(4);

    expect(
      result.assignments.filter(
        (assignment) =>
          assignment.date.getTime() === new Date("2026-08-24").getTime(),
      ),
    ).toHaveLength(2);

    expect(
      result.assignments.filter(
        (assignment) =>
          assignment.date.getTime() === new Date("2026-08-25").getTime(),
      ),
    ).toHaveLength(2);
  });

  it("reports a warning when a day's assignments fall short of its requirement", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 3,
        openingBartenders: 1,
        midBartenders: 1,
        closingBartenders: 1,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    // Simulates running out of eligible employees: only fills "opening",
    // leaving mid and closing unfilled -- exactly what AssignmentEngine
    // does silently when the roster can't cover demand.
    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const result = engine.generateWeek(
      createContext({
        forecasts: [createForecast({ serviceDate: "2026-08-24" })],
      }),
    );

    expect(result.warnings).toEqual([
      "2026-08-24: needed 1 mid bartender(s), only assigned 0.",
      "2026-08-24: needed 1 closing bartender(s), only assigned 0.",
    ]);
  });

  it("reports no warnings when every day is fully staffed", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const assignmentEngine = {
      assign: vi.fn((employees, requirement, date) => [
        {
          employeeId: employees[0].id,
          date,
          shift: "opening" as const,
        },
      ]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const result = engine.generateWeek(
      createContext({
        forecasts: [createForecast({ serviceDate: "2026-08-24" })],
      }),
    );

    expect(result.warnings).toEqual([]);
  });

  it("passes each day's accumulated assignments into the next day's assign() call", () => {
    const staffingCalculator = {
      calculate: vi.fn(() => ({
        totalBartenders: 1,
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        doubleShifts: 0,
        earlyFinishes: 0,
      })),
    };

    const receivedExistingAssignments: unknown[][] = [];

    const assignmentEngine = {
      assign: vi.fn(
        (
          employees: PlanningEmployee[],
          requirement: unknown,
          date: Date,
          policy: unknown,
          existingAssignments: unknown[] = [],
        ) => {
          receivedExistingAssignments.push([...existingAssignments]);

          return [
            {
              employeeId: employees[0].id,
              date,
              shift: "opening" as const,
            },
          ];
        },
      ),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    engine.generateWeek(
      createContext({
        // Neutralize day-off allocation here so this test stays focused
        // on cross-day assignment accumulation specifically -- day-off
        // seeding behavior has its own dedicated test file
        // (day-off-allocator.test.ts) and its own integration coverage
        // below.
        policy: {
          id: "policy-1",
          restaurantId: "restaurant-1",
          defaultShiftHours: 8,
          minimumRestHours: 11,
          daysOffPerWeek: 0,
          allowDoubleShift: true,
          allowEarlyFinish: true,
          openingShiftStart: "09:00:00",
          openingShiftEnd: "17:00:00",
          closingShiftStart: "15:00:00",
          closingShiftEnd: "02:00:00",
          version: 1,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        forecasts: [
          createForecast({ serviceDate: "2026-08-24" }),
          createForecast({ serviceDate: "2026-08-25" }),
          createForecast({ serviceDate: "2026-08-26" }),
        ],
      }),
    );

    // Day 1 starts with no prior context; day 2 should see day 1's
    // assignment; day 3 should see both. This is the actual wiring fix --
    // without it, every day would receive an empty array here, which is
    // exactly what let staff get scheduled every day of the week with no
    // day off, undetected, in production.
    expect(receivedExistingAssignments).toHaveLength(3);
    expect(receivedExistingAssignments[0]).toHaveLength(0);
    expect(receivedExistingAssignments[1]).toHaveLength(1);
    expect(receivedExistingAssignments[2]).toHaveLength(2);
  });

  describe("day-off allocation", () => {
    it("includes pre-allocated day-off records in the final result", () => {
      const staffingCalculator = {
        calculate: vi.fn(() => ({
          // Zero headcount needed: these tests exercise the day-off
          // *wiring* (are allocations seeded and passed through), not
          // capacity limits -- with a single employee and a non-zero
          // requirement, capacity would correctly compute to zero and no
          // day off could ever be allocated. Capacity math has its own
          // dedicated suite (day-off-allocator.test.ts).
          totalBartenders: 0,
          openingBartenders: 0,
          midBartenders: 0,
          closingBartenders: 0,
          doubleShifts: 0,
          earlyFinishes: 0,
        })),
      };

      const assignmentEngine = {
        assign: vi.fn((employees, requirement, date) => [
          { employeeId: employees[0].id, date, shift: "opening" as const },
        ]),
      };

      const engine = new DefaultPlanningEngine(
        staffingCalculator,
        assignmentEngine,
      );

      const result = engine.generateWeek(
        createContext({
          policy: {
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
          },
          forecasts: [createForecast({ serviceDate: "2026-08-26" })],
        }),
      );

      const offRecords = result.assignments.filter((a) => a.shift === "off");

      expect(offRecords).toHaveLength(2);
      expect(offRecords.every((a) => a.employeeId === "employee-1")).toBe(true);
    });

    it("passes day-off allocations to assign() from the very first day, not just accumulated from real shifts", () => {
      const staffingCalculator = {
        calculate: vi.fn(() => ({
          // Zero headcount needed: these tests exercise the day-off
          // *wiring* (are allocations seeded and passed through), not
          // capacity limits -- with a single employee and a non-zero
          // requirement, capacity would correctly compute to zero and no
          // day off could ever be allocated. Capacity math has its own
          // dedicated suite (day-off-allocator.test.ts).
          totalBartenders: 0,
          openingBartenders: 0,
          midBartenders: 0,
          closingBartenders: 0,
          doubleShifts: 0,
          earlyFinishes: 0,
        })),
      };

      const receivedExistingAssignments: unknown[][] = [];

      const assignmentEngine = {
        assign: vi.fn(
          (
            employees: PlanningEmployee[],
            requirement: unknown,
            date: Date,
            policy: unknown,
            existingAssignments: unknown[] = [],
          ) => {
            receivedExistingAssignments.push([...existingAssignments]);

            return [
              { employeeId: employees[0].id, date, shift: "opening" as const },
            ];
          },
        ),
      };

      const engine = new DefaultPlanningEngine(
        staffingCalculator,
        assignmentEngine,
      );

      engine.generateWeek(
        createContext({
          policy: {
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
          },
          forecasts: [createForecast({ serviceDate: "2026-08-26" })],
        }),
      );

      // Even on the first (and only) forecast day, assign() should already
      // see the week's 2 pre-allocated day-off records -- they're decided
      // up front, not accumulated only as real shifts get made.
      expect(receivedExistingAssignments[0]).toHaveLength(2);
    });

    it("drops the day-off record and warns when the assignment engine converts it into a shift", () => {
      // Zero-headcount calculator => the lone employee is allocated 2 days
      // off (Mon 24th and Tue 25th with the default week start).
      const staffingCalculator = {
        calculate: vi.fn(() => ({
          totalBartenders: 0,
          openingBartenders: 0,
          midBartenders: 0,
          closingBartenders: 0,
          doubleShifts: 0,
          earlyFinishes: 0,
        })),
      };

      // Stands in for the real engine's never-blank fallback: it covers
      // Monday with the very employee who has Monday off.
      const assignmentEngine = {
        assign: vi.fn((employees, requirement, date) => [
          {
            employeeId: employees[0].id,
            date,
            shift: "closing" as const,
            isEarlyFinish: true,
          },
        ]),
      };

      const engine = new DefaultPlanningEngine(
        staffingCalculator,
        assignmentEngine,
      );

      const result = engine.generateWeek(
        createContext({
          policy: {
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
          },
          forecasts: [createForecast({ serviceDate: "2026-08-24" })],
        }),
      );

      const monday = result.assignments.filter(
        (a) => a.date.getTime() === new Date("2026-08-24").getTime(),
      );

      // Exactly one record for that employee/day -- the shift, not also an
      // "off" (which would violate the table's one-row-per-day constraint).
      expect(monday).toHaveLength(1);
      expect(monday[0].shift).toBe("closing");

      // Tuesday's day off is untouched.
      expect(result.assignments.filter((a) => a.shift === "off")).toHaveLength(
        1,
      );

      expect(
        result.warnings.some((warning) =>
          warning.includes("day off was converted"),
        ),
      ).toBe(true);
    });
  });
});
