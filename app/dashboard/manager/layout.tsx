// app/dashboard/manager/layout.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const NAV_ITEMS = [
  { href: "/dashboard/manager",            label: "Overview",    icon: "⊞" },
  { href: "/dashboard/manager/employees",  label: "Employees",   icon: "👥" },
  { href: "/dashboard/manager/attendance", label: "Attendance",  icon: "🕐" },
  { href: "/dashboard/manager/timesheets", label: "Timesheets",  icon: "📋" },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, role: true },
  });

  if (!user || (user.role !== "MANAGER" && user.role !== "SUPERADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Manager</p>
          <p className="mt-1 text-sm font-medium text-gray-900 truncate">
            {user.name ?? session.user.email}
          </p>
        </div>

        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600
                         hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}