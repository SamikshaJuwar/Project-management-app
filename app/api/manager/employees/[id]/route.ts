// app/api/manager/employees/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, assertEmployeeOwnership } from "@/lib/manager-auth";
import { z } from "zod";

const UpdateSchema = z.object({
  name:  z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// GET /api/manager/employees/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireManager(req);
  if (error) return error;

  const owns = await assertEmployeeOwnership(user.id, id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      attendances: { orderBy: { date: "desc" }, take: 10 },
      timesheets:  { orderBy: { weekStart: "desc" }, take: 5 },
    },
  });

  return NextResponse.json(employee);
}

// PATCH /api/manager/employees/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireManager(req);
  if (error) return error;

  const owns = await assertEmployeeOwnership(user.id, id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}

// DELETE /api/manager/employees/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await requireManager(req);
  if (error) return error;

  const owns = await assertEmployeeOwnership(user.id, id);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}