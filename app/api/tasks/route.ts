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
        const subprojectId = searchParams.get("subprojectId");

        const tasks = await prisma.task.findMany({
            where: subprojectId ? { subprojectId } : {},
            include: {
                assignee: {
                    select: { id: true, name: true, avatarUrl: true }
                },
                subproject: {
                    select: { name: true, projectId: true }
                },
                milestone: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(serialize(tasks));
    } catch (error: any) {
        console.error("Fetch milestones error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch milestones" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subprojectId, title, description, status, assigneeId, labels, dueDate } = await req.json();

        if (!subprojectId || !title) {
            return NextResponse.json({ error: "Subproject and title are required" }, { status: 400 });
        }

        // Normalize labels to array
        const labelsArr = Array.isArray(labels)
            ? labels
            : typeof labels === "string"
                ? labels.split(",").map((l: string) => l.trim()).filter(Boolean)
                : [];

        // Fetch subproject to get projectId
        const subproject = await prisma.subproject.findUnique({
            where: { id: subprojectId },
            select: { projectId: true }
        });

        if (!subproject) {
            return NextResponse.json({ error: "Subproject not found" }, { status: 404 });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                status: status || "To Do",
                subprojectId,
                assigneeId: (assigneeId && assigneeId !== "null") ? assigneeId : null,
                labels: labelsArr,
                dueDate: dueDate ? new Date(dueDate) : null,
                milestone: {
                    create: {
                        title,
                        description: description || "",
                        state: (status === "Done") ? "closed" : "open",
                        projectId: subproject.projectId,
                        subprojectId: subprojectId,
                        dueDate: dueDate ? new Date(dueDate) : null,
                    }
                }
            },
            include: {
                assignee: {
                    select: { id: true, name: true, avatarUrl: true }
                },
                milestone: true
            }
        });

        return NextResponse.json(serialize(task));
    } catch (error: any) {
        console.error("Create task error:", error);
        return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
    }
}
