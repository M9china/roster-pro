import type { AssignmentEngine } from "./assignment-engine";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";
import type { ShiftAssignment } from "../models/assigner";
import type { ValidationEngine } from "../validators/validation-engine";
import type { FairnessEngine } from "../fairness/fairness-engine";
import type { FairnessAssignment } from "../fairness/fairness-assignment";
import type { SchedulingPolicy } from "@/db/schema";
import { isSameCalendarDay } from "../constants/date-utils";

export class DefaultAssignmentEngine implements AssignmentEngine {
  constructor(
    private readonly validationEngine: ValidationEngine,
    private readonly fairnessEngine: FairnessEngine,
  ) {}

  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
    policy: SchedulingPolicy,
    existingAssignments: ShiftAssignment[] = [],
  ): ShiftAssignment[] {
    const activeEmployees = employees.filter((employee) => employee.active);

    // Seeded with the week's assignments so far (previous days) so
    // validators -- days-off, minimum-rest -- and fairness scoring see the
    // full week, not just today in isolation. New assignments are
    // appended to this same array as they're made; only the newly-added
    // ones (from startIndex on) are returned to the caller, so
    // DefaultPlanningEngine's accumulation logic doesn't double-count
    // previous days.
    const assignments: ShiftAssignment[] = [...existingAssignments];
    const startIndex = assignments.length;

    this.assignShifts(
      activeEmployees,
      requirement.openingBartenders,
      "opening",
      date,
      assignments,
      policy,
    );

    this.assignShifts(
      activeEmployees,
      requirement.midBartenders,
      "mid",
      date,
      assignments,
      policy,
    );

    this.assignShifts(
      activeEmployees,
      requirement.closingBartenders,
      "closing",
      date,
      assignments,
      policy,
    );

    this.assignShifts(
      activeEmployees,
      requirement.doubleShifts,
      "double",
      date,
      assignments,
      policy,
    );

    return assignments.slice(startIndex);
  }

  /**
   * Fills one shift type's slots one at a time: each iteration re-derives
   * who's still eligible, asks the fairness engine to score them, and
   * assigns the highest-scoring (least-loaded-so-far) eligible employee.
   * Re-deriving eligibility every iteration (rather than sorting once) is
   * deliberate -- each assignment changes who's still available for the
   * next slot (same-day conflicts) and shifts everyone's fairness scores,
   * so a stale ranking would keep picking the same "fair" order regardless
   * of who was already picked this round.
   */
  private assignShifts(
    employees: PlanningEmployee[],
    required: number,
    shift: ShiftAssignment["shift"],
    date: Date,
    assignments: ShiftAssignment[],
    policy: SchedulingPolicy,
  ): void {
    if (required <= 0) {
      return;
    }

    while (this.countForShiftToday(assignments, shift, date) < required) {
      const eligible = employees.filter((employee) =>
        this.isEligible(employee, shift, date, assignments, policy),
      );

      if (eligible.length === 0) {
        // No one left who can take this slot. Left unfilled rather than
        // erroring -- the resulting shortfall is surfaced upstream by
        // DefaultPlanningEngine comparing requirement vs actual counts.
        break;
      }

      const winner = this.pickFairest(eligible, assignments, date);

      assignments.push({ employeeId: winner.id, date, shift });
    }
  }

  private isEligible(
    employee: PlanningEmployee,
    shift: ShiftAssignment["shift"],
    date: Date,
    assignments: ShiftAssignment[],
    policy: SchedulingPolicy,
  ): boolean {
    // Normal shifts can only go to an employee who doesn't already have a
    // shift that day. Double shifts are the exception -- they explicitly
    // represent working twice in one day (DoubleShiftValidator is what
    // actually gates whether that's allowed).
    if (
      shift !== "double" &&
      this.hasAssignmentForDate(employee.id, date, assignments)
    ) {
      return false;
    }

    if (this.hasAssignmentForShift(employee.id, shift, date, assignments)) {
      return false;
    }

    const candidate: ShiftAssignment = { employeeId: employee.id, date, shift };

    return this.validationEngine.validate(
      employee,
      candidate,
      assignments,
      policy,
    );
  }

  private pickFairest(
    eligible: PlanningEmployee[],
    assignments: ShiftAssignment[],
    date: Date,
  ): PlanningEmployee {
    const { scores } = this.fairnessEngine.evaluate({
      employees: eligible,
      assignments: toFairnessAssignments(assignments),
      // Not currently read by any built-in factor -- every factor derives
      // everything it needs directly from `assignments` -- but required by
      // the interface. `date` is a reasonable stand-in for "as of when".
      weekStart: date,
    });

    return scores.reduce((best, current) => {
      const isHigherScore = current.score > best.score;
      const isTieBrokenLower =
        current.score === best.score && current.employee.id < best.employee.id;

      return isHigherScore || isTieBrokenLower ? current : best;
    }).employee;
  }

  private countForShiftToday(
    assignments: ShiftAssignment[],
    shift: ShiftAssignment["shift"],
    date: Date,
  ): number {
    // Scoped to today: `assignments` can span the whole week (it's seeded
    // with prior days), so counting every assignment of this shift type
    // across all dates would overcount "how many opening slots has TODAY
    // filled" once earlier days are in the mix.
    return assignments.filter(
      (assignment) =>
        assignment.shift === shift && isSameCalendarDay(assignment.date, date),
    ).length;
  }

  private hasAssignmentForDate(
    employeeId: string,
    date: Date,
    assignments: ShiftAssignment[],
  ): boolean {
    return assignments.some(
      (assignment) =>
        assignment.employeeId === employeeId &&
        isSameCalendarDay(assignment.date, date),
    );
  }

  private hasAssignmentForShift(
    employeeId: string,
    shift: ShiftAssignment["shift"],
    date: Date,
    assignments: ShiftAssignment[],
  ): boolean {
    // Also date-scoped, for the same reason as countForShiftToday --
    // without it, an employee assigned "opening" once this week would be
    // blocked from ever getting "opening" again on any later day, since
    // `assignments` now carries the whole week rather than just today.
    return assignments.some(
      (assignment) =>
        assignment.employeeId === employeeId &&
        assignment.shift === shift &&
        isSameCalendarDay(assignment.date, date),
    );
  }
}

function toFairnessAssignments(
  assignments: ShiftAssignment[],
): FairnessAssignment[] {
  return assignments
    .filter((assignment) => assignment.shift !== "off")
    .map((assignment) => ({
      employeeId: assignment.employeeId,
      date: assignment.date,
      shiftType: assignment.shift as FairnessAssignment["shiftType"],
    }));
}
