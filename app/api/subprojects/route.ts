import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        const subprojects = await prisma.subproject.findMany({
            where: projectId ? { projectId } : {},
            include: {
                project: {
                    select: { name: true }
                },
                assignedUsers: {
                    select: { id: true, name: true, avatarUrl: true }
                },
                _count: {
                    select: { tasks: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(serialize(subprojects));
    } catch (error) {
        console.error("Fetch subprojects error:", error);
        return NextResponse.json({ error: "Failed to fetch subprojects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId, name, description, startDate, endDate, status, assignedUserIds } = await req.json();

        if (!projectId || !name) {
            return NextResponse.json({ error: "Project and name are required" }, { status: 400 });
        }

        // Validate dates against project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { startDate: true, endDate: true }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (startDate && project.startDate && new Date(startDate) < new Date(project.startDate)) {
            return NextResponse.json({ error: "Subproject start date is before project start date" }, { status: 400 });
        }

        if (endDate && project.endDate && new Date(endDate) > new Date(project.endDate)) {
            return NextResponse.json({ error: "Subproject end date is after project end date" }, { status: 400 });
        }

        const subproject = await prisma.subproject.create({
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                status: status || "Planned",
                projectId,
                assignedUsers: assignedUserIds ? {
                    connect: assignedUserIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                assignedUsers: {
                    select: { id: true, name: true, avatarUrl: true }
                }
            }
        });

        return NextResponse.json(serialize(subproject));
    } catch (error: any) {
        console.error("Create subproject error:", error);
        return NextResponse.json({ error: error.message || "Failed to create subproject" }, { status: 500 });
    }
}
