import type { AssignmentEngine } from "./assignment-engine";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";
import { ShiftAssignment } from "../models/assigner";

export class DefaultAssignmentEngine implements AssignmentEngine {
  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
  ): ShiftAssignment[] {
    const activeEmployees = employees.filter((employee) => employee.active);

    const assignments: ShiftAssignment[] = [];

    let employeeIndex = 0;

    for (let index = 0; index < requirement.openingBartenders; index++) {
      const employee = activeEmployees[employeeIndex++];

      if (!employee) {
        break;
      }

      assignments.push({
        employeeId: employee.id,
        date,
        shift: "opening",
      });
    }

    for (let index = 0; index < requirement.midBartenders; index++) {
      const employee = activeEmployees[employeeIndex++];

      if (!employee) {
        break;
      }

      assignments.push({
        employeeId: employee.id,
        date,
        shift: "mid",
      });
    }

    for (let index = 0; index < requirement.closingBartenders; index++) {
      const employee = activeEmployees[employeeIndex++];

      if (!employee) {
        break;
      }

      assignments.push({
        employeeId: employee.id,
        date,
        shift: "closing",
      });
    }

    return assignments;
  }
}
