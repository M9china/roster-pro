import type { FairnessContext } from "./fairness-context";

export interface FairnessFactor {
  calculate(employeeId: string, context: FairnessContext): number;
}
