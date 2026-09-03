import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  restaurant,
  type Restaurant,
  type NewRestaurant,
} from "@/db/schema/restaurant";
import {
  schedulingPolicy,
  type SchedulingPolicy,
} from "@/db/schema/scheduling-policy";

type Database = typeof db;

export class RestaurantRepository {
  constructor(private readonly database: Database = db) {}

  async findById(id: string): Promise<Restaurant | undefined> {
    const [row] = await this.database
      .select()
      .from(restaurant)
      .where(eq(restaurant.id, id))
      .limit(1);

    return row;
  }

  async findBySlug(
    organizationId: string,
    slug: string,
  ): Promise<Restaurant | undefined> {
    const [row] = await this.database
      .select()
      .from(restaurant)
      .where(
        and(
          eq(restaurant.organizationId, organizationId),
          eq(restaurant.slug, slug),
        ),
      )
      .limit(1);

    return row;
  }

  async findByOrganization(
    organizationId: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<Restaurant[]> {
    const conditions = [eq(restaurant.organizationId, organizationId)];

    if (options.activeOnly) {
      conditions.push(eq(restaurant.active, true));
    }

    return this.database
      .select()
      .from(restaurant)
      .where(and(...conditions));
  }

  /**
   * The planning engine needs both the restaurant and its policy (rest
   * hours, days off, shift windows) in the same call, so this saves every
   * caller from having to remember to join them separately.
   *
   * Left join deliberately: a restaurant can exist before its scheduling
   * policy is configured (nothing auto-creates one yet), so `undefined`
   * here means "no such restaurant", while `schedulingPolicy: null` means
   * "restaurant exists, policy not set up" — callers must handle both.
   */
  async findWithSchedulingPolicy(
    id: string,
  ): Promise<
    | { restaurant: Restaurant; schedulingPolicy: SchedulingPolicy | null }
    | undefined
  > {
    const [row] = await this.database
      .select({
        restaurant,
        schedulingPolicy,
      })
      .from(restaurant)
      .leftJoin(
        schedulingPolicy,
        eq(schedulingPolicy.restaurantId, restaurant.id),
      )
      .where(eq(restaurant.id, id))
      .limit(1);

    return row;
  }

  async create(data: NewRestaurant): Promise<Restaurant> {
    const [row] = await this.database
      .insert(restaurant)
      .values(data)
      .returning();

    return row;
  }

  async update(
    id: string,
    data: Partial<NewRestaurant>,
  ): Promise<Restaurant | undefined> {
    const [row] = await this.database
      .update(restaurant)
      .set(data)
      .where(eq(restaurant.id, id))
      .returning();

    return row;
  }
}

export const restaurantRepository = new RestaurantRepository();
