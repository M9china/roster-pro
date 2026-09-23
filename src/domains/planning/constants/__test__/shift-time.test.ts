import { describe, expect, it } from "vitest";

import type { SchedulingPolicy } from "@/db/schema";
import type { ShiftAssignment } from "../../models/assigner";
import {
  computeShiftWindow,
  hoursBetween,
  hoursWorkedSoFar,
  EARLY_FINISH_REDUCTION_HOURS,
} from "../shift-time";

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

describe("computeShiftWindow", () => {
  it("computes opening directly from the policy's configured window", () => {
    const window = computeShiftWindow(
      "opening",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T09:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T17:00:00.000Z");
  });

  it("computes closing without rollover when end is later than start", () => {
    const window = computeShiftWindow(
      "closing",
      new Date("2026-08-28"),
      createPolicy({
        closingShiftStart: "15:00:00",
        closingShiftEnd: "23:00:00",
      }),
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T15:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T23:00:00.000Z");
  });

  it("rolls closing's end into the next calendar day when configured to cross midnight", () => {
    // Default policy: 15:00 -> 02:00, which is earlier than the start.
    const window = computeShiftWindow(
      "closing",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T15:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-29T02:00:00.000Z");
  });

  it("spans opening-start to closing-end for a double, when that's already 12+ hours", () => {
    // 09:00 -> 02:00 next day = 17 hours, already over the 12 hour floor.
    const window = computeShiftWindow(
      "double",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T09:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-29T02:00:00.000Z");
    expect(hoursBetween(window.start, window.end)).toBe(17);
  });

  it("floors a double at 12 hours when the configured windows would make it shorter", () => {
    // 09:00 -> 18:00 same day = only 9 hours naturally.
    const policy = createPolicy({
      openingShiftStart: "09:00:00",
      closingShiftStart: "14:00:00",
      closingShiftEnd: "18:00:00",
    });

    const window = computeShiftWindow(
      "double",
      new Date("2026-08-28"),
      policy,
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T09:00:00.000Z");
    // Floored to 12 hours from start, not the natural 18:00 end.
    expect(window.end.toISOString()).toBe("2026-08-28T21:00:00.000Z");
    expect(hoursBetween(window.start, window.end)).toBe(12);
  });

  it("anchors a mid shift to openingShiftEnd when there's no prior assignment this week", () => {
    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      [],
    );

    expect(window.start.toISOString()).toBe("2026-08-28T17:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-29T01:00:00.000Z");
  });

  it("anchors a mid shift's start to minimumRestHours after the prior assignment ends", () => {
    // Opening on the 27th ends 17:00. Mid on the 28th should start
    // 17:00 + 11h = 04:00 on the 28th, and run for defaultShiftHours (8).
    const priorAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-27"),
        shift: "opening",
      },
    ];

    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      priorAssignments,
    );

    expect(window.start.toISOString()).toBe("2026-08-28T04:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T12:00:00.000Z");
  });

  it("recurses correctly through a chain of mid shifts", () => {
    // opening (26th): 09:00-17:00 (first shift, fixed window)
    // mid (27th): anchored off the opening -- 17:00+11h=04:00 -> 12:00
    // mid (28th, candidate): anchored off the 27th's mid end (12:00) --
    //   12:00+11h=23:00 (still the 27th, clock-time-wise) -> 07:00 (28th)
    const priorAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-26"),
        shift: "opening",
      },
      { employeeId: "employee-1", date: new Date("2026-08-27"), shift: "mid" },
    ];

    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      priorAssignments,
    );

    expect(window.start.toISOString()).toBe("2026-08-27T23:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-28T07:00:00.000Z");
  });

  it("anchors off the most recent prior assignment, not just the first in the array", () => {
    // Deliberately out of order, and includes an older assignment that
    // should be ignored in favor of the more recent one.
    const priorAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-24"),
        shift: "opening",
      },
      {
        employeeId: "employee-1",
        date: new Date("2026-08-26"),
        shift: "closing",
      },
    ];

    // Closing on the 26th ends 02:00 on the 27th (default policy rollover).
    // Mid on the 28th should anchor off THAT, not the 24th's opening:
    // 02:00 + 11h = 13:00 on the 27th -> ends 21:00 on the 27th.
    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      priorAssignments,
    );

    expect(window.start.toISOString()).toBe("2026-08-27T13:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-27T21:00:00.000Z");
  });

  it("only considers the given employee's own assignment history", () => {
    const priorAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-2",
        date: new Date("2026-08-27"),
        shift: "closing",
      },
    ];

    // employee-1 has no history of their own, so this should still fall
    // back to the no-prior-assignment case, ignoring employee-2's closing.
    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      priorAssignments,
    );

    expect(window.start.toISOString()).toBe("2026-08-28T17:00:00.000Z");
  });

  it("skips a same-day-off record when looking for the most recent prior shift", () => {
    // An explicit day-off allocation has no real end time to rest from --
    // the most recent *actual* shift (opening on the 26th, ending 17:00)
    // should be used instead of trying to compute a window for the "off"
    // record on the 27th. Mid on the 28th anchors off that: 17:00 + 11h
    // (minimumRestHours) = 04:00 on the 27th, running 8h to 12:00.
    const priorAssignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-26"),
        shift: "opening",
      },
      { employeeId: "employee-1", date: new Date("2026-08-27"), shift: "off" },
    ];

    const window = computeShiftWindow(
      "mid",
      new Date("2026-08-28"),
      createPolicy(),
      "employee-1",
      priorAssignments,
    );

    expect(window.start.toISOString()).toBe("2026-08-27T04:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-27T12:00:00.000Z");
  });
});

describe("hoursBetween", () => {
  it("computes a positive fractional gap correctly", () => {
    expect(
      hoursBetween(
        new Date("2026-08-28T09:00:00Z"),
        new Date("2026-08-28T13:30:00Z"),
      ),
    ).toBe(4.5);
  });
});

describe("hoursWorkedSoFar", () => {
  it("sums natural hours across an employee's real shifts", () => {
    // Opening (8h) + closing with default rollover (11h) = 19h.
    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-28"),
        shift: "opening",
      },
      {
        employeeId: "employee-1",
        date: new Date("2026-08-30"),
        shift: "closing",
      },
    ];

    expect(hoursWorkedSoFar("employee-1", assignments, createPolicy())).toBe(
      19,
    );
  });

  it("ignores 'off' records entirely", () => {
    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-28"),
        shift: "opening",
      },
      { employeeId: "employee-1", date: new Date("2026-08-29"), shift: "off" },
    ];

    expect(hoursWorkedSoFar("employee-1", assignments, createPolicy())).toBe(8);
  });

  it("reduces an early-finish-flagged assignment's counted hours by the fixed amount", () => {
    // Closing with default rollover is naturally 11h; early finish
    // should bring it down by EARLY_FINISH_REDUCTION_HOURS.
    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-28"),
        shift: "closing",
        isEarlyFinish: true,
      },
    ];

    expect(hoursWorkedSoFar("employee-1", assignments, createPolicy())).toBe(
      11 - EARLY_FINISH_REDUCTION_HOURS,
    );
  });

  it("only counts the given employee's own assignments", () => {
    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-28"),
        shift: "opening",
      },
      {
        employeeId: "employee-2",
        date: new Date("2026-08-28"),
        shift: "closing",
      },
    ];

    expect(hoursWorkedSoFar("employee-1", assignments, createPolicy())).toBe(8);
  });

  it("never goes negative, even if the reduction would exceed the shift's natural hours", () => {
    const shortClosingPolicy = createPolicy({
      closingShiftStart: "15:00:00",
      closingShiftEnd: "16:00:00", // 1 hour, less than the 2 hour reduction
    });

    const assignments: ShiftAssignment[] = [
      {
        employeeId: "employee-1",
        date: new Date("2026-08-28"),
        shift: "closing",
        isEarlyFinish: true,
      },
    ];

    expect(
      hoursWorkedSoFar("employee-1", assignments, shortClosingPolicy),
    ).toBe(0);
  });

  it("returns 0 for an employee with no assignments", () => {
    expect(hoursWorkedSoFar("employee-1", [], createPolicy())).toBe(0);
  });
});
