import { SchedulingPolicy, ServiceForecast } from "@/db/schema";
import { PlanningEmployee } from "@/domains";

export interface PlanningContext {
  restaurantId: string;

  weekStart: Date;

  employees: PlanningEmployee[];

  forecasts: ServiceForecast[];

  policy: SchedulingPolicy;
}
