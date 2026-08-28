import type { FairnessContext } from "./fairness-context";
import type { FairnessEngine } from "./fairness-engine";
import type { FairnessResult } from "./fairness-result";
import type { FairnessFactor } from "./fairness-factor";

export class DefaultFairnessEngine implements FairnessEngine {
  constructor(
    private readonly factors: FairnessFactor[],
  ) {}

  evaluate(context: FairnessContext): FairnessResult {
    const score = this.factors.reduce(
      (total, factor) => total + factor.calculate(context),
      0,
    );

    return {
      employee: context.employee,
      score,
    };
  }
}