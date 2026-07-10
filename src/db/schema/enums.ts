import { pgEnum } from "drizzle-orm/pg-core";

export const employeeRoleEnum = pgEnum("employee_role", [
  "manager",
  "bartender",
  "barback",
  "waiter",
  "host",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "casual",
]);

export const shiftTypeEnum = pgEnum("shift_type", [
  "off",
  "opening",
  "mid",
  "closing",
  "double",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "draft",
  "published",
  "archived",
]);

export const servicePeriodEnum = pgEnum("service_period", [
  "breakfast",
  "lunch",
  "dinner",
  "full_day",
]);

export const demandLevelEnum = pgEnum("demand_level", [
  "very_low",
  "low",
  "normal",
  "high",
  "very_high",
]);
