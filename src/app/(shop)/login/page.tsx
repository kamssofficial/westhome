"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        setLoading(false);
      } else {
        toast.success("Signed in successfully");
        // Wait for the JWT cookie to be set before checking session
        await new Promise((r) => setTimeout(r, 500));
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        // Route to the correct area based on role
        if (role === "ADMIN") {
          window.location.href = "/admin/dashboard";
        } else if (["MANAGER", "ORDER_MANAGER", "PRODUCT_MANAGER", "CONTENT_MANAGER"].includes(role)) {
          window.location.href = "/staff/dashboard";
        } else {
          // Full page reload so the middleware picks up the fresh JWT
          window.location.href = callbackUrl.startsWith("/account")
            ? callbackUrl
            : "/account";
        }
      }
    } catch {
      toast.error("Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-serif">Welcome Back</h1>
          <p className="text-sm text-text-secondary mt-1">
            Sign in to your WESTHOME account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[1.35rem] p-5 md:p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 pr-10 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-text-muted">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
