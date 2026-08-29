import type { FairnessEngine } from "./fairness-engine";
import type { FairnessContext } from "./fairness-context";
import type { EmployeeFairnessScore, FairnessResult } from "./fairness-result";
import type { FairnessFactor } from "./factors/fairness-factor";

export class DefaultFairnessEngine implements FairnessEngine {
  constructor(private readonly factors: FairnessFactor[]) {}

  evaluate(context: FairnessContext): FairnessResult {
    const scores: EmployeeFairnessScore[] = context.employees.map(
      (employee) => {
        const score = this.factors.reduce(
          (total, factor) => total + factor.calculate(employee.id, context),
          0,
        );

        return {
          employee,
          score,
        };
      },
    );

    return {
      scores,
    };
  }
}
