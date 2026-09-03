import { boolean, index, text } from "drizzle-orm/pg-core";

import {
  createTable,
  foreignKey,
  idColumn,
  timestamps,
} from "./helpers/columns";

import {
  employeeRoleEnum,
  employmentTypeEnum,
  experienceLevelEnum,
} from "./enums";

import { restaurant } from "./restaurant";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const employee = createTable(
  "employees",
  {
    id: idColumn(),

    restaurantId: foreignKey("restaurant").references(() => restaurant.id, {
      onDelete: "cascade",
    }),

    firstName: text("first_name").notNull(),

    lastName: text("last_name").notNull(),

    email: text("email"),

    phone: text("phone"),

    role: employeeRoleEnum("role").notNull(),

    // Nullable: only meaningful for roles the planning engine currently scores
    // (bartenders). Backfill as other roles get planning support.
    experienceLevel: experienceLevelEnum("experience_level"),

    employmentType: employmentTypeEnum("employment_type")
      .default("full_time")
      .notNull(),

    active: boolean("active").default(true).notNull(),

    ...timestamps(),
  },
  (table) => ({
    restaurantIdx: index("employees_restaurant_idx").on(table.restaurantId),

    emailIdx: index("employees_email_idx").on(table.email),
  }),
);

export type Employee = InferSelectModel<typeof employee>;
export type NewEmployee = InferInsertModel<typeof employee>;
