import type { FairnessEngine } from "./fairness-engine";
import type { FairnessContext } from "./fairness-context";
import type {
  EmployeeFairnessScore,
  FairnessResult,
} from "./fairness-result";
import { WeightedFairnessFactor } from "./factors/weighted-fairness-factor";


export class DefaultFairnessEngine implements FairnessEngine {
  constructor(
    private readonly factors: WeightedFairnessFactor[],
  ) {}

  evaluate(
    context: FairnessContext,
  ): FairnessResult {
    const scores: EmployeeFairnessScore[] =
      context.employees.map((employee) => {
        const score = this.factors.reduce(
          (total, { factor, weight }) => {
            return (
              total +
              factor.calculate(
                employee.id,
                context,
              ) *
                weight
            );
          },
          0,
        );

        return {
          employee,
          score,
        };
      });

    return {
      scores,
    };
  }
}