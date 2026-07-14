import { STAFFING_LEVELS } from "../constants/staffing-levels";

import type { StaffingCalculator } from "./staffing-calculator";
import type { StaffingCalculationContext } from "./staffing-calculation-context";
import type {
  StaffingCalculationResult,
  StaffingCalculationWarning,
} from "./staffing-calculation-result";

export class DefaultStaffingCalculator implements StaffingCalculator {
  calculate(context: StaffingCalculationContext): StaffingCalculationResult {
    const requirement = STAFFING_LEVELS[context.forecast.demandLevel];

    const warnings: StaffingCalculationWarning[] = [];
    const availableCount = context.availableEmployees.length;

    if (requirement.totalBartenders > availableCount) {
      warnings.push({
        code: "INSUFFICIENT_STAFF",
        message:
          "Forecast requires more bartenders than are currently available.",
      });
    }

    return {
      requirement,
      warnings,
    };
  }
}
