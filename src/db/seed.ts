/**
 * Local/dev seed script -- creates one organization, one restaurant with a
 * scheduling policy, a small bartender roster, and a week of service
 * forecasts, so `POST /api/schedules/generate` has something real to work
 * with. Run with `pnpm db:seed`.
 *
 * Not idempotent by row content (re-running creates a second organization,
 * restaurant, etc. with new slugs) -- it appends a random suffix to slugs
 * specifically so re-running doesn't collide with unique constraints. If
 * you want a clean slate, wipe the tables first rather than relying on
 * this script to dedupe.
 */
import "dotenv/config";

import { db } from "./client";
import { organization } from "./schema/organizations";
import { restaurant } from "./schema/restaurant";
import { schedulingPolicy } from "./schema/scheduling-policy";
import { employee } from "./schema/employee";
import { serviceForecast } from "./schema/service-forecast";

const DAYS_IN_WEEK = 7;

async function seed() {
  const suffix = Math.random().toString(36).slice(2, 8);

  const [org] = await db
    .insert(organization)
    .values({
      name: "Seed Hospitality Group",
      legalName: "Seed Hospitality Group (Pty) Ltd",
      slug: `seed-hospitality-${suffix}`,
      timezone: "Africa/Johannesburg",
    })
    .returning();

  const [rest] = await db
    .insert(restaurant)
    .values({
      organizationId: org.id,
      name: "The Seed Bar",
      slug: `the-seed-bar-${suffix}`,
    })
    .returning();

  await db.insert(schedulingPolicy).values({
    restaurantId: rest.id,
  });

  const bartenders = [
    {
      firstName: "Thabo",
      lastName: "Mokoena",
      experienceLevel: "senior" as const,
    },
    {
      firstName: "Lindiwe",
      lastName: "Dlamini",
      experienceLevel: "senior" as const,
    },
    {
      firstName: "Sipho",
      lastName: "Nkosi",
      experienceLevel: "intermediate" as const,
    },
    {
      firstName: "Zanele",
      lastName: "Khumalo",
      experienceLevel: "intermediate" as const,
    },
    {
      firstName: "Kagiso",
      lastName: "Molefe",
      experienceLevel: "junior" as const,
    },
    {
      firstName: "Naledi",
      lastName: "Sithole",
      experienceLevel: "junior" as const,
    },
  ];

  await db.insert(employee).values(
    bartenders.map((b) => ({
      restaurantId: rest.id,
      firstName: b.firstName,
      lastName: b.lastName,
      role: "bartender" as const,
      experienceLevel: b.experienceLevel,
      employmentType: "full_time" as const,
    })),
  );

  // This week, starting from the most recent Monday, so it lines up with
  // whatever weekStart you test with right now.
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - daysSinceMonday,
    ),
  );

  const demandByDay = [
    "normal", // Mon
    "normal", // Tue
    "low", // Wed
    "normal", // Thu
    "high", // Fri
    "very_high", // Sat
    "high", // Sun
  ] as const;

  const forecasts = Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + i);

    return {
      restaurantId: rest.id,
      serviceDate: date.toISOString().slice(0, 10),
      servicePeriod: "full_day" as const,
      demandLevel: demandByDay[i],
      // Give Friday/Saturday real cover numbers, to actually exercise the
      // covers-based scaling in DefaultStaffingCalculator; leave the rest
      // at 0 to exercise the demand-level fallback path too.
      expectedReservations: i === 4 || i === 5 ? 90 : 0,
      expectedWalkIns: i === 4 || i === 5 ? 60 : 0,
    };
  });

  await db.insert(serviceForecast).values(forecasts);

  console.log("Seeded successfully:");
  console.log(`  restaurantId: ${rest.id}`);
  console.log(`  weekStart:    ${monday.toISOString().slice(0, 10)}`);
  console.log("");
  console.log("Try:");
  console.log(
    `  curl -X POST http://localhost:3000/api/schedules/generate -H "Content-Type: application/json" -d '{"restaurantId": "${rest.id}", "weekStart": "${monday.toISOString().slice(0, 10)}"}'`,
  );

  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
