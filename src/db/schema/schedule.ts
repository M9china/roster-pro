import {
  date,
  index,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  createTable,
  foreignKey,
  idColumn,
  timestamps,
} from "./helpers/columns";

import { scheduleStatusEnum, shiftTypeEnum } from "./enums";
import { restaurant } from "./restaurant";
import { employee } from "./employee";

/**
 * One row per restaurant per week. Groups the individual shift assignments
 * that make up that week's roster so the planning engine's output can be
 * generated as a draft, reviewed, and published as a single unit — rather
 * than each assignment existing independently with no concept of "this
 * week's schedule".
 */
export const schedule = createTable(
  "schedules",
  {
    id: idColumn(),

    restaurantId: foreignKey("restaurant").references(() => restaurant.id, {
      onDelete: "cascade",
    }),

    // Monday of the week this schedule covers.
    weekStartDate: date("week_start_date").notNull(),

    status: scheduleStatusEnum("status").default("draft").notNull(),

    // Bumped each time the schedule is regenerated for the same week.
    version: integer("version").default(1).notNull(),

    publishedAt: timestamp("published_at", { withTimezone: true }),

    ...timestamps(),
  },
  (table) => ({
    restaurantWeekUnique: uniqueIndex("schedules_restaurant_week_unique").on(
      table.restaurantId,
      table.weekStartDate,
    ),

    restaurantIdx: index("schedules_restaurant_idx").on(table.restaurantId),
  }),
);

/**
 * One row per employee per shift. Belongs to exactly one schedule.
 * Pivoting these rows by employeeId (rows) x date (columns) produces the
 * weekly grid view.
 */
export const shiftAssignment = createTable(
  "shift_assignments",
  {
    id: idColumn(),

    scheduleId: foreignKey("schedule").references(() => schedule.id, {
      onDelete: "cascade",
    }),

    employeeId: foreignKey("employee").references(() => employee.id, {
      onDelete: "cascade",
    }),

    date: date("date").notNull(),

    shiftType: shiftTypeEnum("shift_type").notNull(),

    ...timestamps(),
  },
  (table) => ({
    // One shift per employee per day within a given schedule.
    scheduleEmployeeDateUnique: uniqueIndex(
      "shift_assignments_schedule_employee_date_unique",
    ).on(table.scheduleId, table.employeeId, table.date),

    scheduleIdx: index("shift_assignments_schedule_idx").on(table.scheduleId),

    employeeIdx: index("shift_assignments_employee_idx").on(table.employeeId),
  }),
);

export type Schedule = InferSelectModel<typeof schedule>;
export type NewSchedule = InferInsertModel<typeof schedule>;

export type ShiftAssignmentRow = InferSelectModel<typeof shiftAssignment>;
export type NewShiftAssignmentRow = InferInsertModel<typeof shiftAssignment>;
