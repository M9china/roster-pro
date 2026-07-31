import { describe, expect, it, test } from "vitest";

import { DefaultStaffingCalculator } from "../default-staffing-calculator";
import type { StaffingCalculationContext } from "../staffing-calculation-context";

const calculator = new DefaultStaffingCalculator();

function createContext(
  demandLevel: "very_low" | "low" | "normal" | "high" | "very_high",
  employeeCount: number = 8,
): StaffingCalculationContext {
  return {
    forecast: {
      demandLevel,
    } as StaffingCalculationContext["forecast"],

    // Not used by the calculator yet
    policy: {} as StaffingCalculationContext["policy"],

    availableEmployees: Array(employeeCount).fill(null),
  };
}

describe("DefaultStaffingCalculator", () => {
  test.each([
    ["very_low", 2],
    ["low", 3],
    ["normal", 5],
    ["high", 6],
    ["very_high", 8],
  ])(
    "returns %i bartenders for %s demand",
    (demandLevel, expectedBartenders) => {
      const result = calculator.calculate(
        createContext(
          demandLevel as StaffingCalculationContext["forecast"]["demandLevel"],
        ),
      );

      expect(result.requirement.totalBartenders).toBe(expectedBartenders);

      expect(result.warnings).toHaveLength(0);
    },
  );

  it("returns an insufficient staff warning when demand exceeds available employees", () => {
    const result = calculator.calculate(createContext("very_high", 5));

    expect(result.requirement.totalBartenders).toBe(8);

    expect(result.warnings).toHaveLength(1);

    expect(result.warnings[0]).toEqual({
      code: "INSUFFICIENT_STAFF",
      message:
        "Forecast requires more bartenders than are currently available.",
    });
  });
});
