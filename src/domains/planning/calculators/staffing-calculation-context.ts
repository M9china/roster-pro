import type {
  Employee,
  SchedulingPolicy,
  ServiceForecast,
} from "@/db/schema";

export interface StaffingCalculationContext {
  forecast: ServiceForecast;

  policy: SchedulingPolicy;

  availableEmployees: Employee[];
}