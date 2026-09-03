export interface PlanningEmployee {
  id: string;

  firstName: string;

  lastName: string;

  // Planning currently only scores bartenders; other DB roles pass through
  // untouched until the planning domain widens (see roadmap).
  role: "bartender";

  // Nullable in the DB — treat missing experience as "junior" at the point
  // of use (fairness/staffing calculators) rather than assuming it's set.
  experienceLevel: "junior" | "intermediate" | "senior" | null;

  employmentType: "full_time" | "part_time" | "casual";

  active: boolean;
}

/**
 * Narrows a DB employee row into the planning domain's employee shape.
 * Returns null for anyone who isn't an active bartender — the caller
 * (ShiftAssigner) filters the roster down to just the people planning
 * currently knows how to schedule, rather than silently mis-typing a
 * waiter or host as a bartender.
 */
export function toPlanningEmployee(employee: {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  experienceLevel: "junior" | "intermediate" | "senior" | null;
  employmentType: "full_time" | "part_time" | "casual";
  active: boolean;
}): PlanningEmployee | null {
  if (employee.role !== "bartender" || !employee.active) {
    return null;
  }

  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    role: "bartender",
    experienceLevel: employee.experienceLevel,
    employmentType: employee.employmentType,
    active: employee.active,
  };
}