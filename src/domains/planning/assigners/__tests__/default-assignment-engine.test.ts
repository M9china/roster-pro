import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { StaffingRequirement } from "../../models/staffing-requirement";
import { DefaultAssignmentEngine } from "../default-assignment-engine";
import { DefaultValidationEngine } from "../../validators";

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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
    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

    const assignments = engine.assign(employees, requirement, date);

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

    const engine = new DefaultAssignmentEngine(new DefaultValidationEngine([]));

    const assignments = engine.assign(employees, requirement, date);

    expect(
      assignments.some((assignment) => assignment.shift === "double"),
    ).toBe(false);
  });

  describe("existingAssignments (cross-day context)", () => {
    it("returns only newly-created assignments, not the existingAssignments passed in", () => {
      const employees = [createEmployee({ id: "employee-1" })];
      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
      });

      const priorMonday = {
        employeeId: "employee-1",
        date: new Date("2026-08-24"),
        shift: "opening" as const,
      };

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
      );

      const assignments = engine.assign(employees, requirement, date, [
        priorMonday,
      ]);

      // Only today's new assignment, never the Monday one passed in -- the
      // caller (DefaultPlanningEngine) accumulates across days itself, so
      // returning existingAssignments back would double them up.
      expect(assignments).toHaveLength(1);
      expect(assignments[0].date.getTime()).toBe(date.getTime());
    });

    it("passes the full existingAssignments history through to the validator", () => {
      const employees = [createEmployee({ id: "employee-1" })];
      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
      });

      const seenAssignmentsLength: number[] = [];
      const spyValidator = {
        validate: (
          _employee: PlanningEmployee,
          _candidate: unknown,
          assignments: unknown[],
        ) => {
          seenAssignmentsLength.push(assignments.length);
          return true;
        },
      };

      const priorAssignments = [
        {
          employeeId: "employee-1",
          date: new Date("2026-08-24"),
          shift: "opening" as const,
        },
        {
          employeeId: "employee-1",
          date: new Date("2026-08-25"),
          shift: "mid" as const,
        },
      ];

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([spyValidator]),
      );

      engine.assign(employees, requirement, date, priorAssignments);

      // The validator should have seen both prior-week assignments already
      // in the array (length 2) before today's candidate is added -- this is
      // what actually lets DaysOffValidator/MinimumRestValidator see the
      // whole week instead of just today.
      expect(seenAssignmentsLength).toEqual([2]);
    });

    it("still enforces today's headcount correctly when existingAssignments include other days of the same shift type", () => {
      const employees = [
        createEmployee({ id: "employee-1" }),
        createEmployee({ id: "employee-2" }),
      ];
      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
      });

      // Five prior "opening" assignments from earlier in the week -- if the
      // headcount check weren't date-scoped, it would think today's opening
      // requirement (1) is already over-satisfied and assign no one.
      const priorAssignments = Array.from({ length: 5 }, (_, i) => ({
        employeeId: "employee-1",
        date: new Date(`2026-08-2${i + 1}`),
        shift: "opening" as const,
      }));

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        priorAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0].shift).toBe("opening");
    });

    it("allows an employee to work the same shift type again on a later day", () => {
      const employees = [createEmployee({ id: "employee-1" })];
      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
      });

      // employee-1 already worked "opening" on Monday -- without date
      // scoping on hasAssignmentForShift, they'd be blocked from ever
      // getting "opening" again for the rest of the week.
      const priorAssignments = [
        {
          employeeId: "employee-1",
          date: new Date("2026-08-24"),
          shift: "opening" as const,
        },
      ];

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        priorAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toMatchObject({
        employeeId: "employee-1",
        shift: "opening",
      });
    });

    it("still prevents same-day double-booking even with unrelated history present", () => {
      const employees = [createEmployee({ id: "employee-1" })];
      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 1,
        closingBartenders: 0,
      });

      const priorAssignments = [
        {
          employeeId: "employee-1",
          date: new Date("2026-08-24"),
          shift: "opening" as const,
        },
      ];

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
      );

      // employee-1 is the only employee, and today's "opening" slot takes
      // them -- "mid" should then find no one eligible, since they already
      // have a same-day assignment (not the unrelated Monday one).
      const assignments = engine.assign(
        employees,
        requirement,
        date,
        priorAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0].shift).toBe("opening");
    });
  });
});
