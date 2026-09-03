import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  schedule,
  shiftAssignment,
  type Schedule,
  type NewSchedule,
  type ShiftAssignmentRow,
  type NewShiftAssignmentRow,
} from "@/db/schema/schedule";

type Database = typeof db;

export class ScheduleRepository {
  constructor(private readonly database: Database = db) {}

  async findByRestaurantAndWeek(
    restaurantId: string,
    weekStartDate: string,
  ): Promise<Schedule | undefined> {
    const [row] = await this.database
      .select()
      .from(schedule)
      .where(
        and(
          eq(schedule.restaurantId, restaurantId),
          eq(schedule.weekStartDate, weekStartDate),
        ),
      )
      .limit(1);

    return row;
  }

  /**
   * Returns the schedule plus its assignments, in the flat shape a caller
   * pivots into the employee-rows x date-columns grid. Pivoting happens at
   * the UI/presentation layer, not here -- this stays a plain data fetch.
   */
  async findWithAssignments(
    scheduleId: string,
  ): Promise<
    { schedule: Schedule; assignments: ShiftAssignmentRow[] } | undefined
  > {
    const found = await this.findById(scheduleId);

    if (!found) {
      return undefined;
    }

    const assignments = await this.database
      .select()
      .from(shiftAssignment)
      .where(eq(shiftAssignment.scheduleId, scheduleId));

    return { schedule: found, assignments };
  }

  async findById(id: string): Promise<Schedule | undefined> {
    const [row] = await this.database
      .select()
      .from(schedule)
      .where(eq(schedule.id, id))
      .limit(1);

    return row;
  }

  async create(data: NewSchedule): Promise<Schedule> {
    const [row] = await this.database.insert(schedule).values(data).returning();

    return row;
  }

  async publish(id: string): Promise<Schedule | undefined> {
    const [row] = await this.database
      .update(schedule)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(schedule.id, id))
      .returning();

    return row;
  }

  /**
   * Replaces all assignments for a schedule in one transaction. The
   * planning engine regenerates a full week at a time, not one shift at a
   * time, so "diff and patch" isn't worth the complexity yet -- clear and
   * re-insert keeps this correct even if the engine's output count changes
   * between runs.
   */
  async replaceAssignments(
    scheduleId: string,
    assignments: NewShiftAssignmentRow[],
  ): Promise<ShiftAssignmentRow[]> {
    return this.database.transaction(async (tx) => {
      await tx
        .delete(shiftAssignment)
        .where(eq(shiftAssignment.scheduleId, scheduleId));

      if (assignments.length === 0) {
        return [];
      }

      return tx.insert(shiftAssignment).values(assignments).returning();
    });
  }
}

export const scheduleRepository = new ScheduleRepository();
