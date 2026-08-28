import type { FairnessEngine } from "./fairness-engine";
import type { FairnessContext } from "./fairness-context";
import type { EmployeeFairnessScore, FairnessResult } from "./fairness-result";

export class DefaultFairnessEngine implements FairnessEngine {
  evaluate(context: FairnessContext): FairnessResult {
    const scores: EmployeeFairnessScore[] = context.employees.map(
      (employee) => ({
        employee,
        score: 0,
      }),
    );

    return {
      scores,
    };
  }
}
