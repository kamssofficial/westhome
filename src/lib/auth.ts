import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "./db";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string; role: string; };
  }
  interface User { role: string; }
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export const authOptions: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.isActive === false) return null;
        if (!user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name || "", role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
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
        (session.user as any).role = token.role || "CUSTOMER";
        (session.user as any).id = token.id;
        (session.user as any).permissions = token.permissions || "[]";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return parsed.pathname + parsed.search;
      } catch {}
      return baseUrl;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  cookies: {
    csrfToken: { name: "authjs.csrf-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure: true } },
    sessionToken: { name: "authjs.session-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 30 * 24 * 60 * 60 } },
    callbackUrl: { name: "authjs.callback-url", options: { httpOnly: true, sameSite: "lax", path: "/", secure: true } },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: (session.user as any).id }, select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true } });
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized: Admin access required");
  return session;
}
