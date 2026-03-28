import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getOctokitForScope } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { githubToken: true, githubToken2: true },
        });
        if (!user?.githubToken && !user?.githubToken2) {
            return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
        }

        const t1 = user.githubToken ? decrypt(user.githubToken) : null;
        const t2 = user.githubToken2 ? decrypt(user.githubToken2) : null;
        const octokit = getOctokitForScope("repo", t1, t2);
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 50,
        });

        const repos = data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            url: repo.html_url,
            description: repo.description,
        }));

        return NextResponse.json(repos);
    } catch (error) {
        console.error("Fetch repos error:", error);
        return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description, isPrivate } = await req.json();
        if (!name) {
            return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { githubToken: true, githubToken2: true },
        });
        if (!user?.githubToken && !user?.githubToken2) {
            return NextResponse.json({ error: "No GitHub token found" }, { status: 400 });
        }

        const t1 = user.githubToken ? decrypt(user.githubToken) : null;
        const t2 = user.githubToken2 ? decrypt(user.githubToken2) : null;
        const octokit = getOctokitForScope("repo", t1, t2);
        const { data } = await octokit.rest.repos.createForAuthenticatedUser({
            name,
            description,
            private: isPrivate,
            auto_init: true,
        });

        return NextResponse.json({
            name: data.name,
            owner: data.owner.login,
            url: data.html_url,
        });
    } catch (error: any) {
        console.error("Create repo error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create repository" },
            { status: 500 }
        );
    }
}