import type { StaffingRequirement } from "../models/staffing-requirement";

export const STAFFING_LEVELS: Record<
  "very_low" | "low" | "normal" | "high" | "very_high",
  StaffingRequirement
> = {
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