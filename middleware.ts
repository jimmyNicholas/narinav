import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Protect app UI + story API. (Leaving other APIs alone by default.)
  const shouldProtect =
    pathname === "/" ||
    pathname.startsWith("/api/story") ||
    pathname.startsWith("/login") === false;

  if (!shouldProtect) return NextResponse.next();

  const user = await getAuthFromRequest(req);
  if (user) {
    // Prevent visiting /login when already authenticated.
    if (pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Allow unauthenticated access to login page.
  if (pathname === "/login") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};

