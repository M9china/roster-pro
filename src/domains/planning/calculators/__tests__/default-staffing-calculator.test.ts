import { describe, expect, it } from "vitest";

import type { ServiceForecast } from "@/db/schema";

import { DefaultStaffingCalculator } from "../default-staffing-calculator";

function createForecast(
  demandLevel: "very_low" | "low" | "normal" | "high" | "very_high",
  overrides: Partial<ServiceForecast> = {},
): ServiceForecast {
  return {
    id: "forecast-1",
    restaurantId: "restaurant-1",
    serviceDate: "2026-08-28",
    servicePeriod: "full_day",
    expectedReservations: 0,
    expectedWalkIns: 0,
    demandLevel,
    specialEvent: false,
    eventName: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("DefaultStaffingCalculator", () => {
  const calculator = new DefaultStaffingCalculator();

  it("returns minimum staffing for very low demand", () => {
    const result = calculator.calculate(createForecast("very_low"));

    expect(result).toEqual({
      totalBartenders: 2,
      openingBartenders: 1,
      midBartenders: 0,
      closingBartenders: 1,
      doubleShifts: 0,
      earlyFinishes: 0,
    });
  });

  it("returns low staffing requirements for low demand", () => {
    const result = calculator.calculate(createForecast("low"));

    expect(result).toEqual({
      totalBartenders: 3,
      openingBartenders: 1,
      midBartenders: 1,
      closingBartenders: 1,
      doubleShifts: 0,
      earlyFinishes: 0,
    });
  });

  it("returns normal staffing requirements for normal demand", () => {
    const result = calculator.calculate(createForecast("normal"));

    expect(result).toEqual({
      totalBartenders: 5,
      openingBartenders: 2,
      midBartenders: 1,
      closingBartenders: 2,
      doubleShifts: 0,
      earlyFinishes: 1,
    });
  });

  it("increases staffing for high demand", () => {
    const result = calculator.calculate(createForecast("high"));

    expect(result).toEqual({
      totalBartenders: 6,
      openingBartenders: 2,
      midBartenders: 2,
      closingBartenders: 2,
      doubleShifts: 1,
      earlyFinishes: 2,
    });
  });

  it("uses maximum staffing for very high demand", () => {
    const result = calculator.calculate(createForecast("very_high"));

    expect(result).toEqual({
      totalBartenders: 8,
      openingBartenders: 3,
      midBartenders: 2,
      closingBartenders: 3,
      doubleShifts: 2,
      earlyFinishes: 3,
    });
  });

  it("requires more bartenders as demand increases", () => {
    const veryLow = calculator.calculate(createForecast("very_low"));

    const normal = calculator.calculate(createForecast("normal"));

    const veryHigh = calculator.calculate(createForecast("very_high"));

    expect(veryLow.totalBartenders).toBeLessThan(normal.totalBartenders);

    expect(normal.totalBartenders).toBeLessThan(veryHigh.totalBartenders);
  });

  describe("when the forecast has reservation/walk-in numbers", () => {
    it("falls back to the demand-level baseline when covers are zero", () => {
      // Restaurants that haven't started entering forecast numbers yet
      // still get sensible staffing -- zero covers must not mean zero staff.
      const result = calculator.calculate(
        createForecast("normal", {
          expectedReservations: 0,
          expectedWalkIns: 0,
        }),
      );

      expect(result).toEqual({
        totalBartenders: 5,
        openingBartenders: 2,
        midBartenders: 1,
        closingBartenders: 2,
        doubleShifts: 0,
        earlyFinishes: 1,
      });
    });

    it("keeps the baseline when covers fit within its existing capacity", () => {
      // "normal" baseline covers 5 bartenders x 25 covers = up to 125.
      const result = calculator.calculate(
        createForecast("normal", {
          expectedReservations: 60,
          expectedWalkIns: 40,
        }),
      );

      expect(result.totalBartenders).toBe(5);
      expect(result.midBartenders).toBe(1);
    });

    it("adds bartenders to the mid shift when covers exceed baseline capacity", () => {
      // 200 covers needs ceil(200 / 25) = 8 bartenders, 3 more than the
      // "normal" baseline of 5 -- all 3 should land on the mid shift.
      const result = calculator.calculate(
        createForecast("normal", {
          expectedReservations: 120,
          expectedWalkIns: 80,
        }),
      );

      expect(result).toEqual({
        totalBartenders: 8,
        openingBartenders: 2,
        midBartenders: 4,
        closingBartenders: 2,
        doubleShifts: 0,
        earlyFinishes: 1,
      });
    });

    it("never reduces staffing below the demand-level baseline", () => {
      // Even a handful of covers on a "very_high" demand day shouldn't
      // undercut a level a manager explicitly set.
      const result = calculator.calculate(
        createForecast("very_high", {
          expectedReservations: 5,
          expectedWalkIns: 0,
        }),
      );

      expect(result.totalBartenders).toBe(8);
    });
  });
});
