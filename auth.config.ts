import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma, no Node.js crypto
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
