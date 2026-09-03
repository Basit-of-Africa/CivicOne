import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight session-aware routing.
 *
 * Real authentication is always enforced server-side (`requireUser` in the
 * app layout / actions). This middleware only improves UX by redirecting
 * anonymous visitors away from the signed-in area and signed-in visitors
 * away from auth pages, based on the presence of the session cookie.
 */

const AUTH_PREFIXES = ["/auth"];
const PUBLIC_PREFIXES = ["/about", "/terms", "/verify"];
const API_PREFIXES = ["/api/"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "civone_session";
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
