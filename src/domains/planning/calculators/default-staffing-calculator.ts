import type { ServiceForecast } from "@/db/schema";

import type { StaffingRequirement } from "../models/staffing-requirement";
import { StaffingCalculator } from "./staffing-calculator";

export class DefaultStaffingCalculator implements StaffingCalculator {
  calculate(forecast: ServiceForecast): StaffingRequirement {
    switch (forecast.demandLevel) {
      case "very_low":
        return {
          totalBartenders: 2,
          openingBartenders: 1,
          midBartenders: 0,
          closingBartenders: 1,
          doubleShifts: 0,
          earlyFinishes: 0,
        };

      case "low":
        return {
          totalBartenders: 3,
          openingBartenders: 1,
          midBartenders: 1,
          closingBartenders: 1,
          doubleShifts: 0,
          earlyFinishes: 0,
        };

      case "normal":
        return {
          totalBartenders: 5,
          openingBartenders: 2,
          midBartenders: 1,
          closingBartenders: 2,
          doubleShifts: 0,
          earlyFinishes: 1,
        };

      case "high":
        return {
          totalBartenders: 6,
          openingBartenders: 2,
          midBartenders: 2,
          closingBartenders: 2,
          doubleShifts: 1,
          earlyFinishes: 2,
        };

      case "very_high":
        return {
          totalBartenders: 8,
          openingBartenders: 3,
          midBartenders: 2,
          closingBartenders: 3,
          doubleShifts: 2,
          earlyFinishes: 3,
        };
    }
  }
}
