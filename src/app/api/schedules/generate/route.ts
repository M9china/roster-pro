import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateScheduleForWeek,
  ScheduleGenerationError,
} from "@/domains/planning/generate-schedule-for-week";

const bodySchema = z.object({
  restaurantId: z.string().min(1),
  weekStart: z.iso.date(), // 'YYYY-MM-DD', must be a Monday
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await generateScheduleForWeek({
      restaurantId: parsed.data.restaurantId,
      weekStart: new Date(parsed.data.weekStart),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ScheduleGenerationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("Failed to generate schedule", error);

    return NextResponse.json(
      { error: "Failed to generate schedule." },
      { status: 500 },
    );
  }
}
