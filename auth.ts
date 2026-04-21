// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Okta from "next-auth/providers/okta";
import Credentials from "next-auth/providers/credentials";
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
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!email || !password || !adminPassword) return null;
        if (password !== adminPassword) return null;
        // Find or create the user
        let user = await db.user.findUnique({ where: { email } });
        if (!user) {
          user = await db.user.create({
            data: { email, name: email.split("@")[0], role: "admin" },
          });
        }
        return { id: user.id, email: user.email, name: user.name ?? email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials logins bypass domain check (already validated in authorize)
      if (account?.provider === "credentials") return true;
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
