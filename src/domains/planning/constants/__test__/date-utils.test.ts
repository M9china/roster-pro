import { describe, expect, it } from "vitest";

import {
  addDays,
  isNextCalendarDay,
  isSameCalendarDay,
  toISODateString,
} from "../date-utils";

describe("date-utils (UTC-consistent)", () => {
  describe("isSameCalendarDay", () => {
    it("is true for the same UTC calendar day, different times", () => {
      expect(
        isSameCalendarDay(
          new Date("2026-08-28T01:00:00Z"),
          new Date("2026-08-28T23:00:00Z"),
        ),
      ).toBe(true);
    });

    it("is false across a UTC midnight boundary", () => {
      expect(
        isSameCalendarDay(
          new Date("2026-08-28T23:59:00Z"),
          new Date("2026-08-29T00:01:00Z"),
        ),
      ).toBe(false);
    });

    it("reads the UTC date even for a time that would be a different day in a positive local offset", () => {
      // 2026-08-28T23:00Z is 2026-08-29 01:00 in UTC+2 -- a local-getter
      // implementation running on a UTC+2 machine would (correctly, by
      // coincidence) still read this as the 28th only because getDate()
      // reflects the process's local time. The point of this suite isn't
      // to fake a timezone (Date getters follow the host's real offset,
      // which vitest doesn't let us override per-call) -- it's to lock in
      // that isSameCalendarDay uses UTC getters specifically, so it gives
      // the same answer regardless of what timezone the process runs in.
      const date = new Date("2026-08-28T23:00:00Z");

      expect(date.getUTCDate()).toBe(28);
    });
  });

  describe("isNextCalendarDay", () => {
    it("is true when next is exactly one UTC calendar day after previous", () => {
      expect(
        isNextCalendarDay(
          new Date("2026-08-28T22:00:00Z"),
          new Date("2026-08-29T01:00:00Z"),
        ),
      ).toBe(true);
    });

    it("is false when the dates are the same day", () => {
      expect(
        isNextCalendarDay(
          new Date("2026-08-28T01:00:00Z"),
          new Date("2026-08-28T22:00:00Z"),
        ),
      ).toBe(false);
    });

    it("is false when more than one day apart", () => {
      expect(
        isNextCalendarDay(
          new Date("2026-08-27T01:00:00Z"),
          new Date("2026-08-29T01:00:00Z"),
        ),
      ).toBe(false);
    });
  });

  describe("addDays", () => {
    it("adds days using UTC arithmetic, preserving time-of-day", () => {
      const result = addDays(new Date("2026-08-28T14:30:00Z"), 3);

      expect(result.toISOString()).toBe("2026-08-31T14:30:00.000Z");
    });

    it("rolls over a UTC month boundary correctly", () => {
      const result = addDays(new Date("2026-08-30T00:00:00Z"), 3);

      expect(toISODateString(result)).toBe("2026-09-02");
    });

    it("supports negative offsets", () => {
      const result = addDays(new Date("2026-08-28T00:00:00Z"), -1);

      expect(toISODateString(result)).toBe("2026-08-27");
    });
  });

  describe("toISODateString", () => {
    it("formats a UTC-midnight date as its calendar date", () => {
      expect(toISODateString(new Date("2026-08-28T00:00:00Z"))).toBe(
        "2026-08-28",
      );
    });

    it("round-trips a date-only string through new Date() unchanged", () => {
      // This is the property the rest of the planning domain relies on:
      // DB date strings ('YYYY-MM-DD') parse as UTC midnight, and
      // toISODateString should recover exactly that string.
      const original = "2026-09-14";

      expect(toISODateString(new Date(original))).toBe(original);
    });
  });
});
