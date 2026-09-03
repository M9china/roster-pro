import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  employee,
  type Employee,
  type NewEmployee,
} from "@/db/schema/employee";

type Database = typeof db;

export class EmployeeRepository {
  constructor(private readonly database: Database = db) {}

  async findById(id: string): Promise<Employee | undefined> {
    const [row] = await this.database
      .select()
      .from(employee)
      .where(eq(employee.id, id))
      .limit(1);

    return row;
  }

  async findByRestaurant(
    restaurantId: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<Employee[]> {
    const conditions = [eq(employee.restaurantId, restaurantId)];

    if (options.activeOnly) {
      conditions.push(eq(employee.active, true));
    }

    return this.database
      .select()
      .from(employee)
      .where(and(...conditions));
  }

  /**
   * Planning is currently scoped to bartenders only (see PlanningEmployee).
   * Filtering happens in the query rather than in the domain layer so we
   * don't pull every employee just to discard everyone but bartenders.
   * Widen this once the planning domain supports more roles.
   */
  async findActiveBartenders(restaurantId: string): Promise<Employee[]> {
    return this.database
      .select()
      .from(employee)
      .where(
        and(
          eq(employee.restaurantId, restaurantId),
          eq(employee.role, "bartender"),
          eq(employee.active, true),
        ),
      );
  }

  async create(data: NewEmployee): Promise<Employee> {
    const [row] = await this.database.insert(employee).values(data).returning();

    return row;
  }

  async update(
    id: string,
    data: Partial<NewEmployee>,
  ): Promise<Employee | undefined> {
    const [row] = await this.database
      .update(employee)
      .set(data)
      .where(eq(employee.id, id))
      .returning();

    return row;
  }

  /**
   * Employees are referenced by historical schedules, so we soft-delete
   * (deactivate) rather than hard-delete rows.
   */
  async deactivate(id: string): Promise<Employee | undefined> {
    return this.update(id, { active: false });
  }
}

export const employeeRepository = new EmployeeRepository();
