// app/dashboard/manager/employees/_components/EmployeeForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  employee?: { id: string; name?: string | null; email: string };
};

export function EmployeeForm({ employee }: Props) {
  const router = useRouter();
  const isEdit = !!employee;

  const [name,    setName]    = useState(employee?.name ?? "");
  const [email,   setEmail]   = useState(employee?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    const url    = isEdit ? `/api/manager/employees/${employee.id}` : "/api/manager/employees";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (res.ok) {
      router.push("/dashboard/manager/employees");
      router.refresh();
    } else {
      const data = await res.json();
      setErr(data.error ?? "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {err && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="employee@company.com"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md
                     hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
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