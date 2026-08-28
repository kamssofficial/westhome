import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const STAFF_ROLES = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;
  const role = (token as any)?.role;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    if (role !== "ADMIN") {
      if (STAFF_ROLES.includes(role)) {
        if (pathname.startsWith("/admin/products") || pathname.startsWith("/admin/categories")) return NextResponse.next();
        return NextResponse.redirect(new URL("/staff/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/account", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/staff")) {
    if (pathname === "/staff/login") return NextResponse.next();
    if (!token) return NextResponse.redirect(new URL("/login", request.url));
    if (!(role === "ADMIN" || STAFF_ROLES.includes(role))) return NextResponse.redirect(new URL("/account", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (STAFF_ROLES.includes(role)) return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/checkout")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/staff/:path*", "/account/:path*", "/checkout/:path*"] };
