import { relations } from "drizzle-orm";

import { organization } from "./organizations";
import { restaurant } from "./restaurant";
import { serviceForecast } from "./service-forecast";
import { employee } from "./employee";
import { schedulingPolicy } from "./scheduling-policy";
import { schedule, shiftAssignment } from "./schedule";

export const organizationRelations = relations(organization, ({ many }) => ({
  restaurants: many(restaurant),
}));

export const restaurantRelations = relations(restaurant, ({ one, many }) => ({
  organization: one(organization, {
    fields: [restaurant.organizationId],
    references: [organization.id],
  }),

  employees: many(employee),

  serviceForecasts: many(serviceForecast),

  schedulingPolicy: one(schedulingPolicy),

  schedules: many(schedule),
}));

export const employeeRelations = relations(employee, ({ one, many }) => ({
  restaurant: one(restaurant, {
    fields: [employee.restaurantId],
    references: [restaurant.id],
  }),

  shiftAssignments: many(shiftAssignment),
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

export const scheduleRelations = relations(schedule, ({ one, many }) => ({
  restaurant: one(restaurant, {
    fields: [schedule.restaurantId],
    references: [restaurant.id],
  }),

  assignments: many(shiftAssignment),
}));

export const shiftAssignmentRelations = relations(
  shiftAssignment,
  ({ one }) => ({
    schedule: one(schedule, {
      fields: [shiftAssignment.scheduleId],
      references: [schedule.id],
    }),

    employee: one(employee, {
      fields: [shiftAssignment.employeeId],
      references: [employee.id],
    }),
  }),
);
