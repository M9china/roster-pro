import { relations } from "drizzle-orm";

import { organizations } from "./organization";
import { restaurant } from "./restaurant";

export const organizationRelations = relations(organizations, ({ many }) => ({
  restaurants: many(restaurant),
}));

export const restaurantRelations = relations(restaurant, ({ one }) => ({
  organization: one(organizations, {
    fields: [restaurant.organizationId],
    references: [organizations.id],
  }),
}));

export const employeeRelations = relations(restaurant, ({ one }) => ({
  restaurant: one(restaurant, {
    fields: [restaurant.id],
    references: [restaurant.id],
  }),
}));
