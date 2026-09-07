import { describe, expect, it, vi } from "vitest";

import type { ServiceForecast } from "@/db/schema";

import type { PlanningEmployee } from "../../models/employee";
import type { PlanningContext } from "../planning-context";
import { DefaultPlanningEngine } from "../default-planning-engine";

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
    createdAt: new Date(),
    updatedAt: new Date(),
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
});
