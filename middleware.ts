// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // Redirect already-logged-in users away from login
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // All other routes require login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    // Only propagate same-origin paths, never full URLs
    const safe = pathname.startsWith("/") && !pathname.startsWith("//")
      ? pathname
      : "/dashboard";
    loginUrl.searchParams.set("callbackUrl", safe);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
