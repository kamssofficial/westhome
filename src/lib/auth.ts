import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "./db";

// In-memory rate limiter for login attempts (per phone/email).
// In production on Vercel each isolate has its own map, so this is a best-effort
// throttle — enough to slow brute-force without blocking legitimate users.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 60_000; // 1 minute
const LOGIN_MAX_ATTEMPTS = 8;

function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

const configuredAuthBase = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").toLowerCase();
if (
  (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") &&
  configuredAuthBase &&
  configuredAuthBase.includes("vercel.app")
) {
  process.env.AUTH_URL = "https://westhome.in";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      permissions?: string;
    };
  }
  interface User {
    role: string;
    permissions?: string;
  }
}

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;

        // Rate-limit login attempts by phone/email
        const rateKey = (credentials.phone as string).trim().toLowerCase();
        if (!checkLoginRateLimit(rateKey)) return null;

        // Normalize phone: strip spaces and leading +91/91/0
        const raw = (credentials.phone as string).trim();
        const normalized = raw.replace(/^\+?91/, "").replace(/^0/, "").replace(/\s+/g, "");

        // Try exact phone match, then normalized 10-digit match
        let user = await db.user.findFirst({ where: { phone: raw } });
        if (!user) {
          user = await db.user.findFirst({ where: { phone: normalized } });
        }
        // Also try with +91 prefix
        if (!user && normalized.length === 10) {
          user = await db.user.findFirst({ where: { phone: "+91" + normalized } });
        }
        // Fallback: try email field (in case some users registered with email)
        if (!user) {
          user = await db.user.findFirst({ where: { email: credentials.phone as string } });
        }
        if (!user || user.isActive === false) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || "",
          role: user.role,
          permissions: user.permissions || "[]",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "CUSTOMER";
        token.id = user.id;
        token.permissions = (user as any).permissions || "[]";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).permissions = token.permissions || "[]";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return urlObj.pathname;
      } catch {}
      return baseUrl;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  cookies: {
    csrfToken: {
      name: "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    sessionToken: {
      name: "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 },
    },
    callbackUrl: {
      name: "authjs.callback-url",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true, isActive: true },
  });
}

/** Require a current, active account. Role-sensitive endpoints should use apiAuth helpers. */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true },
  });
  if (!user || user.isActive === false) throw new Error("Unauthorized");

  return { ...session, user: { ...session.user, ...user } };
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}
