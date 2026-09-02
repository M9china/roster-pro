import { relations } from "drizzle-orm";

import { organization } from "./organizations";
import { restaurant } from "./restaurant";
import { serviceForecast } from "./service-forecast";
import { employee } from "./employee";
import { schedulingPolicy } from "./scheduling-policy";

export const organizationRelations = relations(organization, ({ many }) => ({
  restaurants: many(restaurant),
}));

export const resturantRelations = relations(restaurant, ({ one, many }) => ({
  organization: one(organization, {
    fields: [restaurant.organizationId],
    references: [organization.id],
  }),

  employees: many(employee),

  serviceForecasts: many(serviceForecast),

  schedulingPolicy: one(schedulingPolicy),
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

export const schedulingPolicyRelations = relations(
  schedulingPolicy,
  ({ one }) => ({
    restaurant: one(restaurant, {
      fields: [schedulingPolicy.restaurantId],
      references: [restaurant.id],
    }),
  }),
);
