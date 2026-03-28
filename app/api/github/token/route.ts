import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { validateToken } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token1, token2 } = await req.json();

        if (!token1 && !token2) {
            return NextResponse.json(
                { error: "At least one token is required" },
                { status: 400 }
            );
        }

        const updateData: Record<string, string | null> = {};

        // Validate and stage Token 1
        if (token1) {
            const result = await validateToken(token1);
            if (!result.valid || !result.login) {
                return NextResponse.json(
                    { error: "Token 1 is invalid" },
                    { status: 400 }
                );
            }
            updateData.githubToken = encrypt(token1);
            updateData.githubLogin = result.login;
            // Only set avatarUrl from token1 (primary identity)
            updateData.avatarUrl = result.avatarUrl ?? null;
        }

        // Validate and stage Token 2
        if (token2) {
            const result = await validateToken(token2);
            if (!result.valid || !result.login) {
                return NextResponse.json(
                    { error: "Token 2 is invalid" },
                    { status: 400 }
                );
            }
            updateData.githubToken2 = encrypt(token2);
            updateData.githubLogin2 = result.login;
        }

        const user = await prisma.user.update({
            where: { email: session.user.email },
            data: updateData,
            select: {
                githubLogin: true,
                githubLogin2: true,
                avatarUrl: true,
            },
        });

        return NextResponse.json({
            login: user.githubLogin,
            login2: user.githubLogin2,
            avatarUrl: user.avatarUrl,
        });
    } catch (error) {
        console.error("Token save error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Optional: ?token=1 or ?token=2 to disconnect individually; omit to clear both
        const { searchParams } = new URL(req.url);
        const which = searchParams.get("token"); // "1" | "2" | null

        const clearData: Record<string, null> = {};

        if (!which || which === "1") {
            clearData.githubToken = null;
            clearData.githubLogin = null;
        }
        if (!which || which === "2") {
            clearData.githubToken2 = null;
            clearData.githubLogin2 = null;
        }
        // Clear avatarUrl only when both are disconnected
        if (!which) {
            clearData.avatarUrl = null;
        }

        await prisma.user.update({
            where: { email: session.user.email },
            data: clearData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Token delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}