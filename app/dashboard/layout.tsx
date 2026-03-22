import { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      role: true,
      githubToken: true,
      githubLogin: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // Only SUPERADMIN can access this dashboard
  if (user.role !== "SUPERADMIN") {
    redirect("/login");
  }

  const isSuperadmin = user.role === "SUPERADMIN";
  const githubConnected = !!user.githubToken;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex flex-col lg:flex-row">
      <DashboardSidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }}
        isSuperadmin={isSuperadmin}
        githubConnected={githubConnected}
      />
      <main className="flex-1 lg:pl-60">
        <div className="w-full max-w-7xl mx-auto min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}