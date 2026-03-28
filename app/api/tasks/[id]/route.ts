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

        const task = await prisma.task.findUnique({
            where: { id: params.id },
            include: {
                assignee: {
                    select: { id: true, name: true, avatarUrl: true }
                },
                subproject: {
                    select: { name: true, projectId: true }
                }
            }
        });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        return NextResponse.json(serialize(task));
    } catch (error) {
        console.error("Fetch task error:", error);
        return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();

        // Normalize labels to array if provided
        let labelsArr: string[] | undefined = undefined;
        if (data.labels !== undefined) {
            labelsArr = Array.isArray(data.labels)
                ? data.labels
                : typeof data.labels === "string"
                    ? data.labels.split(",").map((l: string) => l.trim()).filter(Boolean)
                    : [];
        }

        const task = await prisma.task.update({
            where: { id: params.id },
            data: {
                title: data.title,
                description: data.description,
                status: data.status,
                assigneeId: data.assigneeId === null ? null : ((data.assigneeId && data.assigneeId !== "null") ? data.assigneeId : undefined),
                labels: labelsArr,
                dueDate: data.dueDate ? new Date(data.dueDate) : (data.dueDate === null ? null : undefined)
            },
            include: {
                assignee: {
                    select: { id: true, name: true, avatarUrl: true }
                }
            }
        });

        return NextResponse.json(serialize(task));
    } catch (error: any) {
        console.error("Update task error:", error);
        return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.task.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ message: "Task deleted" });
    } catch (error) {
        console.error("Delete task error:", error);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
