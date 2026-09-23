import { describe, expect, it } from "vitest";

import type { PlanningEmployee } from "../../models/employee";
import type { StaffingRequirement } from "../../models/staffing-requirement";
import type { ShiftAssignment } from "../../models/assigner";
import { DefaultAssignmentEngine } from "../default-assignment-engine";
import { DefaultValidationEngine } from "../../validators";
import { DefaultFairnessEngine } from "../../fairness/default-fairness-engine";
import { ShiftCountFactor } from "../../fairness/factors/shift-count-factor";
import type { SchedulingPolicy } from "@/db/schema";

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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
    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
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

    const engine = new DefaultAssignmentEngine(
      new DefaultValidationEngine([]),
      new DefaultFairnessEngine([]),
    );

    const assignments = engine.assign(
      employees,
      requirement,
      date,
      createPolicy(),
    );

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
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
        [priorMonday],
      );

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
        new DefaultFairnessEngine([]),
      );

      engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
        priorAssignments,
      );

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
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
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
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
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
        new DefaultFairnessEngine([]),
      );

      // employee-1 is the only employee, and today's "opening" slot takes
      // them -- "mid" should then find no one eligible, since they already
      // have a same-day assignment (not the unrelated Monday one).
      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
        priorAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0].shift).toBe("opening");
    });
  });

  describe("fairness-based selection", () => {
    it("picks the employee with fewer prior shifts over one with more", () => {
      const employees = [
        createEmployee({ id: "employee-1" }),
        createEmployee({ id: "employee-2" }),
      ];

      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
      });

      // employee-1 already has two shifts this week; employee-2 has none.
      // With real fairness scoring, employee-2 should get today's slot --
      // with the old "first eligible in array order" behavior, employee-1
      // would have won every time regardless of prior load.
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
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([
          { factor: new ShiftCountFactor(), weight: 1 },
        ]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
        priorAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0].employeeId).toBe("employee-2");
    });

    it("re-evaluates fairness after each pick within the same day, rather than using a stale ranking", () => {
      const employees = [
        createEmployee({ id: "employee-1" }),
        createEmployee({ id: "employee-2" }),
        createEmployee({ id: "employee-3" }),
      ];

      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 1,
        closingBartenders: 0,
      });

      // All three start equally fair. Once employee-1 (lowest id, wins the
      // opening slot on a tie) is picked, they're no longer eligible for
      // "mid" (already working today) -- the second slot should go to
      // whichever of employee-2/employee-3 wins the tie-break, not another
      // evaluation that still thinks employee-1 is available.
      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([
          { factor: new ShiftCountFactor(), weight: 1 },
        ]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        date,
        createPolicy(),
      );

      expect(assignments).toHaveLength(2);
      const assignedIds = assignments.map((a) => a.employeeId).sort();
      expect(assignedIds).toEqual(["employee-1", "employee-2"]);
    });
  });

  describe("early finish (equal-hours rebalancing)", () => {
    // employee-1 has 11h from a prior closing shift; employee-2 has 8h
    // from an opening shift *today*, which also makes them ineligible for
    // today's closing slot (already has a shift that day) -- so
    // employee-1 is the only eligible candidate, and is above the
    // (11+8)/2 = 9.5h team average.
    function aboveAverageSetup() {
      const employees = [
        createEmployee({ id: "employee-1" }),
        createEmployee({ id: "employee-2" }),
      ];

      const existingAssignments: ShiftAssignment[] = [
        {
          employeeId: "employee-1",
          date: new Date("2026-08-27"),
          shift: "closing",
        },
        {
          employeeId: "employee-2",
          date: new Date("2026-08-28"),
          shift: "opening",
        },
      ];

      return { employees, existingAssignments };
    }

    it("marks a closing assignment as early-finish when the employee is above the team average", () => {
      const { employees, existingAssignments } = aboveAverageSetup();

      const requirement = createRequirement({
        openingBartenders: 0,
        midBartenders: 0,
        closingBartenders: 1,
        earlyFinishes: 1,
      });

      const policy = createPolicy({ allowEarlyFinish: true });

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        new Date("2026-08-28"),
        policy,
        existingAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toMatchObject({
        employeeId: "employee-1",
        shift: "closing",
        isEarlyFinish: true,
      });
    });

    it("does not mark early-finish when the policy disallows it", () => {
      const { employees, existingAssignments } = aboveAverageSetup();

      const requirement = createRequirement({
        openingBartenders: 0,
        midBartenders: 0,
        closingBartenders: 1,
        earlyFinishes: 1,
      });

      const policy = createPolicy({ allowEarlyFinish: false });

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        new Date("2026-08-28"),
        policy,
        existingAssignments,
      );

      expect(assignments[0].isEarlyFinish).toBeFalsy();
    });

    it("does not mark early-finish when the daily budget is exhausted", () => {
      const { employees, existingAssignments } = aboveAverageSetup();

      const requirement = createRequirement({
        openingBartenders: 0,
        midBartenders: 0,
        closingBartenders: 1,
        earlyFinishes: 0,
      });

      const policy = createPolicy({ allowEarlyFinish: true });

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        new Date("2026-08-28"),
        policy,
        existingAssignments,
      );

      expect(assignments[0].isEarlyFinish).toBeFalsy();
    });

    it("never applies early finish to opening or mid shifts, even when above average", () => {
      const employees = [
        createEmployee({ id: "employee-1" }),
        createEmployee({ id: "employee-2" }),
      ];

      // Same above-average setup, but today's requirement asks for an
      // opening slot instead of closing.
      const existingAssignments: ShiftAssignment[] = [
        {
          employeeId: "employee-1",
          date: new Date("2026-08-27"),
          shift: "closing",
        },
        {
          employeeId: "employee-2",
          date: new Date("2026-08-28"),
          shift: "mid",
        },
      ];

      const requirement = createRequirement({
        openingBartenders: 1,
        midBartenders: 0,
        closingBartenders: 0,
        earlyFinishes: 1,
      });

      const policy = createPolicy({ allowEarlyFinish: true });

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        new Date("2026-08-28"),
        policy,
        existingAssignments,
      );

      expect(assignments).toHaveLength(1);
      expect(assignments[0].shift).toBe("opening");
      expect(assignments[0].isEarlyFinish).toBeFalsy();
    });

    it("shares the daily early-finish budget across closing and double, not one each", () => {
      const { employees, existingAssignments } = aboveAverageSetup();

      // Both a closing and a double slot needed, but only 1 early-finish
      // grant available for the whole day. With empty validators (this
      // test isolates the budget mechanic, not realistic scheduling
      // rules), employee-1 ends up eligible for both slots and wins both
      // on the fairness tie-break -- but only the first (closing) should
      // consume the shared budget; if budget were wrongly reset between
      // the two assignShifts passes, the double would also get marked.
      const requirement = createRequirement({
        openingBartenders: 0,
        midBartenders: 0,
        closingBartenders: 1,
        doubleShifts: 1,
        earlyFinishes: 1,
      });

      const policy = createPolicy({ allowEarlyFinish: true });

      const engine = new DefaultAssignmentEngine(
        new DefaultValidationEngine([]),
        new DefaultFairnessEngine([]),
      );

      const assignments = engine.assign(
        employees,
        requirement,
        new Date("2026-08-28"),
        policy,
        existingAssignments,
      );

      const earlyFinishCount = assignments.filter(
        (a) => a.isEarlyFinish,
      ).length;

      expect(earlyFinishCount).toBe(1);
    });
  });
});
