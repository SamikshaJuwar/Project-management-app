// app/dashboard/manager/employees/_components/DeleteEmployeeButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    setLoading(true);
    await fetch(`/api/manager/employees/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs px-3 py-1.5 border border-red-200 text-red-600
                 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : "Remove"}
    </button>
  );
}