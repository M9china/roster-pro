"use client";

import { useState } from "react";

type ShiftType = "opening" | "mid" | "closing" | "double" | "off";

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

interface AssignmentRow {
  id: string;
  scheduleId: string;
  employeeId: string;
  date: string; // 'YYYY-MM-DD', already serialized by the API
  shiftType: ShiftType;
}

interface ScheduleRow {
  id: string;
  restaurantId: string;
  weekStartDate: string;
  status: "draft" | "published" | "archived";
  version: number;
}

interface ScheduleResponse {
  schedule: ScheduleRow | null;
  assignments: AssignmentRow[];
  employees: EmployeeRow[];
}

interface GenerateResponse extends ScheduleResponse {
  warnings: string[];
}

const SHIFT_STYLES: Record<
  Exclude<ShiftType, "off">,
  { label: string; accent: string; text: string }
> = {
  opening: { label: "Open", accent: "#7FA37A", text: "#DDE9D9" },
  mid: { label: "Mid", accent: "#C88A46", text: "#F2E1C9" },
  closing: { label: "Close", accent: "#7B8FB0", text: "#DCE4EF" },
  double: { label: "Double", accent: "#B0587B", text: "#F1D9E2" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string, dayIndex: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const dayOfMonth = date.getUTCDate();
  const month = date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${DAY_LABELS[dayIndex]} ${dayOfMonth} ${month}`;
}

export default function SchedulesPage() {
  const [restaurantId, setRestaurantId] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [loading, setLoading] = useState<"load" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [data, setData] = useState<ScheduleResponse | null>(null);

  const canSubmit = restaurantId.trim().length > 0 && weekStart.length > 0;

  async function handleLoad() {
    setLoading("load");
    setError(null);

    try {
      const res = await fetch(
        `/api/schedules?restaurantId=${encodeURIComponent(restaurantId)}&weekStart=${weekStart}`,
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load schedule.");
        setData(null);
        return;
      }

      setData(json as ScheduleResponse);
      setWarnings([]);
    } catch {
      setError("Failed to load schedule.");
    } finally {
      setLoading(null);
    }
  }

  async function handleGenerate() {
    setLoading("generate");
    setError(null);

    try {
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, weekStart }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to generate schedule.");
        return;
      }

      const generated = json as GenerateResponse;

      // The generate endpoint doesn't return the employee roster (it isn't
      // needed to build a schedule), so pull it in with a follow-up load
      // rather than rendering the grid with unlabeled employeeIds.
      const roster = await fetch(
        `/api/schedules?restaurantId=${encodeURIComponent(restaurantId)}&weekStart=${weekStart}`,
      );
      const rosterJson = await roster.json();

      setData({
        schedule: generated.schedule,
        assignments: generated.assignments,
        employees: rosterJson.employees ?? [],
      });
      setWarnings(generated.warnings ?? []);
    } catch {
      setError("Failed to generate schedule.");
    } finally {
      setLoading(null);
    }
  }

  const dates = data?.schedule
    ? Array.from({ length: 7 }, (_, i) =>
        addDays(data.schedule!.weekStartDate, i),
      )
    : [];

  const assignmentByEmployeeAndDate = new Map<string, AssignmentRow>();
  for (const assignment of data?.assignments ?? []) {
    assignmentByEmployeeAndDate.set(
      `${assignment.employeeId}__${assignment.date}`,
      assignment,
    );
  }

  const employees = [...(data?.employees ?? [])].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.lastName.localeCompare(b.lastName);
  });

  return (
    <div className="min-h-screen bg-[#16130F] text-[#F3ECDD]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="mb-8 border-b border-[#3A3122] pb-6">
          <p
            className="mb-1 text-xs tracking-[0.2em] text-[#948B76] uppercase"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Roster Pro
          </p>
          <h1
            className="text-4xl text-[#F3ECDD]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            Shift Board
          </h1>
        </header>

        <section className="mb-8 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span
              className="text-xs tracking-[0.12em] text-[#948B76] uppercase"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Restaurant ID
            </span>
            <input
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              placeholder="01M1XG0MZMB8GDCPZDC5E2Y77D"
              className="w-72 rounded-sm border border-[#3A3122] bg-[#1E1912] px-3 py-2 text-sm text-[#F3ECDD] placeholder-[#5C5747] outline-none focus:border-[#C88A46]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span
              className="text-xs tracking-[0.12em] text-[#948B76] uppercase"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Week starting (Mon)
            </span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-44 rounded-sm border border-[#3A3122] bg-[#1E1912] px-3 py-2 text-sm text-[#F3ECDD] outline-none focus:border-[#C88A46]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </label>

          <button
            onClick={handleLoad}
            disabled={!canSubmit || loading !== null}
            className="rounded-sm border border-[#3A3122] bg-[#1E1912] px-4 py-2 text-sm text-[#F3ECDD] transition hover:border-[#948B76] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {loading === "load" ? "Loading…" : "Load"}
          </button>

          <button
            onClick={handleGenerate}
            disabled={!canSubmit || loading !== null}
            className="rounded-sm bg-[#C88A46] px-4 py-2 text-sm font-medium text-[#16130F] transition hover:bg-[#E0A25E] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {loading === "generate" ? "Generating…" : "Generate week"}
          </button>
        </section>

        {error && (
          <div
            className="mb-6 rounded-sm border border-[#C1503D] bg-[#241512] px-4 py-3 text-sm text-[#F1C9C1]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-6 rounded-sm border border-l-4 border-[#3A3122] border-l-[#C1503D] bg-[#1E1912] px-4 py-3">
            <p
              className="mb-1.5 text-xs tracking-[0.12em] text-[#D18C7C] uppercase"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Posted notice — understaffed shifts
            </p>
            <ul
              className="space-y-0.5 text-sm text-[#D9CFC0]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {data?.schedule && (
          <p
            className="mb-3 text-xs tracking-widest text-[#948B76] uppercase"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {data.schedule.status} · v{data.schedule.version}
          </p>
        )}

        {data?.schedule && employees.length > 0 && (
          <div className="overflow-x-auto rounded-sm border border-[#3A3122]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1E1912]">
                  <th
                    className="sticky left-0 z-10 bg-[#1E1912] px-4 py-3 text-left text-xs tracking-widest text-[#948B76] uppercase"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    Employee
                  </th>
                  {dates.map((date, i) => (
                    <th
                      key={date}
                      className="min-w-27.5 px-3 py-3 text-left text-xs tracking-widest text-[#948B76]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {formatDateLabel(date, i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-[#3A3122]">
                    <td
                      className="sticky left-0 z-10 bg-[#16130F] px-4 py-3 text-sm whitespace-nowrap text-[#F3ECDD]"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      {employee.firstName} {employee.lastName}
                      {!employee.active && (
                        <span className="ml-2 text-xs text-[#948B76]">
                          inactive
                        </span>
                      )}
                    </td>
                    {dates.map((date) => {
                      const assignment = assignmentByEmployeeAndDate.get(
                        `${employee.id}__${date}`,
                      );
                      const style =
                        assignment && assignment.shiftType !== "off"
                          ? SHIFT_STYLES[assignment.shiftType]
                          : null;

                      return (
                        <td key={date} className="px-3 py-3">
                          {style ? (
                            <span
                              className="inline-block border-l-2 py-0.5 pl-2 text-sm"
                              style={{
                                borderColor: style.accent,
                                color: style.text,
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}
                            >
                              {style.label}
                            </span>
                          ) : (
                            <span className="text-sm text-[#4A4436]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.schedule && employees.length === 0 && (
          <p
            className="text-sm text-[#948B76]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            No employees on this restaurant&apos;s roster yet.
          </p>
        )}

        {!data && !error && (
          <p
            className="text-sm text-[#5C5747]"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Enter a restaurant and week, then load or generate a schedule.
          </p>
        )}
      </div>
    </div>
  );
}
