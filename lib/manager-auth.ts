import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  role: "SUPERADMIN" | "MANAGER" | "EMPLOYEE";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true },
  });

  return user as SessionUser | null;
}

export async function requireManager(
  req: NextRequest
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (user.role !== "MANAGER" && user.role !== "SUPERADMIN") {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { user, error: null };
}

export async function assertEmployeeOwnership(
  managerId: string,
  employeeId: string
): Promise<boolean> {
  const emp = await prisma.user.findFirst({
    where: { id: employeeId, managerId },
    select: { id: true },
  });
  return !!emp;
}