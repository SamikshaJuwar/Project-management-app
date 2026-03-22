import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOctokit } from "@/lib/github";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { githubToken: true, githubLogin: true },
        });

        if (!user?.githubToken) {
            return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
        }

        const octokit = getOctokit(user.githubToken);

        // Get the authenticated user's login if not stored
        let login = user.githubLogin;
        if (!login) {
            const { data } = await octokit.rest.users.getAuthenticated();
            login = data.login;
        }

        // Fetch user's Projects V2 via GraphQL
        const result = await octokit.graphql<{
            user: {
                projectsV2: {
                    nodes: Array<{
                        id: string;
                        number: number;
                        title: string;
                        shortDescription: string | null;
                        url: string;
                        closed: boolean;
                        updatedAt: string;
                    }>;
                };
            };
        }>(`
            query($login: String!) {
                user(login: $login) {
                    projectsV2(first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
                        nodes {
                            id
                            number
                            title
                            shortDescription
                            url
                            closed
                            updatedAt
                        }
                    }
                }
            }
        `, { login });

        const projects = result.user.projectsV2.nodes;
        return NextResponse.json(projects);
    } catch (error: any) {
        console.error("Fetch GitHub projects error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch GitHub projects" },
            { status: 500 }
        );
    }
}
