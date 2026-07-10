import { relations } from "drizzle-orm";

import { organizations } from "./organization";
import { restaurant } from "./restaurant";
import { serviceForecast } from "./service-forecast";
import { employee } from "./employee";

export const organizationRelations = relations(organizations, ({ many }) => ({
  restaurants: many(restaurant),
}));

export const restaurantRelations = relations(restaurant, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [restaurant.organizationId],
    references: [organizations.id],
  }),

  employees: many(employee),

  serviceForecasts: many(serviceForecast),
}));

export const employeeRelations = relations(employee, ({ one }) => ({
  restaurant: one(restaurant, {
    fields: [employee.restaurantId],
    references: [restaurant.id],
  }),
}));

export const serviceForecastRelations = relations(
  serviceForecast,
  ({ one }) => ({
    restaurant: one(restaurant, {
      fields: [serviceForecast.restaurantId],
      references: [restaurant.id],
    }),
  }),
);
