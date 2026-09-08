import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { scheduleRepository } from "@/db/repositories/schedule.repository";
import { employeeRepository } from "@/db/repositories/employee.repository";

const querySchema = z.object({
  restaurantId: z.string().min(1),
  weekStart: z.iso.date(), // 'YYYY-MM-DD'
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    restaurantId: request.nextUrl.searchParams.get("restaurantId"),
    weekStart: request.nextUrl.searchParams.get("weekStart"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const schedule = await scheduleRepository.findByRestaurantAndWeek(
    parsed.data.restaurantId,
    parsed.data.weekStart,
  );

  if (!schedule) {
    return NextResponse.json(
      { error: "No schedule found for that restaurant/week." },
      { status: 404 },
    );
  }

  const found = await scheduleRepository.findWithAssignments(schedule.id);

  // The grid pivot (employee rows x date columns) happens client-side --
  // this stays a plain data fetch. But raw employeeIds aren't meaningful to
  // display, so the employee roster is included alongside the flat
  // assignment rows for the client to join against.
  const employees = await employeeRepository.findByRestaurant(
    parsed.data.restaurantId,
  );

  return NextResponse.json({
    schedule: found?.schedule ?? null,
    assignments: found?.assignments ?? [],
    employees: employees.map((employee) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      active: employee.active,
    })),
  });
}
