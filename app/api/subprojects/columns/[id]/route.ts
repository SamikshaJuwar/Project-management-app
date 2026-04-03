import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const column = await prisma.subprojectColumn.update({
            where: { id: params.id },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                accent: data.accent,
                order: data.order,
                isVisible: data.isVisible
            }
        });

        return NextResponse.json(serialize(column));
    } catch (error: any) {
        console.error("Update column error:", error);
        return NextResponse.json({ error: error.message || "Failed to update column" }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Before deleting, find the column to know its projectId
        const columnToDelete = await prisma.subprojectColumn.findUnique({
            where: { id: params.id },
            include: { subprojects: true }
        });

        if (!columnToDelete) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        // Move subprojects from the column to another or backlog if any exist
        if (columnToDelete.subprojects.length > 0) {
            // Find another column in the same project
            const anotherColumn = await prisma.subprojectColumn.findFirst({
                where: { 
                    projectId: columnToDelete.projectId,
                    NOT: { id: params.id }
                }
            });

            if (anotherColumn) {
                await prisma.subproject.updateMany({
                    where: { columnId: params.id },
                    data: { columnId: anotherColumn.id }
                });
            } else {
                // If no other column exists, we can't delete unless we want to leave subprojects unassigned
                // Or we can prevent deletion if subprojects are present and no fallback column exists.
                // Let's just nullify the columnId.
                await prisma.subproject.updateMany({
                    where: { columnId: params.id },
                    data: { columnId: null }
                });
            }
        }

        await prisma.subprojectColumn.delete({
            where: { id: params.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete column error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete column" }, { status: 500 });
    }
}
