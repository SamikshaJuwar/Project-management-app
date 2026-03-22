// lib/auth-patch.ts
//
// DO NOT replace your existing authOptions.
// Merge the callbacks below into your existing authOptions in lib/auth.ts.
//
// These callbacks inject `role` and `id` into the JWT token and session so
// the middleware and server components can read them without extra DB calls.

import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

// ── Merge these callbacks into your existing authOptions ─────────────────────
//
// callbacks: {
//   ...yourExistingCallbacks,
//
//   async jwt({ token, user }) {
//     // On first sign-in, `user` is populated
//     if (user) {
//       token.id   = user.id;
//       token.role = (user as any).role ?? "EMPLOYEE";
//     }
//     // On subsequent requests, re-fetch role in case it changed
//     if (token.email && !token.role) {
//       const dbUser = await prisma.user.findUnique({
//         where:  { email: token.email },
//         select: { id: true, role: true },
//       });
//       if (dbUser) {
//         token.id   = dbUser.id;
//         token.role = dbUser.role;
//       }
//     }
//     return token;
//   },
//
//   async session({ session, token }) {
//     if (session.user) {
//       session.user.id   = token.id   as string;
//       session.user.role = token.role as any;
//     }
//     return session;
//   },
// }
//
// ────────────────────────────────────────────────────────────────────────────
//
// Also ensure your provider fetches `role` from the DB.
// Example for CredentialsProvider authorize():
//
//   const user = await prisma.user.findUnique({
//     where:  { email: credentials.email },
//     select: { id: true, email: true, name: true, role: true, password: true },
//   });
//   if (!user || !verifyPassword(credentials.password, user.password)) return null;
//   return { id: user.id, email: user.email, name: user.name, role: user.role };
//
// ────────────────────────────────────────────────────────────────────────────

export {};