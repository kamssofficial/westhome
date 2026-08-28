"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error === "CredentialsSignin" ? "Invalid email or password" : error ? "Sign in failed. Please try again." : "");
  

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // Step 1: Get CSRF token
      const csrfResp = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfResp.json();

      // Step 2: Submit credentials
      const resp = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          callbackUrl,
          json: "true",
        }),
        redirect: "manual",
      });

      // Step 3: Check if login succeeded by checking session
      const sessionResp = await fetch("/api/auth/session");
      const session = await sessionResp.json();

      if (session?.user) {
        // Login succeeded — redirect
        window.location.href = callbackUrl;
      } else {
        setErrorMsg("Invalid email or password");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-serif">Welcome Back</h1>
          <p className="text-sm text-[#6b6560] mt-1">Sign in to your WESTHOME account</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-black/[.06] rounded-2xl p-5 md:p-6 space-y-4"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div>
            <label htmlFor="login-email" className="text-xs font-medium text-[#6b6560] mb-1 block">Email</label>
            <input id="login-email" type="email" name="email" autoComplete="email" required
              className="w-full px-3 py-2.5 bg-white border border-black/[.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30"
              placeholder="your@email.com" />
          </div>
          <div>
            <label htmlFor="login-password" className="text-xs font-medium text-[#6b6560] mb-1 block">Password</label>
            <div className="relative">
              <input id="login-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" required
                className="w-full px-3 py-2.5 pr-10 bg-white border border-black/[.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a574]/30"
                placeholder="••••••••" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0aba6] hover:text-[#1a1917]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-[#6b6560] hover:text-[#1a1917]">Forgot password?</Link>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 disabled:opacity-60 transition-colors">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-[#6b6560] mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#d4a574] font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-sm text-[#6b6560]">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
