import type { SchedulingPolicy } from "@/db/schema";

import type { ShiftAssignment } from "../models/assigner";
import type { ShiftType } from "../models/shift";
import { addDays } from "./date-utils";

export interface ShiftWindow {
  start: Date;
  end: Date;
}

/**
 * A double shift is defined as 12+ hours of work, regardless of how
 * narrow a restaurant's configured opening/closing windows happen to be --
 * this floor exists so rest-hours math computed from a double's end time
 * is never understated by an overly tight policy configuration.
 */
const MIN_DOUBLE_SHIFT_HOURS = 12;

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Computes the real start/end datetime for a shift.
 *
 * Opening and closing use the policy's configured windows directly.
 * Closing rolls into the next calendar day when its configured end time is
 * earlier than its start time (e.g. 15:00 -> 02:00, the default).
 *
 * Double spans the full opening-start-to-closing-end window, floored at
 * MIN_DOUBLE_SHIFT_HOURS.
 *
 * Mid has no fixed policy window -- there's no midShiftStart/End field, by
 * design: a mid shift starts `minimumRestHours` after the employee's own
 * most recent prior assignment ends, and runs for `defaultShiftHours`. For
 * an employee's first shift of the week (no prior assignment to anchor
 * against), it falls back to the policy's openingShiftEnd as a reference
 * point.
 */
export function computeShiftWindow(
  shift: Exclude<ShiftType, "off">,
  date: Date,
  policy: SchedulingPolicy,
  employeeId: string,
  priorAssignments: ShiftAssignment[],
): ShiftWindow {
  switch (shift) {
    case "opening":
      return {
        start: atTimeOfDay(date, policy.openingShiftStart),
        end: atTimeOfDay(date, policy.openingShiftEnd),
      };

    case "closing":
      return closingWindow(date, policy);

    case "double": {
      const start = atTimeOfDay(date, policy.openingShiftStart);
      const closing = closingWindow(date, policy);
      const hours = hoursBetween(start, closing.end);

      return {
        start,
        end:
          hours >= MIN_DOUBLE_SHIFT_HOURS
            ? closing.end
            : addHours(start, MIN_DOUBLE_SHIFT_HOURS),
      };
    }

    case "mid": {
      const priorEnd = mostRecentShiftEnd(
        employeeId,
        date,
        policy,
        priorAssignments,
      );

      // No prior assignment this week -- fall back to a fixed reference
      // point directly, rather than adding minimumRestHours on top of it
      // (there's no prior shift to be resting from).
      const start = priorEnd
        ? addHours(priorEnd, policy.minimumRestHours)
        : atTimeOfDay(date, policy.openingShiftEnd);

      return {
        start,
        end: addHours(start, policy.defaultShiftHours),
      };
    }
  }
}

function closingWindow(date: Date, policy: SchedulingPolicy): ShiftWindow {
  const start = atTimeOfDay(date, policy.closingShiftStart);
  let end = atTimeOfDay(date, policy.closingShiftEnd);

  if (end.getTime() <= start.getTime()) {
    end = addDays(end, 1);
  }

  return { start, end };
}

/**
 * Finds when this employee's most recent assignment before `date` ended,
 * or null if this is their first assignment of the week. Recurses through
 * computeShiftWindow if that prior assignment was itself a "mid" shift
 * (whose end also depends on what came before it) -- bounded by the
 * employee's assignment history, which only grows backward, so this
 * always terminates.
 */
function mostRecentShiftEnd(
  employeeId: string,
  date: Date,
  policy: SchedulingPolicy,
  priorAssignments: ShiftAssignment[],
): Date | null {
  const mostRecent = priorAssignments
    .filter(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.shift !== "off" &&
        assignment.date.getTime() < date.getTime(),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  if (!mostRecent) {
    return null;
  }

  const window = computeShiftWindow(
    mostRecent.shift as Exclude<ShiftType, "off">,
    mostRecent.date,
    policy,
    employeeId,
    priorAssignments,
  );

  return window.end;
}

/** Applies a policy time-of-day string ("HH:MM:SS") onto a date, in UTC. */
function atTimeOfDay(date: Date, timeOfDay: string): Date {
  const [hours, minutes, seconds] = timeOfDay.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, seconds ?? 0, 0);
  return result;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_HOUR;
}

/**
 * A fixed reduction applied to any assignment marked isEarlyFinish. Fixed
 * rather than dynamically calculated (e.g. "exactly enough to reach the
 * team average") because a dynamic amount isn't recomputable later --
 * ShiftAssignment only stores a boolean flag, not the reduction itself, so
 * hoursWorkedSoFar (below) needs a rule it can reapply consistently on
 * every call, not a number captured only at the moment of assignment.
 *
 * Not policy-configurable yet -- the scheduling policy is an intermediate
 * MVP schema, and this is a reasonable candidate for a future field
 * rather than something to add speculatively now.
 */
export const EARLY_FINISH_REDUCTION_HOURS = 2;

/**
 * Total hours an employee has worked so far, across whatever assignments
 * are passed in (typically the whole week-to-date). Used to compare
 * against the team average when deciding whether a new closing/double
 * assignment should be marked as an early finish -- see
 * DefaultAssignmentEngine.
 */
export function hoursWorkedSoFar(
  employeeId: string,
  assignments: ShiftAssignment[],
  policy: SchedulingPolicy,
): number {
  return assignments
    .filter(
      (assignment) =>
        assignment.employeeId === employeeId && assignment.shift !== "off",
    )
    .reduce((total, assignment) => {
      const window = computeShiftWindow(
        assignment.shift as Exclude<ShiftType, "off">,
        assignment.date,
        policy,
        employeeId,
        assignments,
      );
      const naturalHours = hoursBetween(window.start, window.end);
      const reduction = assignment.isEarlyFinish
        ? EARLY_FINISH_REDUCTION_HOURS
        : 0;

      return total + Math.max(0, naturalHours - reduction);
    }, 0);
}
