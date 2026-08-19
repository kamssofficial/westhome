import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Pass through - full auth checks happen at page/API level
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/checkout/:path*",
  ],
};
