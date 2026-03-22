// app/manager-dashboard/timesheets/_components/NewTimesheetForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string | null; email: string };
type TaskEntry = { date: string; hours: number; description: string };

/** Returns Monday and Sunday of the week containing `date` */
function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    weekStart: mon.toISOString().split("T")[0],
    weekEnd:   sun.toISOString().split("T")[0],
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function NewTimesheetForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();

  const defaultWeek = getWeekBounds(new Date());

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [weekStart,  setWeekStart]  = useState(defaultWeek.weekStart);
  const [weekEnd,    setWeekEnd]    = useState(defaultWeek.weekEnd);
  const [tasks, setTasks] = useState<TaskEntry[]>([
    { date: todayStr(), hours: 8, description: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const totalHours = tasks.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  function addTask() {
    setTasks((prev) => [...prev, { date: todayStr(), hours: 8, description: "" }]);
  }

  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTask(idx: number, field: keyof TaskEntry, value: string | number) {
    setTasks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  // Auto-compute week end when week start changes
  function handleWeekStartChange(val: string) {
    setWeekStart(val);
    const { weekEnd: we } = getWeekBounds(new Date(val));
    setWeekEnd(we);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!employeeId) {
      setErr("Please select an employee.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/manager/timesheets", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        weekStart,
        weekEnd,
        totalHours,
        tasks,
      }),
    });

    if (res.ok) {
      router.push("/manager-dashboard/timesheets");
      router.refresh();
    } else {
      const data = await res.json();
      setErr(
        typeof data.error === "string"
          ? data.error
          : "Failed to create timesheet."
      );
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}

      {/* Employee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
        {employees.length === 0 ? (
          <p className="text-sm text-gray-500">No employees found. Add employees first.</p>
        ) : (
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name ?? emp.email}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Week Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week Start (Monday)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => handleWeekStartChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                       focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week End (Sunday)</label>
          <input
            type="date"
            value={weekEnd}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
          />
        </div>
      </div>

      {/* Task Entries */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Daily Entries</label>
          <button
            type="button"
            onClick={addTask}
            className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            + Add Day
          </button>
        </div>

        <div className="space-y-2">
          {tasks.map((task, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[140px_80px_1fr_32px] gap-2 items-center
                         bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
            >
              <input
                type="date"
                value={task.date}
                onChange={(e) => updateTask(idx, "date", e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm
                           focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              <input
                type="number"
                value={task.hours}
                min={0}
                max={24}
                step={0.5}
                onChange={(e) => updateTask(idx, "hours", parseFloat(e.target.value) || 0)}
                className="px-2 py-1 border border-gray-300 rounded text-sm text-center
                           focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="hrs"
              />
              <input
                type="text"
                value={task.description}
                onChange={(e) => updateTask(idx, "description", e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm
                           focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="What was worked on…"
              />
              <button
                type="button"
                onClick={() => removeTask(idx)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none transition-colors"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{totalHours}h</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || employees.length === 0}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md
                     hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating…" : "Create Timesheet"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
