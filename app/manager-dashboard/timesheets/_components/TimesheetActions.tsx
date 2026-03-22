// app/manager-dashboard/timesheets/_components/TimesheetActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TimesheetActions({ id, status }: { id: string; status: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: "APPROVED" | "REJECTED") {
    setLoading(true);
    await fetch("/api/manager/timesheets", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, status: newStatus }),
    });
    router.refresh();
    setLoading(false);
  }

  if (status === "SUBMITTED") {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => updateStatus("APPROVED")}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-green-50 border border-green-200 text-green-700
                     rounded hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => updateStatus("REJECTED")}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 text-red-600
                     rounded hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>
    );
  }

  return <span className="text-xs text-gray-400">{status === "APPROVED" ? "✓ Approved" : "—"}</span>;
}
