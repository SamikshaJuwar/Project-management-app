import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getOctokit } from "@/lib/github";
import { decrypt } from "@/lib/encryption";
import { serialize } from "@/lib/utils";

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
        const { title, description, dueDate, state } = await req.json();

        // Check if milestone exists
        const existing = await prisma.milestone.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
        }

        const milestone = await prisma.milestone.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(state !== undefined && { state }),
            },
            include: {
                project: {
                    select: { name: true, repoOwner: true, repoName: true }
                },
                task: true
            }
        });

        // Sync with Task
        if (milestone.taskId) {
            await prisma.task.update({
                where: { id: milestone.taskId },
                data: {
                    title: title !== undefined ? title : undefined,
                    description: description !== undefined ? description : undefined,
                    dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
                    status: state !== undefined ? (state === "closed" ? "Done" : "To Do") : undefined,
                }
            });
        }

        // Sync with GitHub if applicable
        if (milestone.githubMilestoneNumber && milestone.project.repoOwner && milestone.project.repoName) {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { githubToken: true }
                });

                if (user?.githubToken) {
                    const decryptedToken = decrypt(user.githubToken);
                    if (!decryptedToken) throw new Error("Could not decrypt token");
                    const octokit = getOctokit(decryptedToken);
                    await octokit.rest.issues.updateMilestone({
                        owner: milestone.project.repoOwner,
                        repo: milestone.project.repoName,
                        milestone_number: milestone.githubMilestoneNumber,
                        title: title !== undefined ? title : milestone.title,
                        description: description !== undefined ? description : milestone.description || "",
                        due_on: dueDate !== undefined ? (dueDate ? new Date(dueDate).toISOString() : undefined) : (milestone.dueDate ? milestone.dueDate.toISOString() : undefined),
                        state: state !== undefined ? (state === "open" ? "open" : "closed") : (milestone.state === "open" ? "open" : "closed")
                    });
                }
            } catch (ghError: any) {
                console.error("GitHub Milestone update sync failed:", ghError.message);
                return NextResponse.json(serialize({
                    ...milestone,
                    githubWarning: "Milestone updated in DB but GitHub sync failed: " + (ghError.message || "Unknown error")
                }));
            }
        }

        return NextResponse.json(serialize(milestone));
    } catch (error: any) {
        console.error("Update milestone error:", error);
        return NextResponse.json({ error: error.message || "Failed to update milestone" }, { status: 500 });
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

        // Fetch milestone to check for linked task
        const existing = await prisma.milestone.findUnique({
            where: { id },
            select: { taskId: true }
        });

        // Optionally handle issues linked to this milestone
        await prisma.issue.updateMany({
            where: { milestoneId: id },
            data: { milestoneId: null }
        });

        if (existing?.taskId) {
            // Deleting the task will cascade delete the milestone
            await prisma.task.delete({
                where: { id: existing.taskId }
            });
        } else {
            // Delete milestone directly if no task linked
            await prisma.milestone.delete({
                where: { id }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete milestone error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete milestone" }, { status: 500 });
    }
}
