import type { FairnessFactor } from "../fairness-factor";
import type { FairnessContext } from "../fairness-context";

export class ShiftCountFactor implements FairnessFactor {
  calculate(context: FairnessContext): number {
    return -context.shiftsWorked;
  }
}
