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
