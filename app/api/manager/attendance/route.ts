// app/api/manager/attendance/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, assertEmployeeOwnership } from "@/lib/manager-auth";
import { z } from "zod";

const ClockInSchema = z.object({
  employeeId: z.string(),
  notes:      z.string().optional(),
});

const ClockOutSchema = z.object({
  attendanceId: z.string(),
});

const QuerySchema = z.object({
  employeeId: z.string().optional(),
  from:       z.string().optional(), // ISO date
  to:         z.string().optional(), // ISO date
});

// GET /api/manager/attendance?employeeId=&from=&to=
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const query = QuerySchema.parse({
    employeeId: searchParams.get("employeeId") ?? undefined,
    from:       searchParams.get("from") ?? undefined,
    to:         searchParams.get("to") ?? undefined,
  });

  // Build filter — only show employees of this manager
  const employeeIds = query.employeeId
    ? [query.employeeId]
    : (await prisma.user.findMany({
        where: { managerId: user.id },
        select: { id: true },
      })).map((e) => e.id);

  const records = await prisma.attendance.findMany({
    where: {
      userId: { in: employeeIds },
      ...(query.from && { date: { gte: new Date(query.from) } }),
      ...(query.to   && { date: { lte: new Date(query.to)   } }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}

// POST /api/manager/attendance — clock in
export async function POST(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const body = await req.json();
  const parsed = ClockInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owns = await assertEmployeeOwnership(user.id, parsed.data.employeeId);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Prevent duplicate clock-in for today
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: parsed.data.employeeId, date: today } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already clocked in today" }, { status: 409 });
  }

  const record = await prisma.attendance.create({
    data: {
      userId:  parsed.data.employeeId,
      date:    today,
      clockIn: new Date(),
      status:  "PRESENT",
      notes:   parsed.data.notes,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

// PATCH /api/manager/attendance — clock out
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const body = await req.json();
  const parsed = ClockOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await prisma.attendance.findUnique({
    where: { id: parsed.data.attendanceId },
    include: { user: { select: { managerId: true } } },
  });

  if (!record || record.user.managerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.clockOut) {
    return NextResponse.json({ error: "Already clocked out" }, { status: 409 });
  }

  const updated = await prisma.attendance.update({
    where: { id: parsed.data.attendanceId },
    data:  { clockOut: new Date() },
  });

  return NextResponse.json(updated);
}