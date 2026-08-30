import type { WeightedFairnessFactor } from "./factors/weighted-fairness-factor";

import { ShiftCountFactor } from "./factors/shift-count-factor";
import { WeekendShiftFactor } from "./factors/weekend-shift-factor";
import { DoubleShiftFactor } from "./factors/double-shift-factor";
import { ClosingShiftFactor } from "./factors/closing-shift-factor";
import { ConsecutiveDaysFactor } from "./factors/consecutive-days-factor";

export const defaultFairnessFactors: WeightedFairnessFactor[] = [
  {
    factor: new ShiftCountFactor(),
    weight: 1,
  },
  {
    factor: new WeekendShiftFactor(),
    weight: 1,
  },
  {
    factor: new DoubleShiftFactor(),
    weight: 1,
  },
  {
    factor: new ClosingShiftFactor(),
    weight: 1,
  },
  {
    factor: new ConsecutiveDaysFactor(),
    weight: 1,
  },
];
