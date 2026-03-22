// app/manager-dashboard/attendance/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceActions } from "./_components/AttendanceActions";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  const manager = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = await prisma.user.findMany({
    where: { managerId: manager!.id },
    select: {
      id: true, name: true, email: true,
      attendances: {
        where: { date: today },
        select: { id: true, clockIn: true, clockOut: true, status: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  // Recent attendance (last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const recentRecords = await prisma.attendance.findMany({
    where: {
      user: { managerId: manager!.id },
      date: { gte: sevenDaysAgo },
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Attendance</h1>

      {/* Today's Status */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Today — {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h2>

        {employees.length === 0 ? (
          <p className="text-sm text-gray-500">No employees to track.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Clock In</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Clock Out</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const att = emp.attendances[0] ?? null;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {emp.name ?? emp.email}
                      </td>
                      <td className="px-4 py-3">
                        {att ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium
                            ${att.clockOut
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-100 text-green-700"
                            }`}>
                            {att.clockOut ? "Clocked Out" : "Present"}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400">
                            Not Marked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {att?.clockIn
                          ? new Date(att.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {att?.clockOut
                          ? new Date(att.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AttendanceActions
                          employeeId={emp.id}
                          attendanceId={att?.id ?? null}
                          clockedIn={!!att && !att.clockOut}
                          clockedOut={!!att?.clockOut}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Records */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Records (Last 7 Days)</h2>
        {recentRecords.length === 0 ? (
          <p className="text-sm text-gray-500">No records yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {rec.user.name ?? rec.user.email}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${rec.status === "PRESENT"
                          ? "bg-green-100 text-green-700"
                          : rec.status === "ABSENT"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-700"
                        }`}>
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
