"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return "Mobile number is required";
    const cleaned = phone.replace(/\D/g, "");
    const digits = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    const num = digits.startsWith("91") && digits.length > 10 ? digits.slice(2) : digits;
    if (!/^\d{10}$/.test(num)) return "Enter a valid 10-digit mobile number";
    if (!/^[6-9]/.test(num)) return "Mobile number must start with 6, 7, 8, or 9";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";

    const phoneError = validatePhone(form.phone);
    if (phoneError) newErrors.phone = phoneError;

    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

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

      try {
        const result = await nextAuthSignIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });

        if (result?.error) {
          toast.success("Account created! Please sign in.");
          window.location.href = "/login";
        } else {
          toast.success("Account created and signed in!");
          window.location.href = "/account";
        }
      } catch {
        toast.success("Account created! Please sign in.");
        window.location.href = "/login";
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

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
            <input id="register-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} ${errors.name ? "border-red-400" : ""}`} placeholder="Your name" autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "register-name-error" : undefined} />
            {errors.name && <p id="register-name-error" className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="register-email" className="text-xs font-medium text-text-secondary mb-1 block">Email *</label>
            <input id="register-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} ${errors.email ? "border-red-400" : ""}`} placeholder="your@email.com" autoComplete="email" spellCheck={false} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "register-email-error" : undefined} />
            {errors.email && <p id="register-email-error" className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="register-phone" className="text-xs font-medium text-text-secondary mb-1 block">Mobile Number *</label>
            <input id="register-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} ${errors.phone ? "border-red-400" : ""}`} placeholder="98765 43210" autoComplete="tel" inputMode="tel" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "register-phone-error" : undefined} />
            {errors.phone && <p id="register-phone-error" className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="register-password" className="text-xs font-medium text-text-secondary mb-1 block">Password *</label>
            <div className="relative">
              <input id="register-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputClass} pr-10 ${errors.password ? "border-red-400" : ""}`} placeholder="Min. 6 characters" autoComplete="new-password" required minLength={6} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "register-password-error" : undefined} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p id="register-password-error" className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="text-xs font-medium text-text-secondary mb-1 block">Confirm Password *</label>
            <input id="register-confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={`${inputClass} ${errors.confirmPassword ? "border-red-400" : ""}`} placeholder="Confirm your password" autoComplete="new-password" required minLength={6} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined} />
            {errors.confirmPassword && <p id="register-confirm-password-error" className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>
          <div className="flex items-start gap-2">
            <input type="checkbox" id="consent" name="consent" required className="mt-0.5 accent-[#d4a574]" />
            <label htmlFor="consent" className="text-xs text-secondary leading-relaxed">
              I agree to the <a href="/policies/terms" className="text-accent hover:underline" target="_blank">Terms of Service</a> and <a href="/policies/privacy" className="text-accent hover:underline" target="_blank" rel="noreferrer">Privacy Policy</a>
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
