import { relations } from "drizzle-orm";

import { organization } from "./organizations";
import { resturant } from "./resturant";
import { serviceForecast } from "./service-forecast";
import { employee } from "./employee";
import { schedulingPolicy } from "./scheduling-policy";

export const organizationRelations = relations(organization, ({ many }) => ({
  restaurants: many(resturant),
}));

export const resturantRelations = relations(resturant, ({ one, many }) => ({
  organization: one(organization, {
    fields: [resturant.organizationId],
    references: [organization.id],
  }),

  employees: many(employee),

  serviceForecasts: many(serviceForecast),

  schedulingPolicy: one(schedulingPolicy),
}));

export const employeeRelations = relations(employee, ({ one }) => ({
  restaurant: one(resturant, {
    fields: [employee.restaurantId],
    references: [resturant.id],
  }),
}));

export const serviceForecastRelations = relations(
  serviceForecast,
  ({ one }) => ({
    restaurant: one(resturant, {
      fields: [serviceForecast.restaurantId],
      references: [resturant.id],
    }),
  }),
);

export const schedulingPolicyRelations = relations(
  schedulingPolicy,
  ({ one }) => ({
    restaurant: one(resturant, {
      fields: [schedulingPolicy.restaurantId],
      references: [resturant.id],
    }),
  }),
);
