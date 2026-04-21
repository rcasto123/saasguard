// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Okta from "next-auth/providers/okta";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN!;

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { role: true, department: true },
      });
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: dbUser?.role ?? "manager",
          department: dbUser?.department ?? null,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "database" },
});
