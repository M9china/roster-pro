import type { Employee } from "@/db/schema";
import type { SchedulingPolicy } from "@/db/schema";
import type { ServiceForecast } from "@/db/schema";
import { PlanningEmployee } from "../models/employee";

export interface PlanningContext {
  restaurantId: string;

  weekStart: Date;

  employees: PlanningEmployee[];

  forecasts: ServiceForecast[];

  policy: SchedulingPolicy;
}
