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

// Scoped to bartenders for now (see PlanningEmployee) but kept generic
// since experience will apply across roles once planning expands beyond bar staff.
export const experienceLevelEnum = pgEnum("experience_level", [
  "junior",
  "intermediate",
  "senior",
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