import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:   string;
      role: "SUPERADMIN" | "MANAGER" | "EMPLOYEE";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "SUPERADMIN" | "MANAGER" | "EMPLOYEE";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id:   string;
    role: "SUPERADMIN" | "MANAGER" | "EMPLOYEE";
  }
}