import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/explore", "/session", "/settings"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // ponytail: redirect-only guard, not a security boundary.
  // Every API route and RSC page validates the session independently via auth.api.getSession().
  // Better Auth uses __Secure- prefix on HTTPS (production), plain name on HTTP (local dev).
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");
  if (!sessionCookie?.value) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/explore/:path*", "/session/:path*", "/settings/:path*"],
};
