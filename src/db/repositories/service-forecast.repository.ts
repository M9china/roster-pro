import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import {
  serviceForecast,
  type ServiceForecast,
  type NewServiceForecast,
} from "@/db/schema/service-forecast";

type Database = typeof db;

export class ServiceForecastRepository {
  constructor(private readonly database: Database = db) {}

  async findByRestaurantAndDateRange(
    restaurantId: string,
    startDate: string,
    endDate: string,
  ): Promise<ServiceForecast[]> {
    return this.database
      .select()
      .from(serviceForecast)
      .where(
        and(
          eq(serviceForecast.restaurantId, restaurantId),
          gte(serviceForecast.serviceDate, startDate),
          lte(serviceForecast.serviceDate, endDate),
        ),
      );
  }

  async create(data: NewServiceForecast): Promise<ServiceForecast> {
    const [row] = await this.database
      .insert(serviceForecast)
      .values(data)
      .returning();

    return row;
  }
}

export const serviceForecastRepository = new ServiceForecastRepository();
