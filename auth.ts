// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Okta from "next-auth/providers/okta";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@prisma/client";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN;
if (!ALLOWED_DOMAIN) {
  throw new Error("ALLOWED_EMAIL_DOMAIN must be set");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Okta({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return user.email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true, department: true },
        });
        if (dbUser) {
          token.id = user.id;
          token.role = dbUser.role;
          token.department = dbUser.department ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as UserRole,
          department: token.department ?? null,
        },
      };
    },
  },
  session: { strategy: "jwt" },
  trustHost: true,
});
