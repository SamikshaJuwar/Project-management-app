import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // ── Auth page redirect ───────────────────────────────────────────────
    const isAuthPage = pathname.startsWith("/login");
    if (isAuthPage) {
      if (token) {
        // Redirect based on role
        const role = token.role as string | undefined;
        if (role === "MANAGER") {
          return NextResponse.redirect(new URL("/manager-dashboard", req.url));
        }
        if (role === "SUPERADMIN") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        // EMPLOYEE — let them stay on login, no dashboard yet
        return null;
      }
      return null;
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ── Manager dashboard access control ─────────────────────────────────
    const isManagerDashboard = pathname.startsWith("/manager-dashboard");
    if (isManagerDashboard) {
      const role = token.role as string | undefined;
      if (role !== "MANAGER") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // ── Superadmin dashboard access control ──────────────────────────────
    const isSuperadminDashboard = pathname.startsWith("/dashboard");
    if (isSuperadminDashboard) {
      const role = token.role as string | undefined;
      if (role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // ── Manager API routes ───────────────────────────────────────────────
    const isManagerAPI = pathname.startsWith("/api/manager");
    if (isManagerAPI) {
      const role = token.role as string | undefined;
      if (role !== "MANAGER") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: () => true,
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/manager-dashboard/:path*", "/api/manager/:path*", "/login"],
};