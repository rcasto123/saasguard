// types/next-auth.d.ts
import type { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: UserRole;
      department: string | null;
    };
  }
  interface User {
    role?: UserRole;
    department?: string | null;
  }
}
