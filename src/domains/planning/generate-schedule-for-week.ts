import { restaurantRepository } from "@/db/repositories/restaurant.repository";
import { employeeRepository } from "@/db/repositories/employee.repository";
import { serviceForecastRepository } from "@/db/repositories/service-forecast.repository";
import { scheduleRepository } from "@/db/repositories/schedule.repository";
import type { ServiceForecast } from "@/db/schema";
import type {
  Schedule,
  ShiftAssignmentRow,
  NewShiftAssignmentRow,
} from "@/db/schema/schedule";

import { DefaultPlanningEngine } from "./engine/default-planning-engine";
import { DefaultStaffingCalculator } from "./calculators/default-staffing-calculator";
import { DefaultAssignmentEngine } from "./assigners/default-assignment-engine";
import { DefaultValidationEngine } from "./validators/validation-engine";
import { MinimumRestValidator } from "./validators/minimum-rest.validator";
import { DaysOffValidator } from "./validators/days-off.validator";
import { DoubleShiftValidator } from "./validators/double-shift.validator";
import { ShiftCompatibilityValidator } from "./validators/shift-compatibility-validator";
import { toPlanningEmployee, type PlanningEmployee } from "./models/employee";
import { addDays, toISODateString } from "./constants/date-utils";

const DAYS_IN_WEEK = 7;

export class ScheduleGenerationError extends Error {}

export interface GenerateScheduleForWeekResult {
  schedule: Schedule;
  assignments: ShiftAssignmentRow[];
  warnings: string[];
}

export async function generateScheduleForWeek(input: {
  restaurantId: string;
  weekStart: Date;
}): Promise<GenerateScheduleForWeekResult> {
  const { restaurantId, weekStart } = input;

  if (weekStart.getUTCDay() !== 1) {
    throw new ScheduleGenerationError("weekStart must fall on a Monday (UTC).");
  }

  const found =
    await restaurantRepository.findWithSchedulingPolicy(restaurantId);

  if (!found) {
    throw new ScheduleGenerationError(`Restaurant ${restaurantId} not found.`);
  }

  if (!found.schedulingPolicy) {
    throw new ScheduleGenerationError(
      `Restaurant ${restaurantId} has no scheduling policy configured yet.`,
    );
  }

  const employeeRows =
    await employeeRepository.findActiveBartenders(restaurantId);

  const employees = employeeRows
    .map((row) => toPlanningEmployee(row))
    .filter((employee): employee is PlanningEmployee => employee !== null);

  const weekStartIso = toISODateString(weekStart);
  const weekEndIso = toISODateString(addDays(weekStart, DAYS_IN_WEEK - 1));

  const forecastRows =
    await serviceForecastRepository.findByRestaurantAndDateRange(
      restaurantId,
      weekStartIso,
      weekEndIso,
    );

  const forecasts = oneForecastPerDay(forecastRows);
  const warnings = missingForecastWarnings(weekStart, forecasts);

  const engine = createDefaultPlanningEngine();

  const result = engine.generateWeek({
    restaurantId,
    weekStart,
    employees,
    forecasts,
    policy: found.schedulingPolicy,
  });

  const schedule = await getOrCreateDraftSchedule(restaurantId, weekStartIso);

  const rows: NewShiftAssignmentRow[] = result.assignments.map(
    (assignment) => ({
      scheduleId: schedule.id,
      employeeId: assignment.employeeId,
      date: toISODateString(assignment.date),
      shiftType: assignment.shift,
    }),
  );

  const assignments = await scheduleRepository.replaceAssignments(
    schedule.id,
    rows,
  );

  return {
    schedule,
    assignments,
    warnings: [...warnings, ...result.warnings],
  };
}

function oneForecastPerDay(forecasts: ServiceForecast[]): ServiceForecast[] {
  const byDate = new Map<string, ServiceForecast>();

  for (const forecast of forecasts) {
    const existing = byDate.get(forecast.serviceDate);

    if (!existing || forecast.servicePeriod === "full_day") {
      byDate.set(forecast.serviceDate, forecast);
    }
  }

  return Array.from(byDate.values());
}

function missingForecastWarnings(
  weekStart: Date,
  forecasts: ServiceForecast[],
): string[] {
  const warnings: string[] = [];

  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    const date = toISODateString(addDays(weekStart, i));

    if (!forecasts.some((forecast) => forecast.serviceDate === date)) {
      warnings.push(
        `No forecast for ${date}; no shifts generated for that day.`,
      );
    }
  }

  return warnings;
}

async function getOrCreateDraftSchedule(
  restaurantId: string,
  weekStartDate: string,
): Promise<Schedule> {
  const existing = await scheduleRepository.findByRestaurantAndWeek(
    restaurantId,
    weekStartDate,
  );

  if (existing) {
    return existing;
  }

  return scheduleRepository.create({ restaurantId, weekStartDate });
}

function createDefaultPlanningEngine(): DefaultPlanningEngine {
  return new DefaultPlanningEngine(
    new DefaultStaffingCalculator(),
    new DefaultAssignmentEngine(
      new DefaultValidationEngine([
        new MinimumRestValidator(),
        new DaysOffValidator(),
        new DoubleShiftValidator(),
        new ShiftCompatibilityValidator(),
      ]),
    ),
  );
}
