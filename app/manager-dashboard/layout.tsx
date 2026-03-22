import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";

const NAV_ITEMS = [
  { href: "/manager-dashboard",            label: "Overview",    icon: "⊞" },
  { href: "/manager-dashboard/employees",  label: "Employees",   icon: "👥" },
  { href: "/manager-dashboard/attendance", label: "Attendance",  icon: "🕐" },
  { href: "/manager-dashboard/timesheets", label: "Timesheets",  icon: "📋" },
];

export default async function ManagerDashboardLayout({
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

  if (!user || user.role !== "MANAGER") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Manager Dashboard</p>
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
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
