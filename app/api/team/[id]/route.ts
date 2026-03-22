import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;
        const data = await req.json();

        // only allow specific fields
        const { name, email, role, githubToken, githubLogin, isActive, password } = data;

        let hashedPassword;
        if (password) {
            const bcrypt = (await import("bcryptjs")).default;
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(role !== undefined && { role }),
                ...(githubToken !== undefined && { githubToken }),
                ...(githubLogin !== undefined && { githubLogin }),
                ...(isActive !== undefined && { isActive }),
                ...(hashedPassword && { password: hashedPassword }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                githubLogin: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
            }
        });

        return NextResponse.json(user);
    } catch (error: any) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || (session.user as any).role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Prevent acting on self
        if ((session.user as any).id === id) {
            return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const permanent = searchParams.get("permanent") === "true";

        if (permanent) {
            // Hard delete — permanently removes user from database
            await prisma.user.delete({
                where: { id },
            });
            return NextResponse.json({ success: true, deleted: true });
        } else {
            // Soft delete — deactivates the user
            await prisma.user.update({
                where: { id },
                data: { isActive: false },
            });
            return NextResponse.json({ success: true, deleted: false });
        }
    } catch (error: any) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
    }
}