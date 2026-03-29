import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subproject = await prisma.subproject.findUnique({
            where: { id: params.id },
            include: {
                project: {
                    select: { name: true, startDate: true, endDate: true }
                },
                assignedUsers: {
                    select: { id: true, name: true, avatarUrl: true }
                },
                tasks: {
                    orderBy: { createdAt: "desc" }
                },
                column: true
            }
        });

        if (!subproject) {
            return NextResponse.json({ error: "Subproject not found" }, { status: 404 });
        }

        return NextResponse.json(serialize(subproject));
    } catch (error) {
        console.error("Fetch subproject error:", error);
        return NextResponse.json({ error: "Failed to fetch subproject" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();

        // Validate dates against project if dates are provided
        if (data.startDate || data.endDate) {
            const currentSubproject = await prisma.subproject.findUnique({
                where: { id: params.id },
                include: { project: true }
            });
            
            if (currentSubproject) {
                const project = currentSubproject.project;
                const startDate = data.startDate ? new Date(data.startDate) : currentSubproject.startDate;
                const endDate = data.endDate ? new Date(data.endDate) : currentSubproject.endDate;

                if (startDate && project.startDate && startDate < project.startDate) {
                    return NextResponse.json({ error: "Subproject start date is before project start date" }, { status: 400 });
                }
                if (endDate && project.endDate && endDate > project.endDate) {
                    return NextResponse.json({ error: "Subproject end date is after project end date" }, { status: 400 });
                }
            }
        }

        const subproject = await prisma.subproject.update({
            where: { id: params.id },
            data: {
                name: data.name,
                description: data.description,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                status: data.status,
                columnId: data.columnId,
                assignedUsers: data.assignedUserIds ? {
                    set: data.assignedUserIds.map((id: string) => ({ id }))
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
        console.error("Update subproject error:", error);
        return NextResponse.json({ error: error.message || "Failed to update subproject" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.subproject.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: "Subproject deleted" });
    } catch (error) {
        console.error("Delete subproject error:", error);
        return NextResponse.json({ error: "Failed to delete subproject" }, { status: 500 });
    }
}
