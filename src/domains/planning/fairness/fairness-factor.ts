import type { FairnessContext } from "./fairness-context";

export interface FairnessFactor {
  calculate(context: FairnessContext): number;
}
