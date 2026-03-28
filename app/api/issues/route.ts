import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOctokit } from "@/lib/github";
import { decrypt } from "@/lib/encryption";

import { serialize } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const milestoneId = searchParams.get("milestoneId");
        const projectId = searchParams.get("projectId");
        const state = searchParams.get("state"); // open, closed, all

        const where: any = {};
        if (milestoneId && milestoneId !== "all") {
            where.milestoneId = milestoneId;
        } else if (projectId && projectId !== "all") {
            where.milestone = { projectId: projectId };
        }

        if (state && state !== "all") {
            where.state = state;
        }

        const issues = await prisma.issue.findMany({
            where,
            include: {
                assignee: {
                    select: { id: true, name: true, githubLogin: true, avatarUrl: true }
                },
                project: {
                    select: { id: true, name: true }
                },
                milestone: {
                    select: { id: true, title: true, projectId: true, githubMilestoneNumber: true, project: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(serialize(issues));
    } catch (error) {
        console.error("Fetch issues error:", error);
        return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId, milestoneId, title, body, labels, assigneeId, startDate, endDate, state } = await req.json();

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const validAssigneeId = assigneeId && assigneeId !== "unassigned" ? assigneeId : null;

        // 1. Create in DB
        const issue = await prisma.issue.create({
            data: {
                title,
                body: body || "",
                labels: Array.isArray(labels) ? labels : [],
                state: state || "open",
                projectId: projectId || null,
                milestoneId: milestoneId || null,
                assigneeId: validAssigneeId,
                ...(startDate ? { startDate: new Date(startDate) } : {}),
                ...(endDate ? { endDate: new Date(endDate) } : {}),
            },
            include: {
                assignee: true,
                project: true,
                milestone: {
                    include: { project: true }
                }
            }
        });

        // 2. Try to sync with GitHub if project and milestone allow
        if (issue.milestone?.project?.repoOwner && issue.milestone?.project?.repoName) {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { githubToken: true }
                });

                if (user?.githubToken) {
                    const decryptedToken = decrypt(user.githubToken);
                    if (!decryptedToken) throw new Error("Could not decrypt token");
                    const octokit = getOctokit(decryptedToken);

                    const assignees = issue.assignee?.githubLogin ? [issue.assignee.githubLogin] : [];

                    const ghIssue = await octokit.rest.issues.create({
                        owner: issue.milestone.project.repoOwner,
                        repo: issue.milestone.project.repoName,
                        title: issue.title,
                        body: issue.body || "",
                        milestone: issue.milestone.githubMilestoneNumber || undefined,
                        labels: issue.labels,
                        assignees: assignees
                    });

                    // Update DB with GitHub issue info
                    const updatedIssue = await prisma.issue.update({
                        where: { id: issue.id },
                        data: {
                            githubIssueId: ghIssue.data.id,
                            githubIssueNumber: ghIssue.data.number,
                        },
                        include: {
                            assignee: true,
                            project: true,
                            milestone: {
                                include: { project: true }
                            }
                        }
                    });

                    return NextResponse.json(serialize({
                        ...updatedIssue,
                        githubIssueUrl: ghIssue.data.html_url
                    }));
                }
            } catch (ghError: any) {
                console.error("GitHub Issue creation failed:", ghError.message);
                return NextResponse.json(serialize({
                    ...issue,
                    githubWarning: "Issue saved in DB but GitHub creation failed: " + (ghError.message || "Unknown error")
                }));
            }
        }

        return NextResponse.json(serialize(issue));
    } catch (error: any) {
        console.error("Create issue error:", error);
        return NextResponse.json({ error: error.message || "Failed to create issue" }, { status: 500 });
    }
}
