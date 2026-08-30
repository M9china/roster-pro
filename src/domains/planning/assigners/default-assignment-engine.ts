import type { AssignmentEngine } from "./assignment-engine";
import type { PlanningEmployee } from "../models/employee";
import type { StaffingRequirement } from "../models/staffing-requirement";
import type { ShiftAssignment } from "../models/assigner";

export class DefaultAssignmentEngine implements AssignmentEngine {
  assign(
    employees: PlanningEmployee[],
    requirement: StaffingRequirement,
    date: Date,
  ): ShiftAssignment[] {
    const activeEmployees = employees.filter((employee) => employee.active);

    const assignments: ShiftAssignment[] = [];

    let employeeIndex = 0;

    // Opening shifts
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

    // Mid shifts
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

    // Closing shifts
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

    // Double shifts
    for (let index = 0; index < requirement.doubleShifts; index++) {
      const employee = activeEmployees[index];

      if (!employee) {
        break;
      }

      assignments.push({
        employeeId: employee.id,
        date,
        shift: "double",
      });
    }

    return assignments;
  }
}
