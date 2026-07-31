import type { StaffingCalculationContext } from "./staffing-calculation-context";
import type { StaffingCalculationResult } from "./staffing-calculation-result";

export interface StaffingCalculator {
  calculate(
    context: StaffingCalculationContext,
  ): StaffingCalculationResult;
}

