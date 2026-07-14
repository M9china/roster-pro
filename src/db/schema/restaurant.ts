import { boolean, text, uniqueIndex } from "drizzle-orm/pg-core";

import {
  createTable,
  foreignKey,
  idColumn,
  timestamps,
} from "./helpers/columns";

import { organization } from "./organizations";

export const restaurant = createTable(
  "restaurants",
  {
    id: idColumn(),

    organizationId: foreignKey("organization").references(
      () => organization.id,
      {
        onDelete: "cascade",
      },
    ),

    name: text("name").notNull(),

    slug: text("slug").notNull(),

    timezone: text("time_zone").default("Africa/Johannesburg").notNull(),

    currency: text("currency").default("ZAR").notNull(),

    locale: text("locale").default("en-ZA").notNull(),

    active: boolean("active").default(true).notNull(),

    ...timestamps(),
  },
  (table) => ({
    slugUnique: uniqueIndex("restaurants_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  }),
);
