import { sql } from "drizzle-orm";
import { pgTableCreator, text, timestamp } from "drizzle-orm/pg-core";
import { monotonicFactory } from "ulid";

export const createTable = pgTableCreator((name) => `rp_${name}`);

const ulid = monotonicFactory();

/**
 * Primary key
 */
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => ulid());

/**
 * Standard audit columns
 */
export const timestamps = () => ({
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

/**
 * Generic foreign key column.
 *
 * Example:
 *
 * foreignKey("restaurant")
 *
 * creates
 *
 * restaurant_id
 */
export const foreignKey = (name: string) => text(`${name}_id`).notNull();
