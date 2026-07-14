import type { ServiceForecast } from "@/db/schema";

import type { StaffingRequirement } from "../models/staffing-requirement";

export interface StaffingCalculator {
  calculate(forecast: ServiceForecast): StaffingRequirement;
}
