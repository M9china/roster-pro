import type { FairnessContext } from "./fairness-context";
import type { FairnessResult } from "./fairness-result";

export interface FairnessEngine {
  evaluate(context: FairnessContext): FairnessResult;
}