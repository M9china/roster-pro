import { describe, expect, it, vi } from "vitest";

import type { ServiceForecast } from "@/db/schema";

import type { PlanningEmployee } from "../../models/employee";
import type { ShiftAssignment } from "../../models/assigner";
import type { StaffingRequirement } from "../../models/staffing-requirement";

import type { StaffingCalculator } from "../../calculators/staffing-calculator";
import type { AssignmentEngine } from "../../assigners/assignment-engine";

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
    date: new Date("2026-08-24"),
    demandLevel: "normal",
    bookingCount: 50,
    ...overrides,
  } as ServiceForecast;
}

function createRequirement(): StaffingRequirement {
  return {
    totalBartenders: 3,
    openingBartenders: 1,
    midBartenders: 1,
    closingBartenders: 1,
    doubleShifts: 0,
    earlyFinishes: 0,
  };
}

function createAssignments(date: Date): ShiftAssignment[] {
  return [
    {
      employeeId: "employee-1",
      date,
      shift: "opening",
    },
    {
      employeeId: "employee-2",
      date,
      shift: "mid",
    },
    {
      employeeId: "employee-3",
      date,
      shift: "closing",
    },
  ];
}

describe("DefaultPlanningEngine", () => {
  it("calculates staffing requirements from the forecast", () => {
    const requirement = createRequirement();

    const staffingCalculator: StaffingCalculator = {
      calculate: vi.fn().mockReturnValue(requirement),
    };

    const assignmentEngine: AssignmentEngine = {
      assign: vi.fn().mockReturnValue([]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const employees = [createEmployee()];
    const forecast = createForecast();
    const date = new Date("2026-08-24");

    engine.generate(employees, forecast, date);

    expect(staffingCalculator.calculate).toHaveBeenCalledWith(forecast);
  });

  it("passes the calculated requirement to the assignment engine", () => {
    const requirement = createRequirement();

    const staffingCalculator: StaffingCalculator = {
      calculate: vi.fn().mockReturnValue(requirement),
    };

    const assignmentEngine: AssignmentEngine = {
      assign: vi.fn().mockReturnValue([]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const employees = [createEmployee()];
    const forecast = createForecast();
    const date = new Date("2026-08-24");

    engine.generate(employees, forecast, date);

    expect(assignmentEngine.assign).toHaveBeenCalledWith(
      employees,
      requirement,
      date,
    );
  });

  it("returns the assignments produced by the assignment engine", () => {
    const requirement = createRequirement();
    const date = new Date("2026-08-24");
    const assignments = createAssignments(date);

    const staffingCalculator: StaffingCalculator = {
      calculate: vi.fn().mockReturnValue(requirement),
    };

    const assignmentEngine: AssignmentEngine = {
      assign: vi.fn().mockReturnValue(assignments),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const result = engine.generate([createEmployee()], createForecast(), date);

    expect(result).toEqual(assignments);
  });

  it("uses the supplied employees when generating assignments", () => {
    const requirement = createRequirement();

    const employees = [
      createEmployee({
        id: "employee-1",
      }),
      createEmployee({
        id: "employee-2",
      }),
    ];

    const staffingCalculator: StaffingCalculator = {
      calculate: vi.fn().mockReturnValue(requirement),
    };

    const assignmentEngine: AssignmentEngine = {
      assign: vi.fn().mockReturnValue([]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    const forecast = createForecast();
    const date = new Date("2026-08-24");

    engine.generate(employees, forecast, date);

    expect(assignmentEngine.assign).toHaveBeenCalledWith(
      employees,
      requirement,
      date,
    );
  });

  it("does not calculate staffing more than once", () => {
    const requirement = createRequirement();

    const staffingCalculator: StaffingCalculator = {
      calculate: vi.fn().mockReturnValue(requirement),
    };

    const assignmentEngine: AssignmentEngine = {
      assign: vi.fn().mockReturnValue([]),
    };

    const engine = new DefaultPlanningEngine(
      staffingCalculator,
      assignmentEngine,
    );

    engine.generate(
      [createEmployee()],
      createForecast(),
      new Date("2026-08-24"),
    );

    expect(staffingCalculator.calculate).toHaveBeenCalledTimes(1);
  });
});
