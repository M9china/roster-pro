import type { Employee } from "@/db/schema";
import type { SchedulingPolicy } from "@/db/schema";
import type { ServiceForecast } from "@/db/schema";

export interface PlanningContext {
  restaurantId: string;

  weekStart: Date;

  employees: Employee[];

  forecasts: ServiceForecast[];

  policy: SchedulingPolicy;
}
