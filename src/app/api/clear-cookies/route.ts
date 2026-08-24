import { NextResponse } from "next/server";

export async function POST() {
  const res = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  // Clear legacy __Host- prefixed auth cookies
  const legacyCookies = [
    "__Host-authjs.csrf-token",
    "__Host-authjs.session-token",
    "__Host-authjs.callback-url",
    "__Secure-authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
  ];

  for (const name of legacyCookies) {
    res.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }

  return res;
}
