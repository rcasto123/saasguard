// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Okta from "next-auth/providers/okta";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { hashPassword, verifyPassword } from "@/lib/password";
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
    ...(process.env.OKTA_ISSUER && !process.env.OKTA_ISSUER.includes("yourcompany")
      ? [Okta({
          clientId: process.env.OKTA_CLIENT_ID!,
          clientSecret: process.env.OKTA_CLIENT_SECRET!,
          issuer: process.env.OKTA_ISSUER,
        })]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });

        if (user) {
          if (!user.isActive) return null;
          // Require a stored password hash — no master-key bypass for existing users
          if (!user.passwordHash) return null;
          const ok = await verifyPassword(password, user.passwordHash);
          return ok ? { id: user.id, email: user.email, name: user.name ?? email } : null;
        }

        // No existing user — only allow ADMIN_PASSWORD bootstrap when zero admins exist
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword || password !== adminPassword) return null;
        const adminCount = await db.user.count({ where: { role: "admin" } });
        if (adminCount > 0) return null; // Bootstrap disabled once any admin exists
        // Hash the bootstrap password so the account is usable on subsequent logins
        const passwordHash = await hashPassword(adminPassword);
        const created = await db.user.create({
          data: { email, name: email.split("@")[0], role: "admin", passwordHash },
        });
        return { id: created.id, email: created.email, name: created.name ?? email };
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
