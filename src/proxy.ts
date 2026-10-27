import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIES } from "./lib/constants";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "eff-ultra-secure-jwt-session-secret-key-32-chars-long"
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ----------------------------------------------------
  // A) Admin Protection: /admin/* and /api/admin/*
  // ----------------------------------------------------
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const adminToken = req.cookies.get(AUTH_COOKIES.ADMIN)?.value;
    let isValidAdmin = false;

    if (adminToken) {
      try {
        await jwtVerify(adminToken, SESSION_SECRET);
        isValidAdmin = true;
      } catch {
        isValidAdmin = false;
      }
    }

    // Public admin login page
    if (pathname === "/admin/login") {
      if (isValidAdmin) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.next();
    }

    // Protected API routes
    if (pathname.startsWith("/api/admin")) {
      if (!isValidAdmin) {
        return NextResponse.json(
          { error: "Unauthorized admin access." },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }

    // Protected Admin Panel pages
    if (!isValidAdmin) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ----------------------------------------------------
  // B) Player Portal Protection: /portal/*
  // ----------------------------------------------------
  if (pathname.startsWith("/portal")) {
    const playerToken = req.cookies.get(AUTH_COOKIES.PLAYER)?.value;
    let playerPayload: { mustChangePassword?: boolean } | null = null;

    if (playerToken) {
      try {
        const { payload } = await jwtVerify(playerToken, SESSION_SECRET);
        playerPayload = payload as { mustChangePassword?: boolean };
      } catch {
        playerPayload = null;
      }
    }

    // Public portal login page
    if (pathname === "/portal/login") {
      if (playerPayload && !playerPayload.mustChangePassword) {
        return NextResponse.redirect(new URL("/portal", req.url));
      }
      return NextResponse.next();
    }

    // If not authenticated, redirect to portal login
    if (!playerPayload) {
      const loginUrl = new URL("/portal/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If mustChangePassword is true, force redirect to /portal/change-password
    if (playerPayload.mustChangePassword && pathname !== "/portal/change-password") {
      return NextResponse.redirect(new URL("/portal/change-password", req.url));
    }

    // If already changed password and trying to visit change-password directly, can allow or redirect
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/portal/:path*",
  ],
};
