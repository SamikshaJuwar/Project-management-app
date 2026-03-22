import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions);
  const manager = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true, name: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalEmployees, todayAttendance, pendingTimesheets] = await Promise.all([
    prisma.user.count({ where: { managerId: manager!.id } }),
    prisma.attendance.count({
      where: {
        user: { managerId: manager!.id },
        date: today,
        status: "PRESENT",
      },
    }),
    prisma.timesheet.count({
      where: {
        user: { managerId: manager!.id },
        status: "SUBMITTED",
      },
    }),
  ]);

  const stats = [
    { label: "Total Employees",     value: totalEmployees,     href: "/manager-dashboard/employees",  color: "bg-blue-50 text-blue-700"  },
    { label: "Present Today",       value: todayAttendance,    href: "/manager-dashboard/attendance",  color: "bg-green-50 text-green-700" },
    { label: "Pending Timesheets",  value: pendingTimesheets,  href: "/manager-dashboard/timesheets",  color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-8">
        {today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="block rounded-lg border border-gray-200 bg-white p-5
                       hover:shadow-sm transition-shadow"
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold rounded px-1 inline-block ${s.color}`}>
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
        <div className="flex gap-3 flex-wrap">
          <Link href="/manager-dashboard/employees/new"
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
            + Add Employee
          </Link>
          <Link href="/manager-dashboard/attendance"
            className="text-sm px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Mark Attendance
          </Link>
          <Link href="/manager-dashboard/timesheets"
            className="text-sm px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Review Timesheets
          </Link>
        </div>
      </div>
    </div>
  );
}
