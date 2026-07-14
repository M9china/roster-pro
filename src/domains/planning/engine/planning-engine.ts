import type { PlanningContext } from "./planning-context";
import type { PlanningResult } from "./planning-result";

export interface PlanningEngine {
  generate(context: PlanningContext): PlanningResult;
}
