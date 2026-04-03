import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
        mom: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json({ error: "Failed to get meeting" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      agenda,
      meetingType,
      projectId,
      points,
      attendeeIds,
      externalAttendees,
      meetingLink,
      dateTime,
      sendEmail,
      calendarSync,
      status,
    } = body;

    const meeting = await prisma.meeting.update({
      where: { id: params.id },
      data: {
        ...(agenda !== undefined && { agenda }),
        ...(meetingType !== undefined && { meetingType }),
        ...(projectId !== undefined && { projectId }),
        ...(points !== undefined && { points }),
        ...(attendeeIds !== undefined && { attendeeIds }),
        ...(externalAttendees !== undefined && { externalAttendees }),
        ...(meetingLink !== undefined && { meetingLink }),
        ...(dateTime !== undefined && { dateTime: new Date(dateTime) }),
        ...(sendEmail !== undefined && { sendEmail }),
        ...(calendarSync !== undefined && { calendarSync }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: { select: { id: true, name: true } },
        mom: true,
      },
    });

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Update meeting error:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.meeting.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
