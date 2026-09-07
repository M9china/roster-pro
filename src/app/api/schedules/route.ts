import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { scheduleRepository } from "@/db/repositories/schedule.repository";

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

  return NextResponse.json(found);
}
