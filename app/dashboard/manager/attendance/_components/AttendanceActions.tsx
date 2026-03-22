// app/dashboard/manager/attendance/_components/AttendanceActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  employeeId:   string;
  attendanceId: string | null;
  clockedIn:    boolean;
  clockedOut:   boolean;
};

export function AttendanceActions({ employeeId, attendanceId, clockedIn, clockedOut }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function clockIn() {
    setLoading(true);
    await fetch("/api/manager/attendance", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ employeeId }),
    });
    router.refresh();
    setLoading(false);
  }

  async function clockOut() {
    if (!attendanceId) return;
    setLoading(true);
    await fetch("/api/manager/attendance", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ attendanceId }),
    });
    router.refresh();
    setLoading(false);
  }

  if (clockedOut) {
    return <span className="text-xs text-gray-400">Done</span>;
  }

  if (clockedIn) {
    return (
      <button
        onClick={clockOut}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 text-red-600
                   rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
      >
        {loading ? "…" : "Clock Out"}
      </button>
    );
  }

  return (
    <button
      onClick={clockIn}
      disabled={loading}
      className="text-xs px-3 py-1.5 bg-green-50 border border-green-200 text-green-700
                 rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : "Clock In"}
    </button>
  );
}