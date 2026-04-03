import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { id: string };
}

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attendeesNames, pointsDiscussed, description, conclusion, goalsSet } = body;

    if (!attendeesNames || !pointsDiscussed || !conclusion || !goalsSet) {
      return NextResponse.json(
        { error: "attendeesNames, pointsDiscussed, conclusion, and goalsSet are required" },
        { status: 400 }
      );
    }

    // Upsert MOM
    const mom = await prisma.mOM.upsert({
      where: { meetingId: params.id },
      create: {
        meetingId: params.id,
        attendeesNames,
        pointsDiscussed,
        description: description ?? null,
        conclusion,
        goalsSet,
      },
      update: {
        attendeesNames,
        pointsDiscussed,
        description: description ?? null,
        conclusion,
        goalsSet,
      },
    });

    // Mark meeting as completed when MOM is submitted
    await prisma.meeting.update({
      where: { id: params.id },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(mom, { status: 201 });
  } catch (error) {
    console.error("Create/Update MOM error:", error);
    return NextResponse.json({ error: "Failed to save MOM" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mom = await prisma.mOM.findUnique({ where: { meetingId: params.id } });
    if (!mom) return NextResponse.json({ error: "MOM not found" }, { status: 404 });

    return NextResponse.json(mom);
  } catch (error) {
    console.error("Get MOM error:", error);
    return NextResponse.json({ error: "Failed to get MOM" }, { status: 500 });
  }
}
