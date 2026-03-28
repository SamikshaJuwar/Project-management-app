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
        const projectId = searchParams.get("projectId");

        const milestones = await prisma.milestone.findMany({
            where: projectId ? { projectId } : {},
            include: {
                project: {
                    select: { name: true, repoOwner: true, repoName: true }
                },
                _count: {
                    select: { issues: true }
                },
                issues: {
                    select: { state: true }
                }
            },
            orderBy: { dueDate: "asc" }
        });

        // Format to include open/closed issue counts
        const formatted = milestones.map(m => {
            const openIssues = m.issues.filter(i => i.state === "open").length;
            const closedIssues = m.issues.filter(i => i.state === "closed").length;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { issues, ...rest } = m;
            return {
                ...rest,
                openIssues,
                closedIssues
            };
        });

        return NextResponse.json(serialize(formatted));
    } catch (error) {
        console.error("Fetch milestones error:", error);
        return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId, title, description, dueDate } = await req.json();

        if (!projectId || !title) {
            return NextResponse.json({ error: "Project and title are required" }, { status: 400 });
        }

        // 1. Create in DB
        const milestone = await prisma.milestone.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId,
            },
            include: {
                project: {
                    select: { name: true, repoOwner: true, repoName: true }
                }
            }
        });

        // 2. Try to create on GitHub
        if (milestone.project.repoOwner && milestone.project.repoName) {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { githubToken: true }
                });

                if (user?.githubToken) {
                    const decryptedToken = decrypt(user.githubToken);
                    if (!decryptedToken) throw new Error("Could not decrypt token");
                    const octokit = getOctokit(decryptedToken);

                    const ghMilestone = await octokit.rest.issues.createMilestone({
                        owner: milestone.project.repoOwner,
                        repo: milestone.project.repoName,
                        title,
                        description: description || "",
                        due_on: dueDate ? new Date(dueDate).toISOString() : undefined,
                        state: "open"
                    });

                    // Save back to DB
                    const updatedMilestone = await prisma.milestone.update({
                        where: { id: milestone.id },
                        data: {
                            githubMilestoneId: ghMilestone.data.id,
                            githubMilestoneNumber: ghMilestone.data.number,
                        },
                        include: {
                            project: {
                                select: { name: true, repoOwner: true, repoName: true }
                            }
                        }
                    });

                    return NextResponse.json(serialize({
                        ...updatedMilestone,
                        githubMilestoneUrl: ghMilestone.data.html_url
                    }));
                }
            } catch (ghError: any) {
                console.error("GitHub Milestone creation failed:", ghError.message);
                // Return milestone but with warning
                return NextResponse.json(serialize({
                    ...milestone,
                    githubWarning: "Milestone saved in DB but GitHub creation failed: " + (ghError.message || "Unknown error")
                }));
            }
        }

        return NextResponse.json(serialize(milestone));
    } catch (error: any) {
        console.error("Create milestone error:", error);
        return NextResponse.json({ error: error.message || "Failed to create milestone" }, { status: 500 });
    }
}
