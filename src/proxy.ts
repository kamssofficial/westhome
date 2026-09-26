import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  // Exactly one origin may serve the store: https://www.westhome.in. Every other
  // host that still resolves to this app is folded into it with a permanent
  // redirect - the bare apex, any *.onrender.com origin (this app answers there
  // too), and the legacy westhomebybmd.com aliases. Doing this in the app rather
  // than in a hosting dashboard keeps the canonical host stable across platform
  // moves.
  const host = request.nextUrl.hostname;
  const isCanonicalHost = host === "www.westhome.in";
  const isFoldableHost =
    host === "westhome.in" ||
    host === "westhomebybmd.com" ||
    host.endsWith(".westhomebybmd.com") ||
    host.endsWith(".onrender.com");
  if (!isCanonicalHost && isFoldableHost) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://www.westhome.in");
    return NextResponse.redirect(target, 301);
  }

  const { pathname } = request.nextUrl;

  // /shop/all was replaced by /search — issue a real permanent redirect.
  if (pathname === "/shop/all") {
    return NextResponse.redirect(new URL("/search", request.url), 308);
  }

  // Public storefront pages never need session authentication. Avoid the JWT
  // lookup on the hot path so public requests can reach the browser faster.
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/staff") &&
    !pathname.startsWith("/account")
  ) {
    const response = NextResponse.next();
    // Public storefront HTML/assets can be reused safely. Product/category data
    // refreshes in the client, while this keeps repeat navigations off the
    // application render path.
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
    );
    return response;
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });
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

  // ── Checkout routes: open to guests ──
  // Guest checkout is supported end to end: the checkout page collects contact
  // + address details, orders are created with a null userId, and payment is
  // authorized with a per-order guest claim token instead of a session.
  // Deliberately no login redirect here.

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
