export interface PlanningEmployee {
  id: string;

  firstName: string;

  lastName: string;

  role: "bartender";

  experienceLevel: "junior" | "intermediate" | "senior";

  employmentType: "full_time" | "part_time" | "casual";

  active: boolean;
}