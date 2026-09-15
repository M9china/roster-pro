# Roster Pro

> A rule-driven workforce scheduling engine for restaurants, designed to generate fair, demand-aware restaurant rosters from service forecasts and restaurant staffing policies.

---

## Table of Contents

* [Overview](#overview)
* [Problem](#problem)
* [Goals](#goals)
* [Core Concepts](#core-concepts)
* [Business Rules](#business-rules)
* [Architecture](#architecture)
* [Project Structure](#project-structure)
* [Domain Model](#domain-model)
* [Planning Pipeline](#planning-pipeline)
* [Staffing Calculation](#staffing-calculation)
* [Assignment Engine](#assignment-engine)
* [Validation](#validation)
* [Fairness Engine](#fairness-engine)
* [Data Access Layer](#data-access-layer)
* [Database](#database)
* [Technology Stack](#technology-stack)
* [Development Setup](#development-setup)
* [Environment Variables](#environment-variables)
* [Database Commands](#database-commands)
* [Testing](#testing)
* [Engineering Principles](#engineering-principles)
* [Current Status](#current-status)
* [Roadmap](#roadmap)
* [Future Product Architecture](#future-product-architecture)
* [Contributing](#contributing)
* [License](#license)

---

# Overview

**Roster Pro** is a restaurant workforce scheduling engine.

The system is designed around a simple idea:

> **A roster should be generated from actual service demand and operational rules, not from arbitrary manual assignment.**

Instead of simply assigning employees to shifts in a fixed sequence, Roster Pro is being built as a domain-driven scheduling system that considers:

* expected restaurant demand
* bookings and walk-ins
* service periods
* staffing requirements
* employee availability
* employee experience
* employment type
* required days off
* shift compatibility
* minimum rest periods
* double shifts
* early finishes
* weekend workload
* closing shifts
* consecutive working days
* fairness between employees

The long-term goal is to provide restaurant managers with a system where they can enter or import their weekly service information and generate a practical, balanced roster automatically.

---

# Problem

Restaurant rosters are often created manually.

This can lead to:

* uneven distribution of shifts
* employees receiving too many difficult shifts
* unfair weekend allocations
* closing shifts followed by opening shifts
* insufficient staffing during busy periods
* unnecessary staffing during quiet periods
* inconsistent use of junior and senior staff
* excessive double shifts
* managers spending significant time manually adjusting schedules

Roster Pro attempts to solve these problems by separating scheduling into clearly defined stages.

```text
Restaurant Data
      ↓
Service Forecast
      ↓
Staffing Calculation
      ↓
Shift Assignment
      ↓
Validation
      ↓
Fairness Evaluation
      ↓
Roster
```

---

# Goals

## Primary Goals

Roster Pro aims to:

1. Generate staffing requirements from service demand.
2. Assign employees to appropriate shifts.
3. Prevent invalid shift combinations.
4. Respect restaurant scheduling policies.
5. Distribute difficult shifts fairly.
6. Account for weekends and busy periods.
7. Support double shifts where operationally necessary.
8. Support early finishes where appropriate.
9. Generate weekly rosters consistently.
10. Eventually provide managers with a web-based roster management interface.

## Non-Goals

The initial system is **not** intended to solve every workforce management problem.

The MVP focuses primarily on restaurant bartender scheduling.

Future versions may expand support to:

* waiters
* barbacks
* hosts
* kitchen staff
* multiple departments
* multiple restaurants
* employee availability management
* leave management
* payroll integrations
* time tracking

---

# Core Concepts

Roster Pro is built around several core concepts.

## Employee

An employee represents a person who may be eligible for scheduling.

The database employee model contains information such as:

* ID
* first name
* last name
* email
* phone
* role
* employment type
* active status
* restaurant

The planning domain uses a more focused `PlanningEmployee` model.

This separation is intentional.

The database represents the broader employee entity, while the planning domain represents the information required by the scheduling engine.

---

## Service Forecast

A service forecast represents expected restaurant demand for a particular service date and period.

Forecast information includes:

* service date
* service period
* expected reservations
* expected walk-ins
* demand level
* special event information
* event name
* notes

Example:

```text
Date:        Saturday
Period:      Dinner
Bookings:    85
Walk-ins:    35
Demand:      Very High
Event:       Yes
```

The planning engine uses this information to determine how many bartenders are required.

---

## Staffing Requirement

A `StaffingRequirement` represents the staffing level required for a service period.

```ts
interface StaffingRequirement {
  totalBartenders: number;
  openingBartenders: number;
  midBartenders: number;
  closingBartenders: number;
  doubleShifts: number;
  earlyFinishes: number;
}
```

This allows the scheduling engine to separate:

**How many people are required?**

from:

**Which people should work?**

---

## Shift Assignment

A shift assignment connects an employee to a shift on a specific date.

```ts
interface ShiftAssignment {
  employeeId: string;
  date: Date;
  shift: ShiftType;
}
```

The shift system currently supports:

* `off`
* `opening`
* `mid`
* `closing`
* `double`

---

# Business Rules

Roster Pro is based on operational rules established for the restaurant environment.

## Weekly Schedule

The initial scheduling model assumes approximately:

* 8 bartenders
* 2 days off per bartender per week

The system should eventually ensure that employees receive their required days off while still maintaining sufficient staffing.

---

## Standard Shift Length

The normal target is approximately:

```text
8 hours
```

The closing shift is an exception because the restaurant may remain open late.

---

## Opening Shift

Typical opening hours:

```text
09:00 → 17:00
```

Opening employees prepare the bar and restaurant for service.

---

## Closing Shift

Typical closing hours:

```text
15:00 → 02:00
```

The exact operational implementation is controlled by restaurant scheduling policy.

---

## Busy Days

Friday, Saturday and Sunday are generally treated as high-demand periods.

However, Roster Pro should not blindly schedule every employee on every weekend day.

Staffing should respond to actual forecasted demand.

---

## Closing → Opening Restriction

An employee should not be assigned:

```text
Closing
   ↓
Next morning
Opening
```

For example:

```text
Friday:    Closing
Saturday:  Opening
```

is invalid.

This rule exists because the employee may finish around 02:00 and would then be expected to return for an opening shift around 09:00.

---

## Double Shifts

Double shifts may be used when operationally required.

A double shift represents an employee working more than one shift during the same service day.

However, double shifts should not become the default mechanism for solving staffing shortages.

The scheduling policy determines whether double shifts are allowed.

---

## Early Finishes

Early finishes may be used when demand decreases after the restaurant's peak period.

This allows the system to avoid unnecessarily keeping the full team on duty.

---

## Fairness

The roster should not only be valid.

It should also be fair.

The system therefore evaluates assignments using multiple fairness factors.

Current fairness considerations include:

* total shifts
* weekend shifts
* closing shifts
* double shifts
* consecutive working days

---

# Architecture

Roster Pro follows a layered/domain-oriented architecture.

At a high level:

```text
┌─────────────────────────────┐
│        Application/UI       │
│     Next.js / API Layer     │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│       Planning Domain       │
│                             │
│  Planning Engine            │
│  Staffing Calculator        │
│  Assignment Engine          │
│  Validation Engine          │
│  Fairness Engine            │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│       Data Access Layer     │
│                             │
│  Employee Repository        │
│  Restaurant Repository      │
│  Schedule Repository        │
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────┐
│          PostgreSQL         │
└─────────────────────────────┘
```

The important architectural principle is that the scheduling domain should not become tightly coupled to the database implementation.

---

# Project Structure

The project currently follows this general structure:

```text
src/
├── db/
│   ├── client.ts
│   ├── index.ts
│   ├── migrations/
│   ├── repositories/
│   │   ├── employee.repository.ts
│   │   ├── resturant.repository.ts
│   │   └── schedule.repository.ts
│   └── schema/
│       ├── employee.ts
│       ├── enums.ts
│       ├── organizations.ts
│       ├── relations.ts
│       ├── restaurant.ts
│       ├── scheduling-policy.ts
│       └── service-forecast.ts
│
└── domains/
    └── planning/
        ├── assigners/
        ├── calculators/
        ├── constants/
        ├── engine/
        ├── fairness/
        ├── models/
        ├── validators/
        └── index.ts
```

---

# Domain Model

The planning domain deliberately does not need to know everything about the database.

For example:

```ts
export interface PlanningEmployee {
  id: string;
  firstName: string;
  lastName: string;
  role: "bartender";
  experienceLevel: "junior" | "intermediate" | "senior";
  employmentType:
    | "full_time"
    | "part_time"
    | "casual";
  active: boolean;
}
```

This model represents an employee **as required by the planning engine**.

It is not necessarily a complete representation of the database employee.

This distinction creates a boundary between:

```text
Database Model
       ↓
Mapping / Repository Boundary
       ↓
Planning Domain Model
```

That boundary should be preserved as the application grows.

---

# Planning Pipeline

The planning process follows several stages.

## 1. Load Employees

The system retrieves active employees eligible for scheduling.

```text
Employee Repository
        ↓
PlanningEmployee[]
```

---

## 2. Load Forecast

The system retrieves service forecasts for the required dates.

```text
Service Forecast
        ↓
Planning Engine
```

---

## 3. Calculate Staffing Requirement

The staffing calculator determines how many employees are required.

```text
Forecast
   ↓
Staffing Calculator
   ↓
StaffingRequirement
```

---

## 4. Assign Shifts

The assignment engine attempts to assign employees to the required shifts.

```text
Employees
   +
StaffingRequirement
   +
Date
   ↓
Assignment Engine
   ↓
ShiftAssignment[]
```

---

## 5. Validate Assignments

Every candidate assignment must pass the validation rules.

```text
Candidate Assignment
        ↓
Validation Engine
        ↓
Valid / Invalid
```

---

## 6. Evaluate Fairness

Once assignments exist, the fairness engine evaluates how evenly the workload has been distributed.

```text
Assignments
     ↓
Fairness Factors
     ↓
Fairness Scores
```

---

## 7. Produce Roster

The final result becomes the roster consumed by the application layer.

Future output formats include:

* web UI
* Excel
* printable roster
* API response
* terminal representation for development/debugging

---

# Staffing Calculation

The staffing calculator converts service demand into operational staffing requirements.

The current implementation uses demand levels such as:

```text
very_low
low
normal
```

Additional demand levels can be introduced as the model evolves.

For example, a normal service period may require:

```text
Total Bartenders: 5
Opening:          2
Mid:              1
Closing:          2
Double Shifts:    0
Early Finishes:   0
```

The important design principle is that staffing calculation is separate from employee assignment.

This makes it possible to change staffing rules without rewriting the assignment engine.

---

# Assignment Engine

The assignment engine is responsible for answering:

> Given the required staffing level, which employees should be assigned?

The current assignment flow:

```text
Active Employees
       ↓
Opening assignments
       ↓
Mid assignments
       ↓
Closing assignments
       ↓
Double assignments
```

Before assigning an employee, the engine checks whether the assignment is valid.

Normal shifts cannot be assigned to an employee who already has another shift that day.

Double shifts are treated separately because they explicitly represent working multiple shifts in one day.

---

# Validation

Validation protects the scheduling domain from invalid assignments.

The project uses an `AssignmentValidator` abstraction:

```ts
interface AssignmentValidator {
  validate(
    employee: PlanningEmployee,
    shift: ShiftAssignment,
    assignments: ShiftAssignment[],
  ): boolean;
}
```

The validation engine runs all registered validators.

```text
Candidate Assignment
        ↓
Validator 1
        ↓
Validator 2
        ↓
Validator 3
        ↓
...
        ↓
Valid
```

If any validator rejects the assignment, the assignment is not created.

---

## Current Validation Rules

The project currently contains validators covering areas such as:

* days off
* double shifts
* minimum rest
* shift compatibility

One important rule is:

```text
Closing → Opening next calendar day
```

which must be rejected.

---

# Fairness Engine

The fairness engine evaluates completed assignments.

It uses independent fairness factors.

Current factors include:

```text
Shift Count
Weekend Shifts
Closing Shifts
Double Shifts
Consecutive Days
```

Each factor produces a score.

The weighted fairness system then combines those scores.

Conceptually:

```text
                    ┌── Shift Count
                    │
                    ├── Weekend Shifts
Assignments ────────┼── Closing Shifts
                    │
                    ├── Double Shifts
                    │
                    └── Consecutive Days
                             ↓
                       Weighted Score
```

The current scoring approach treats lower workloads as better for the fairness factors.

For example:

```text
Employee A
Shift Count: -3

Employee B
Shift Count: -5
```

Employee A receives the better score for this factor because they worked fewer shifts.

The final fairness policy determines how heavily each factor contributes.

---

# Data Access Layer

The data access layer is responsible for communicating with PostgreSQL through Drizzle ORM.

Repositories are intended to provide a boundary between:

```text
Domain Logic
      ↓
Repository Interfaces
      ↓
Drizzle
      ↓
PostgreSQL
```

Current repository areas include:

* Employee
* Restaurant
* Schedule

Repositories should encapsulate persistence concerns rather than allowing domain logic to directly construct database queries.

This is particularly important because the planning engine should remain testable without requiring a live PostgreSQL database.

---

# Database

Roster Pro uses PostgreSQL as its primary database.

The project uses Drizzle ORM for schema definitions, queries and migrations.

Current database concepts include:

```text
Organization
    │
    └── Restaurant
           │
           ├── Employees
           ├── Service Forecasts
           └── Scheduling Policy
```

---

# Scheduling Policy

Scheduling behavior is configurable through restaurant-level scheduling policy.

Current policy concepts include:

* default shift hours
* minimum rest hours
* days off per week
* whether double shifts are allowed
* whether early finishes are allowed
* opening shift start/end
* closing shift start/end
* policy version

Example defaults:

```text
Default shift hours:       8
Minimum rest hours:       11
Days off per week:        2
Double shifts:             Allowed
Early finishes:            Allowed

Opening:
09:00 → 17:00

Closing:
15:00 → 02:00
```

The goal is to keep operational rules configurable rather than hard-coded throughout the scheduling engine.

---

# Technology Stack

## Backend / Application

* TypeScript
* Next.js
* Node.js

## Database

* PostgreSQL
* Drizzle ORM
* Drizzle Kit

## Testing

* Vitest
* TypeScript type checking

## Infrastructure

* Vercel for the planned MVP deployment
* PostgreSQL-compatible hosted database

---

# Development Setup

## Requirements

Before working on the project, install:

* Node.js
* pnpm
* PostgreSQL or access to a PostgreSQL-compatible database

Recommended Node.js version should match the project's configured environment.

---

## Install Dependencies

```bash
pnpm install
```

---

## Environment Configuration

Create a local environment file:

```text
.env.local
```

Database configuration should be supplied through environment variables rather than committed to source control.

Never commit:

```text
.env
.env.local
```

or database credentials to Git.

---

# Database Commands

The project uses Drizzle Kit.

Common commands include:

### Push schema

```bash
pnpm db:push
```

### Generate migration

```bash
pnpm db:generate
```

### Run migrations

```bash
pnpm db:migrate
```

### Open Drizzle Studio

```bash
pnpm db:studio
```

The exact scripts are defined in `package.json`.

---

# Testing

Testing is a core part of the domain development process.

The project uses Vitest.

Run the complete test suite:

```bash
pnpm test
```

For development, tests should be written alongside domain behavior.

Examples include:

* staffing calculations
* insufficient staffing
* shift compatibility
* minimum rest
* double shift rules
* days off
* fairness calculations
* weekly planning

---

# Type Checking

Before committing domain changes, run:

```bash
pnpm exec tsc --noEmit
```

The project should have no TypeScript errors before changes are considered complete.

---

# Engineering Principles

Roster Pro follows several architectural principles.

## 1. Domain First

Business rules should live in the domain layer rather than inside UI components or database queries.

---

## 2. Separate Responsibilities

Each component should have one primary responsibility.

For example:

```text
Staffing Calculator
→ determines how many people are needed

Assignment Engine
→ determines who should be assigned

Validation Engine
→ determines whether an assignment is valid

Fairness Engine
→ evaluates how fair the result is
```

---

## 3. Prefer Composition

The planning system uses interfaces and independent components so that behavior can be replaced without rewriting the entire system.

For example:

```ts
StaffingCalculator
AssignmentEngine
ValidationEngine
FairnessEngine
```

can each have different implementations.

---

## 4. Avoid Database Leakage

Domain models should not become tightly coupled to Drizzle models.

The database is a persistence mechanism.

The scheduling engine is business logic.

They should communicate through explicit boundaries.

---

## 5. Make Business Rules Testable

A rule such as:

> An employee cannot open immediately after closing.

should be testable without:

* starting Next.js
* connecting to PostgreSQL
* rendering a UI
* making an HTTP request

This makes the core scheduling engine faster and safer to develop.

---

# Current Status

Roster Pro is currently in the **domain and infrastructure development stage**.

Completed or substantially developed areas include:

* planning domain structure
* planning employee model
* staffing requirement model
* assignment model
* staffing calculator
* planning engine
* weekly planning concepts
* assignment engine
* validation engine architecture
* shift compatibility validation
* minimum rest validation
* days-off validation
* double-shift validation
* fairness engine architecture
* fairness factors
* weighted fairness configuration
* scheduling policy schema
* service forecast schema
* employee schema
* restaurant schema
* PostgreSQL integration foundation
* Drizzle migrations
* automated domain tests

The data access/repository layer is currently being implemented to connect the domain to persistent data.

---

# Roadmap

## Phase 1 — Domain Foundation

* [x] Define planning domain
* [x] Define employee model
* [x] Define shift assignments
* [x] Implement staffing calculation
* [x] Implement assignment engine
* [x] Implement validation architecture
* [x] Implement core shift compatibility rules
* [x] Implement fairness architecture
* [x] Add automated tests

---

## Phase 2 — Data Access

* [ ] Implement employee repository
* [ ] Implement restaurant repository
* [ ] Implement schedule repository
* [ ] Define domain-to-database mapping
* [ ] Connect planning engine to persisted data
* [ ] Complete end-to-end database tests

---

## Phase 3 — Planning Engine

* [ ] Complete weekly roster generation
* [ ] Improve staffing calculations
* [ ] Handle insufficient staff explicitly
* [ ] Improve employee selection strategy
* [ ] Integrate fairness scoring into assignment decisions
* [ ] Improve days-off allocation
* [ ] Improve weekend balancing
* [ ] Handle complex double-shift scenarios
* [ ] Add roster optimization/retry behavior

---

## Phase 4 — API

Build application services/API endpoints for:

* employees
* restaurants
* forecasts
* scheduling policies
* roster generation
* roster publishing
* roster history

---

## Phase 5 — Web Application

Build the manager interface.

Potential features:

* restaurant dashboard
* employee management
* weekly forecast input
* booking input
* staffing preview
* roster generation
* roster editing
* conflict warnings
* fairness indicators
* roster publishing
* roster export

---

## Phase 6 — Export

Support:

* Excel
* PDF
* printable roster
* CSV

---

## Phase 7 — Production

* authentication
* authorization
* restaurant isolation
* production database
* monitoring
* logging
* error tracking
* backups
* deployment
* performance optimization

---

# Future Product Architecture

The long-term architecture is expected to evolve toward:

```text
                    ROSTER PRO
                         │
          ┌──────────────┴──────────────┐
          │                             │
     Manager App                   API / Services
          │                             │
          └──────────────┬──────────────┘
                         │
                  Planning Domain
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Forecasting      Scheduling        Fairness
        │                │                │
        └────────────────┼────────────────┘
                         │
                    Data Access
                         │
                    PostgreSQL
```

Eventually, the scheduling engine should be capable of becoming an independent reusable component.

This would make it possible for the web application, mobile application or external integrations to consume the same scheduling logic.

---

# Design Philosophy

Roster Pro is not intended to be simply a CRUD application for entering employees and shifts.

The central product is the **scheduling engine**.

The UI and database exist to support the engine.

The fundamental flow is:

```text
Demand
  ↓
Staffing Need
  ↓
Candidate Assignments
  ↓
Constraint Validation
  ↓
Fairness Evaluation
  ↓
Optimized Roster
```

This distinction is important.

The system should eventually be able to answer not only:

> "Who is working?"

but also:

> "Why was this person assigned this shift?"

and:

> "Is this roster operationally valid and fair?"

---

# Contributing

When making changes:

1. Understand the domain rule being changed.
2. Identify the appropriate domain component.
3. Add or update tests.
4. Run TypeScript validation.
5. Run the test suite.
6. Review the effect on existing business rules.
7. Keep database concerns outside the domain where possible.

# License

License information will be added when the project's licensing strategy is finalized.

---

# Project Vision

Roster Pro aims to turn restaurant roster creation from a repetitive manual task into a structured scheduling problem that software can solve.

The long-term vision is:

> **Enter the demand. Define the rules. Generate a fair roster.**

The system should help managers spend less time building rosters and more time managing their teams and running their restaurants.
