// app/manager-dashboard/timesheets/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TimesheetActions } from "./_components/TimesheetActions";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-500",
  SUBMITTED: "bg-blue-50 text-blue-700",
  APPROVED:  "bg-green-50 text-green-700",
  REJECTED:  "bg-red-50 text-red-600",
};

export default async function TimesheetsPage() {
  const session = await getServerSession(authOptions);
  const manager = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const employees = await prisma.user.findMany({
    where: { managerId: manager!.id },
    select: { id: true },
  });
  const empIds = employees.map((e) => e.id);

  const timesheets = await prisma.timesheet.findMany({
    where: { userId: { in: empIds } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { weekStart: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Timesheets</h1>
        <Link
          href="/manager-dashboard/timesheets/new"
          className="text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          + New Timesheet
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Week</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Total Hours</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timesheets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No timesheets yet
                </td>
              </tr>
            ) : timesheets.map((ts) => (
              <tr key={ts.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {ts.user.name ?? ts.user.email}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(ts.weekStart).toLocaleDateString()} –{" "}
                  {new Date(ts.weekEnd).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-600">{ts.totalHours}h</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[ts.status] ?? ""}`}>
                    {ts.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <TimesheetActions id={ts.id} status={ts.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
