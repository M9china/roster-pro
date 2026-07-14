import type { Employee } from "@/db/schema";

export function createEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: crypto.randomUUID(),
    restaurantId: "restaurant-1",
    firstName: "John",
    lastName: "Doe",
    email: null,
    phone: null,
    role: "bartender",
    employmentType: "full_time",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createEmployees(
  count: number,
  overrides: Partial<Employee> = {},
): Employee[] {
  return Array.from({ length: count }, (_, index) =>
    createEmployee({
      id: `employee-${index + 1}`,
      ...overrides,
    }),
  );
}
