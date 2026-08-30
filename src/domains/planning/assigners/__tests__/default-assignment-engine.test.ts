import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { StaffingRequirement } from "../../models/staffing-requirement";
import { DefaultAssignmentEngine } from "../default-assignment-engine";

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

function createRequirement(
  overrides: Partial<StaffingRequirement> = {},
): StaffingRequirement {
  return {
    totalBartenders: 4,
    openingBartenders: 1,
    midBartenders: 1,
    closingBartenders: 2,
    doubleShifts: 0,
    earlyFinishes: 0,
    ...overrides,
  };
}

describe("DefaultAssignmentEngine", () => {
  const date = new Date("2026-08-28");

  it("assigns the required number of opening bartenders", () => {
    const employees = [
      createEmployee({ id: "employee-1" }),
      createEmployee({ id: "employee-2" }),
      createEmployee({ id: "employee-3" }),
    ];

    const requirement = createRequirement({
      totalBartenders: 1,
      openingBartenders: 1,
      midBartenders: 0,
      closingBartenders: 0,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      employeeId: "employee-1",
      shift: "opening",
      date,
    });
  });

  it("assigns the required number of mid bartenders", () => {
    const employees = [
      createEmployee({ id: "employee-1" }),
      createEmployee({ id: "employee-2" }),
    ];

    const requirement = createRequirement({
      totalBartenders: 1,
      openingBartenders: 0,
      midBartenders: 1,
      closingBartenders: 0,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      employeeId: "employee-1",
      shift: "mid",
      date,
    });
  });

  it("assigns the required number of closing bartenders", () => {
    const employees = [
      createEmployee({ id: "employee-1" }),
      createEmployee({ id: "employee-2" }),
      createEmployee({ id: "employee-3" }),
    ];

    const requirement = createRequirement({
      totalBartenders: 2,
      openingBartenders: 0,
      midBartenders: 0,
      closingBartenders: 2,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(2);

    expect(
      assignments.every((assignment) => assignment.shift === "closing"),
    ).toBe(true);
  });

  it("ignores inactive employees", () => {
    const employees = [
      createEmployee({
        id: "inactive",
        active: false,
      }),
      createEmployee({
        id: "active",
        active: true,
      }),
    ];

    const requirement = createRequirement({
      totalBartenders: 1,
      openingBartenders: 1,
      midBartenders: 0,
      closingBartenders: 0,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(1);
    expect(assignments[0].employeeId).toBe("active");
  });

  it("does not assign more employees than are available", () => {
    const employees = [
      createEmployee({ id: "employee-1" }),
      createEmployee({ id: "employee-2" }),
    ];

    const requirement = createRequirement({
      totalBartenders: 4,
      openingBartenders: 2,
      midBartenders: 1,
      closingBartenders: 1,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(2);
  });

  it("uses the supplied date for every assignment", () => {
    const employees = [
      createEmployee({ id: "employee-1" }),
      createEmployee({ id: "employee-2" }),
      createEmployee({ id: "employee-3" }),
    ];

    const requirement = createRequirement({
      totalBartenders: 3,
      openingBartenders: 1,
      midBartenders: 1,
      closingBartenders: 1,
    });

    const engine = new DefaultAssignmentEngine();

    const assignments = engine.assign(employees, requirement, date);

    expect(assignments).toHaveLength(3);

    expect(
      assignments.every(
        (assignment) => assignment.date.getTime() === date.getTime(),
      ),
    ).toBe(true);
  });
  it("assigns double shifts when required", () => {
  const employees = [
    createEmployee({ id: "employee-1" }),
    createEmployee({ id: "employee-2" }),
    createEmployee({ id: "employee-3" }),
  ];

  const requirement = createRequirement({
    totalBartenders: 3,
    openingBartenders: 1,
    midBartenders: 1,
    closingBartenders: 1,
    doubleShifts: 1,
  });

  const engine = new DefaultAssignmentEngine();

  const assignments = engine.assign(
    employees,
    requirement,
    date,
  );

  const doubleShifts = assignments.filter(
    (assignment) => assignment.shift === "double",
  );

  expect(doubleShifts).toHaveLength(1);
});
it("does not create double shifts when none are required", () => {
  const employees = [
    createEmployee({ id: "employee-1" }),
    createEmployee({ id: "employee-2" }),
    createEmployee({ id: "employee-3" }),
  ];

  const requirement = createRequirement({
    totalBartenders: 3,
    openingBartenders: 1,
    midBartenders: 1,
    closingBartenders: 1,
    doubleShifts: 0,
  });

  const engine = new DefaultAssignmentEngine();

  const assignments = engine.assign(
    employees,
    requirement,
    date,
  );

  expect(
    assignments.some(
      (assignment) => assignment.shift === "double",
    ),
  ).toBe(false);
});
});
