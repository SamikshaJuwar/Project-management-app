// app/api/manager/employees/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/manager-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const CreateEmployeeSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6).optional(),
});

// GET /api/manager/employees — list all employees under this manager
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const employees = await prisma.user.findMany({
    where: { managerId: user.id },
    select: {
      id: true, name: true, email: true, role: true,
      createdAt: true,
      _count: { select: { attendances: true, timesheets: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(employees);
}

// POST /api/manager/employees — create a new employee
export async function POST(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const body = await req.json();
  const parsed = CreateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password: userPassword } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Generate password if not provided
  const tempPassword = userPassword || Math.random().toString(36).slice(-12);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const employee = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "EMPLOYEE",
      managerId: user.id,
      isActive: true,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const response: any = { ...employee };
  // Only include temp password if we generated one (not user-provided)
  if (!userPassword) {
    response._tempPassword = tempPassword;
  }

  return NextResponse.json(response, { status: 201 });
}