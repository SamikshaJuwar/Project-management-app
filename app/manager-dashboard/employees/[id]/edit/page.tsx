// app/manager-dashboard/employees/[id]/edit/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EmployeeForm } from "../../_components/EmployeeForm";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session  = await getServerSession(authOptions);
  const manager  = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const employee = await prisma.user.findFirst({
    where: { id, managerId: manager!.id },
    select: { id: true, name: true, email: true },
  });

  if (!employee) notFound();

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit Employee</h1>
      <EmployeeForm employee={employee} />
    </div>
  );
}
