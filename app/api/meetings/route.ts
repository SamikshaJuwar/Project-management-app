import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meetings = await prisma.meeting.findMany({
      orderBy: { dateTime: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        mom: true,
      },
    });

    // Enrich with user names for internal attendees
    const allUserIds = [...new Set(meetings.flatMap((m) => m.attendeeIds))];
    const users =
      allUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: allUserIds } },
            select: { id: true, name: true, email: true, avatarUrl: true },
          })
        : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = meetings.map((m) => ({
      ...m,
      attendees: m.attendeeIds.map((id) => userMap[id] ?? { id, name: id, email: "" }),
      externalAttendees: m.externalAttendees,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Fetch meetings error:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
    } = body;

    if (!agenda || !meetingType || !dateTime) {
      return NextResponse.json(
        { error: "agenda, meetingType, and dateTime are required" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        agenda,
        meetingType,
        projectId: meetingType === "project" && projectId ? projectId : null,
        points: points ?? null,
        attendeeIds: attendeeIds ?? [],
        externalAttendees: externalAttendees ?? [],
        meetingLink: meetingLink ?? null,
        dateTime: new Date(dateTime),
        sendEmail: sendEmail ?? false,
        calendarSync: calendarSync ?? false,
        status: "SCHEDULED",
      },
      include: {
        project: { select: { id: true, name: true } },
        mom: true,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
