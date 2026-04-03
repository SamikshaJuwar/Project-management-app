import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/utils";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projectId = params.id;

        const columns = await (prisma as any).subprojectColumn.findMany({
            where: { projectId },
            orderBy: { order: "asc" },
            include: {
                subprojects: {
                    include: {
                        assignedUsers: {
                            select: { id: true, name: true, avatarUrl: true }
                        },
                        _count: {
                            select: { tasks: true }
                        }
                    }
                }
            }
        });

        // If no columns exist for this project, create default ones
        if (columns.length === 0) {
            const defaultColumns = [
                { name: "To Do", order: 0, color: "bg-slate-50 border-slate-200", accent: "bg-slate-400" },
                { name: "In Progress", order: 1, color: "bg-indigo-50 border-indigo-200", accent: "bg-indigo-500" },
                { name: "Done", order: 2, color: "bg-emerald-50 border-emerald-200", accent: "bg-emerald-500" },
            ];

            const createdColumns = await Promise.all(
                defaultColumns.map((col: any) => 
                    (prisma as any).subprojectColumn.create({
                        data: { ...col, projectId }
                    })
                )
            );

            // AUTO-MIGRATION: Link existing subprojects to default columns based on status name
            await Promise.all(
                createdColumns.map((col: any) =>
                    (prisma as any).subproject.updateMany({
                        where: { 
                            projectId,
                            columnId: null,
                            status: col.name 
                        },
                        data: { columnId: col.id }
                    })
                )
            );

            // Re-fetch to get populated subprojects
            const populated = await (prisma as any).subprojectColumn.findMany({
                where: { projectId },
                orderBy: { order: "asc" },
                include: {
                    subprojects: {
                        include: {
                            assignedUsers: {
                                select: { id: true, name: true, avatarUrl: true }
                            },
                            _count: {
                                select: { tasks: true }
                            }
                        }
                    }
                }
            });

            return NextResponse.json(serialize(populated));
        }

        return NextResponse.json(serialize(columns));
    } catch (error: any) {
        console.error("Fetch columns error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch columns" }, { status: 500 });
    }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projectId = params.id;
        const { name, description, color, accent, order } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const column = await (prisma as any).subprojectColumn.create({
            data: {
                name,
                description,
                color: color || "bg-slate-50 border-slate-200",
                accent: accent || "bg-slate-400",
                order: order ?? 0,
                projectId
            }
        });

        return NextResponse.json(serialize(column));
    } catch (error: any) {
        console.error("Create column error:", error);
        return NextResponse.json({ error: error.message || "Failed to create column" }, { status: 500 });
    }
}
