import type { FairnessFactor } from "./fairness-factor";

export interface WeightedFairnessFactor {
  factor: FairnessFactor;
  weight: number;
}