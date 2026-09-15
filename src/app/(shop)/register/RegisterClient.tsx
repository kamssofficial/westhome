"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  // Deep-linked from the login page: phone prefilled, destination preserved.
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const [form, setForm] = useState({ name: "", phone: searchParams.get("phone") || "", email: "", password: "", confirmPassword: "", consent: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!form.consent) {
      toast.error("Please accept the Privacy Policy to create an account");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // Registration succeeded — try to auto-login, but don't let it mask success
      try {
        const result = await nextAuthSignIn("credentials", {
          phone: form.phone,
          password: form.password,
          redirect: false,
        });

        if (result?.error) {
          toast.success("Account created! Please sign in.");
          window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
        } else {
          toast.success("Account created and signed in!");
          window.location.href = callbackUrl;
        }
      } catch {
        // Auto-login failed (e.g. session fetch error) — account was still created
        toast.success("Account created! Please sign in.");
        window.location.href = "/login?callbackUrl=" + encodeURIComponent(callbackUrl);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-serif">Create Account</h1>
          <p className="text-sm text-text-secondary mt-1">Join the WESTHOME community</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[1.35rem] p-5 md:p-6 space-y-4">
          <div>
            <label htmlFor="register-name" className="text-xs font-medium text-text-secondary mb-1 block">Full Name *</label>
            <input id="register-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Your name" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="register-phone" className="text-xs font-medium text-text-secondary mb-1 block">Phone Number *</label>
            <input id="register-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="+91 XXXXX XXXXX" autoComplete="tel" inputMode="tel" />
          </div>
          <div>
            <label htmlFor="register-email" className="text-xs font-medium text-text-secondary mb-1 block">Email (optional)</label>
            <input id="register-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="your@email.com" autoComplete="email" spellCheck={false} />
          </div>
          <div>
            <label htmlFor="register-password" className="text-xs font-medium text-text-secondary mb-1 block">Password *</label>
            <div className="relative">
              <input id="register-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full px-3 py-2.5 pr-10 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Min. 6 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="text-xs font-medium text-text-secondary mb-1 block">Confirm Password *</label>
            <input id="register-confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" placeholder="Confirm your password" autoComplete="new-password" />
          </div>
          <div className="flex items-start gap-2.5">
            <input
              id="consent"
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-border accent-accent shrink-0"
              required
            />
            <label htmlFor="consent" className="text-xs text-text-secondary leading-relaxed">
              I agree to the processing of my personal data as described in the{" "}
              <Link href="/policies/privacy" className="text-accent font-medium hover:underline">Privacy Policy</Link>{" "}
              and the{" "}
              <Link href="/policies/terms" className="text-accent font-medium hover:underline">Terms of Service</Link>.
            </label>
          </div>
          <Button type="submit" fullWidth size="lg" loading={loading}>Create Account</Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
