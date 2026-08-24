import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;
  const role = (token as any)?.role;

  // ── Admin routes: ADMIN only ──
  if (pathname.startsWith("/admin")) {
    // Allow /admin/login without auth (it redirects to /login)
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role !== "ADMIN") {
      const staffRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
      if (staffRoles.includes(role)) {
        // Staff can access product management routes
        if (pathname.startsWith("/admin/products")) {
          return NextResponse.next();
        }
        // Staff can access categories (read-only useful for product context)
        if (pathname.startsWith("/admin/categories")) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/staff/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/account", request.url));
    }

    return NextResponse.next();
  }

  // ── Staff routes: MANAGER or ADMIN only ──
  if (pathname.startsWith("/staff")) {
    // Allow /staff/login without auth (it redirects to /login)
    if (pathname === "/staff/login") {
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const staffRoles = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
    if (!staffRoles.includes(role)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }

    return NextResponse.next();
  }

  // ── Account routes: CUSTOMER only (admin/staff redirected to their dashboards) ──
  if (pathname.startsWith("/account")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // CRITICAL: Admin and staff must NOT access /account
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    const staffRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"];
    if (staffRoles.includes(role)) {
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }

    return NextResponse.next();
  }

  // ── Checkout routes: any authenticated user ──
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/account/:path*",
    "/checkout/:path*",
  ],
};
