import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "popnsip.sid";

/**
 * A first pass only: it checks that a session cookie exists, not that it is
 * valid. Real enforcement is server-side on every API route — this exists so
 * a signed-out person lands on the login page instead of watching a dashboard
 * shell render and then fail.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
