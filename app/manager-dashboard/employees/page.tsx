// app/manager-dashboard/employees/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteEmployeeButton } from "./_components/DeleteEmployeeButton";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  const manager = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const employees = await prisma.user.findMany({
    where: { managerId: manager!.id },
    select: {
      id: true, name: true, email: true, createdAt: true,
      _count: { select: { attendances: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        <Link
          href="/manager-dashboard/employees/new"
          className="text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          + Add Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <p className="text-sm text-gray-500">No employees yet. Add one to get started.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Attendance Records</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {emp.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3 text-gray-600">{emp._count.attendances}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(emp.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/manager-dashboard/employees/${emp.id}/edit`}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </Link>
                      <DeleteEmployeeButton id={emp.id} name={emp.name ?? emp.email} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
