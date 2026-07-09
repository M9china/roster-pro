import { sql } from "drizzle-orm";
import { pgTableCreator, text, timestamp } from "drizzle-orm/pg-core";
import { monotonicFactory } from "ulid";

/**
 * Prefix every table with `rp_`
 * (Roster Pro)
 *
 * Makes future integrations
 * much easier.
 */
export const createTable = pgTableCreator((name) => `rp_${name}`);

const ulid = monotonicFactory();

/**
 * Primary Key
 */
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => ulid());

/**
 * created_at
 * updated_at
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
