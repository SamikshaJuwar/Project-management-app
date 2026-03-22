import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOctokit } from "@/lib/github";

import { serialize } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const projects = await prisma.project.findMany({
            include: {
                _count: {
                    select: { milestones: true }
                },
                milestones: {
                    include: {
                        _count: { select: { issues: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const formattedProjects = projects.map(project => {
            const issueCount = project.milestones.reduce((acc, ms) => acc + ms._count.issues, 0);
            return {
                id: project.id,
                name: project.name,
                description: project.description,
                repoOwner: project.repoOwner,
                repoName: project.repoName,
                githubProjectId: project.githubProjectId,
                githubProjectNumber: project.githubProjectNumber,
                status: project.status,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                milestoneCount: project._count.milestones,
                issueCount
            };
        });

        return NextResponse.json(serialize(formattedProjects));
    } catch (error) {
        console.error("Fetch projects error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, repoOwner, repoName, githubProjectId, githubProjectNumber } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // 1. Create project in DB first
        const project = await prisma.project.create({
            data: {
                name,
                status: "active",
                ...(description ? { description } : {}),
                ...(repoOwner ? { repoOwner } : {}),
                ...(repoName ? { repoName } : {}),
                ...(githubProjectId ? { githubProjectId } : {}),
                ...(githubProjectNumber ? { githubProjectNumber } : {}),
            }
        });

        // 2. If a repo owner is specified, also create a GitHub Projects V2 board
        if (repoOwner) {
            try {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                    select: { githubToken: true },
                });

                if (user?.githubToken) {
                    const octokit = getOctokit(user.githubToken);

                    // Get the owner's node ID (could be user or org)
                    let ownerId: string;
                    try {
                        // Try as org first
                        const orgQuery = await octokit.graphql<{ organization: { id: string } }>(`
                            query($login: String!) {
                                organization(login: $login) { id }
                            }
                        `, { login: repoOwner });
                        ownerId = orgQuery.organization.id;
                    } catch {
                        // Fall back to user
                        const userQuery = await octokit.graphql<{ user: { id: string } }>(`
                            query($login: String!) {
                                user(login: $login) { id }
                            }
                        `, { login: repoOwner });
                        ownerId = userQuery.user.id;
                    }

                    // Create the GitHub Project V2
                    const createResult = await octokit.graphql<{
                        createProjectV2: {
                            projectV2: { id: string; number: number; url: string }
                        }
                    }>(`
                        mutation($ownerId: ID!, $title: String!) {
                            createProjectV2(input: { ownerId: $ownerId, title: $title }) {
                                projectV2 { id number url }
                            }
                        }
                    `, { ownerId, title: name });

                    const ghProject = createResult.createProjectV2.projectV2;

                    // Update DB with GitHub project info
                    await prisma.project.update({
                        where: { id: project.id },
                        data: {
                            githubProjectId: ghProject.id,
                            githubProjectNumber: ghProject.number,
                        }
                    });

                    return NextResponse.json(serialize({
                        ...project,
                        githubProjectId: ghProject.id,
                        githubProjectNumber: ghProject.number,
                        githubProjectUrl: ghProject.url,
                    }));
                }
            } catch (ghError: any) {
                console.error("GitHub Project creation failed (project still saved in DB):", ghError?.message);
                // Don't fail the whole request — project is already in DB
                return NextResponse.json(serialize({
                    ...project,
                    githubWarning: "Project saved in DB but GitHub Project creation failed: " + (ghError?.message ?? "unknown error"),
                }));
            }
        }

        return NextResponse.json(serialize(project));
    } catch (error: any) {
        console.error("Create project error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create project" },
            { status: 500 }
        );
    }
}
