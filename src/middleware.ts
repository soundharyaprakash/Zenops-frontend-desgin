import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "zenops_session";

// Public authentication paths
const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/logout",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Allow static resources, brand assets, Next internals and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map|txt|json)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Read session cookie
  let sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      sessionCookie = decodeURIComponent(sessionCookie).replace(/^"(.*)"$/, "$1");
      const decoded = JSON.parse(decodeURIComponent(escape(atob(sessionCookie))));
      if (decoded && decoded.expiresAt && decoded.expiresAt > Date.now()) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

  // 3. Root "/" always redirects to "/login"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. User is NOT authenticated:
  if (!isAuthenticated) {
    // If requesting a public auth page (e.g. /login, /register), allow direct access
    if (isPublicAuthPath) {
      return NextResponse.next();
    }

    // Redirect to /login with next target
    const loginUrl = new URL("/login", request.url);
    const targetPath = pathname + (search || "");
    if (targetPath && targetPath !== "/" && targetPath !== "/login") {
      loginUrl.searchParams.set("next", targetPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. Authenticated user
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
