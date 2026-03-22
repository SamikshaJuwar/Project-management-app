import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                milestones: true,
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Also fetch issues for this project through milestones
        const issues = await prisma.issue.findMany({
            where: {
                milestone: {
                    projectId: id
                }
            }
        });

        return NextResponse.json({
            ...project,
            issues
        });
    } catch (error) {
        console.error("Fetch project error:", error);
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;
        const data = await req.json();

        // only allow updating specific fields
        const { name, description, status, repoOwner, repoName } = data;

        const project = await prisma.project.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
                ...(repoOwner && { repoOwner }),
                ...(repoName && { repoName }),
            }
        });

        return NextResponse.json(project);
    } catch (error: any) {
        console.error("Update project error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update project" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        // since project has milestones and milestones have issues, delete nested or simply cascade.
        // Prisma schema doesn't seem to have onDelete: Cascade for milestones/issues. 
        // We'll have to delete them manually if cascade isn't configured, but usually we just delete project and rely on cascade if configured.
        // Let's delete milestone issues first
        const milestones = await prisma.milestone.findMany({
            where: { projectId: id },
            select: { id: true }
        });
        const milestoneIds = milestones.map(m => m.id);

        await prisma.issue.deleteMany({
            where: { milestoneId: { in: milestoneIds } }
        });

        await prisma.milestone.deleteMany({
            where: { projectId: id }
        });

        await prisma.project.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete project error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete project" },
            { status: 500 }
        );
    }
}
