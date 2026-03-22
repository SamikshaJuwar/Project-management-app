import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getOctokit } from "@/lib/github";
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
        const data = await req.json();

        // only allow specific fields
        const { title, body, state, labels, assigneeId, milestoneId } = data;

        const issue = await prisma.issue.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(body !== undefined && { body }),
                ...(state !== undefined && { state }),
                ...(labels !== undefined && { labels }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
                ...(milestoneId !== undefined && { milestoneId: milestoneId || null }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, githubLogin: true, avatarUrl: true }
                },
                milestone: {
                    include: { project: true }
                }
            }
        });

        // Sync with GitHub if applicable
        if (issue.githubIssueNumber && issue.milestone?.project?.repoOwner && issue.milestone?.project?.repoName) {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { githubToken: true }
                });

                if (user?.githubToken) {
                    const octokit = getOctokit(user.githubToken);
                    await octokit.rest.issues.update({
                        owner: issue.milestone.project.repoOwner,
                        repo: issue.milestone.project.repoName,
                        issue_number: issue.githubIssueNumber,
                        title: title !== undefined ? title : issue.title,
                        body: body !== undefined ? body : issue.body || "",
                        state: state !== undefined ? (state === "open" ? "open" : "closed") : (issue.state === "open" ? "open" : "closed"),
                        labels: labels !== undefined ? labels : issue.labels,
                        milestone: milestoneId !== undefined ? (issue.milestone?.githubMilestoneNumber || undefined) : (issue.milestone?.githubMilestoneNumber || undefined),
                        assignees: assigneeId !== undefined ? (issue.assignee?.githubLogin ? [issue.assignee.githubLogin] : []) : (issue.assignee?.githubLogin ? [issue.assignee.githubLogin] : [])
                    });
                }
            } catch (ghError: any) {
                console.error("GitHub Issue update sync failed:", ghError.message);
                // Return with warning
                return NextResponse.json(serialize({
                    ...issue,
                    githubWarning: "Issue updated in DB but GitHub sync failed: " + (ghError.message || "Unknown error")
                }));
            }
        }

        return NextResponse.json(serialize(issue));
    } catch (error: any) {
        console.error("Update issue error:", error);
        return NextResponse.json({ error: error.message || "Failed to update issue" }, { status: 500 });
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

        await prisma.issue.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete issue error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete issue" }, { status: 500 });
    }
}
