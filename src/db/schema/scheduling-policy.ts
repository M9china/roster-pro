import {
  boolean,
  index,
  integer,
  time,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  createTable,
  foreignKey,
  idColumn,
  timestamps,
} from "./helpers/columns";

import { restaurant } from "./restaurant";

export const schedulingPolicy = createTable(
  "scheduling_policies",
  {
    id: idColumn(),

    restaurantId: foreignKey("restaurant").references(() => restaurant.id, {
      onDelete: "cascade",
    }),

    defaultShiftHours: integer("default_shift_hours").default(8).notNull(),

    minimumRestHours: integer("minimum_rest_hours").default(11).notNull(),

    daysOffPerWeek: integer("days_off_per_week").default(2).notNull(),

    allowDoubleShift: boolean("allow_double_shift").default(true).notNull(),

    allowEarlyFinish: boolean("allow_early_finish").default(true).notNull(),

    openingShiftStart: time("opening_shift_start")
      .default("09:00:00")
      .notNull(),

    openingShiftEnd: time("opening_shift_end").default("17:00:00").notNull(),

    closingShiftStart: time("closing_shift_start")
      .default("15:00:00")
      .notNull(),

    closingShiftEnd: time("closing_shift_end").default("02:00:00").notNull(),

    version: integer("version").default(1).notNull(),

    ...timestamps(),
  },
  (table) => ({
    restaurantUnique: uniqueIndex("scheduling_policies_restaurant_unique").on(
      table.restaurantId,
    ),

    restaurantIdx: index("scheduling_policies_restaurant_idx").on(
      table.restaurantId,
    ),
  }),
);
