import type { ServiceForecast } from "@/db/schema";

import type { StaffingRequirement } from "../models/staffing-requirement";
import { StaffingCalculator } from "./staffing-calculator";

/**
 * Rough covers a single bartender can comfortably serve across a shift.
 * A starting assumption, not measured data -- tune once real service
 * numbers come back from live shifts.
 */
const COVERS_PER_BARTENDER = 25;

type DemandLevel = ServiceForecast["demandLevel"];

/**
 * Manager-set floor per demand level. Kept as the fallback for the common
 * case where a restaurant hasn't entered reservation/walk-in numbers yet
 * (expectedReservations/expectedWalkIns default to 0) -- zero covers
 * should never be read as "zero staff needed".
 */
const BASELINE_REQUIREMENTS: Record<DemandLevel, StaffingRequirement> = {
  very_low: {
    totalBartenders: 2,
    openingBartenders: 1,
    midBartenders: 0,
    closingBartenders: 1,
    doubleShifts: 0,
    earlyFinishes: 0,
  },
  low: {
    totalBartenders: 3,
    openingBartenders: 1,
    midBartenders: 1,
    closingBartenders: 1,
    doubleShifts: 0,
    earlyFinishes: 0,
  },
  normal: {
    totalBartenders: 5,
    openingBartenders: 2,
    midBartenders: 1,
    closingBartenders: 2,
    doubleShifts: 0,
    earlyFinishes: 1,
  },
  high: {
    totalBartenders: 6,
    openingBartenders: 2,
    midBartenders: 2,
    closingBartenders: 2,
    doubleShifts: 1,
    earlyFinishes: 2,
  },
  very_high: {
    totalBartenders: 8,
    openingBartenders: 3,
    midBartenders: 2,
    closingBartenders: 3,
    doubleShifts: 2,
    earlyFinishes: 3,
  },
};

export class DefaultStaffingCalculator implements StaffingCalculator {
  calculate(forecast: ServiceForecast): StaffingRequirement {
    const baseline = BASELINE_REQUIREMENTS[forecast.demandLevel];
    const totalCovers =
      forecast.expectedReservations + forecast.expectedWalkIns;

    if (totalCovers === 0) {
      return baseline;
    }

    const coversBasedTotal = Math.ceil(totalCovers / COVERS_PER_BARTENDER);

    // Covers only ever push staffing UP from the demand-level baseline --
    // demandLevel remains a manager-set floor, not something covers data
    // can undercut. Extra headcount lands on the mid shift, since that's
    // where peak-service volume actually gets absorbed.
    const extra = Math.max(0, coversBasedTotal - baseline.totalBartenders);

    if (extra === 0) {
      return baseline;
    }

    return {
      ...baseline,
      totalBartenders: baseline.totalBartenders + extra,
      midBartenders: baseline.midBartenders + extra,
    };
  }
}
