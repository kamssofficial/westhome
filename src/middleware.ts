import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // The *.vercel.app alias is a second live, crawlable copy of the store and the
  // cookie-less host that misconfigured auth redirects used to land on. Permanently
  // fold it into the production domain so there is exactly one origin for the site.
  if (request.nextUrl.hostname === "westhome.vercel.app") {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://westhome.in");
    return NextResponse.redirect(target, 301);
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;
  const role = (token as any)?.role;

  // /shop/all was replaced by /search — issue a real permanent redirect.
  if (pathname === "/shop/all") {
    return NextResponse.redirect(new URL("/search", request.url), 308);
  }

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
      // Per-page access matrix — mirrors the role lists enforced by each /api/admin/* route.
      const can = (roles: string[]) => roles.includes(role);
      const allowed =
        pathname.startsWith("/admin/products")
          ? can(["MANAGER", "PRODUCT_MANAGER"])
          : pathname.startsWith("/admin/categories")
            ? can(["MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"])
            : pathname.startsWith("/admin/orders")
              ? can(["MANAGER", "ORDER_MANAGER"])
              : pathname.startsWith("/admin/customers")
                ? can(["MANAGER"])
                : pathname.startsWith("/admin/audit") || pathname.startsWith("/admin/staff")
                  || pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/coupons")
                  ? false
                  : pathname.startsWith("/admin/homepage") || pathname.startsWith("/admin/content")
                    ? can(["MANAGER", "CONTENT_MANAGER"])
                    : pathname.startsWith("/admin/promotions")
                      ? can(["MANAGER"])
                      : can(["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"]); // dashboard, analytics, anything else

      if (allowed) {
        return NextResponse.next();
      }
      const staffRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
      if (staffRoles.includes(role)) {
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

    const staffRoles = ["ADMIN", "MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
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
    const staffRoles = ["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER", "STAFF"];
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
    "/",
    "/admin/:path*",
    "/staff/:path*",
    "/account/:path*",
    "/checkout/:path*",
    "/((?!_next/static|_next/image|favicon.ico|images|robots.txt|sitemap.xml).*)",
  ],
};
