import {
  boolean,
  date,
  index,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  createTable,
  foreignKey,
  idColumn,
  timestamps,
} from "./helpers/columns";

import { demandLevelEnum, servicePeriodEnum } from "./enums";

import { restaurant } from "./restaurant";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const serviceForecast = createTable(
  "service_forecasts",
  {
    id: idColumn(),

    restaurantId: foreignKey("restaurant").references(() => restaurant.id, {
      onDelete: "cascade",
    }),

    serviceDate: date("service_date").notNull(),

    servicePeriod: servicePeriodEnum("service_period")
      .default("full_day")
      .notNull(),

    expectedReservations: integer("expected_reservations").default(0).notNull(),

    expectedWalkIns: integer("expected_walk_ins").default(0).notNull(),

    demandLevel: demandLevelEnum("demand_level").default("normal").notNull(),

    specialEvent: boolean("special_event").default(false).notNull(),

    eventName: text("event_name"),

    notes: text("notes"),

    ...timestamps(),
  },
  (table) => ({
    restaurantDatePeriodUnique: uniqueIndex(
      "service_forecasts_restaurant_date_period_unique",
    ).on(table.restaurantId, table.serviceDate, table.servicePeriod),

    restaurantDateIdx: index("service_forecasts_restaurant_date_idx").on(
      table.restaurantId,
      table.serviceDate,
    ),
  }),
);

export type ServiceForecast = InferSelectModel<typeof serviceForecast>;
export type NewServiceForecast = InferInsertModel<typeof serviceForecast>;
