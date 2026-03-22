// app/manager-dashboard/timesheets/new/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTimesheetForm } from "../_components/NewTimesheetForm";

export default async function NewTimesheetPage() {
  const session = await getServerSession(authOptions);
  const manager = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const employees = await prisma.user.findMany({
    where: { managerId: manager!.id },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New Timesheet</h1>
      <NewTimesheetForm employees={employees} />
    </div>
  );
}
