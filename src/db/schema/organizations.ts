import { text, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable, idColumn, timestamps } from "./helpers/columns";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const organization = createTable(
  "organizations",
  {
    id: idColumn(),

    name: text("name").notNull(),

    legalName: text("legal_name").notNull(),

    slug: text("slug").notNull(),

    timezone: text("time_zone").notNull(),

    ...timestamps(),
  },
  (table) => ({
    slugIdx: uniqueIndex("organization_slug_idx").on(table.slug),
  }),
);

export type Organization = InferSelectModel<typeof organization>;
export type NewOrganization = InferInsertModel<typeof organization>;
