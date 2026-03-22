// app/api/manager/timesheets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, assertEmployeeOwnership } from "@/lib/manager-auth";
import { z } from "zod";

const TaskEntrySchema = z.object({
  date:        z.string(),
  hours:       z.number().min(0).max(24),
  description: z.string().optional(),
});

const CreateTimesheetSchema = z.object({
  employeeId: z.string(),
  weekStart:  z.string(), // ISO date (Monday)
  weekEnd:    z.string(), // ISO date (Sunday)
  tasks:      z.array(TaskEntrySchema).optional(),
  totalHours: z.number().min(0),
});

const UpdateTimesheetSchema = z.object({
  id:         z.string(),
  status:     z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
  tasks:      z.array(TaskEntrySchema).optional(),
  totalHours: z.number().min(0).optional(),
});

// GET /api/manager/timesheets?employeeId=&status=
export async function GET(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const status     = searchParams.get("status") ?? undefined;

  const employeeIds = employeeId
    ? [employeeId]
    : (await prisma.user.findMany({
        where: { managerId: user.id },
        select: { id: true },
      })).map((e) => e.id);

  const timesheets = await prisma.timesheet.findMany({
    where: {
      userId: { in: employeeIds },
      ...(status && { status: status as any }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { weekStart: "desc" },
  });

  return NextResponse.json(timesheets);
}

// POST /api/manager/timesheets — create timesheet
export async function POST(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const body = await req.json();
  const parsed = CreateTimesheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owns = await assertEmployeeOwnership(user.id, parsed.data.employeeId);
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const weekStart = new Date(parsed.data.weekStart);
  const weekEnd   = new Date(parsed.data.weekEnd);

  const existing = await prisma.timesheet.findUnique({
    where: { userId_weekStart: { userId: parsed.data.employeeId, weekStart } },
  });
  if (existing) {
    return NextResponse.json({ error: "Timesheet already exists for this week" }, { status: 409 });
  }

  const timesheet = await prisma.timesheet.create({
    data: {
      userId:     parsed.data.employeeId,
      weekStart,
      weekEnd,
      totalHours: parsed.data.totalHours,
      tasks:      parsed.data.tasks ? JSON.stringify(parsed.data.tasks) : null,
    },
  });

  return NextResponse.json(timesheet, { status: 201 });
}

// PATCH /api/manager/timesheets — update (approve/reject/edit)
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireManager(req);
  if (error) return error;

  const body = await req.json();
  const parsed = UpdateTimesheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timesheet = await prisma.timesheet.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { managerId: true } } },
  });

  if (!timesheet || timesheet.user.managerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.approvedBy = user.id;
    }
  }
  if (parsed.data.tasks !== undefined) {
    updateData.tasks = JSON.stringify(parsed.data.tasks);
  }
  if (parsed.data.totalHours !== undefined) {
    updateData.totalHours = parsed.data.totalHours;
  }

  const updated = await prisma.timesheet.update({
    where: { id: parsed.data.id },
    data:  updateData,
  });

  return NextResponse.json(updated);
}