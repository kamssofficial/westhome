"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // For now, show a generic success message
      // In production, this would send a password reset email
      toast.success("If an account exists with this email, you'll receive a password reset link.");
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary mb-6">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-xl font-serif">Reset Password</h1>
          <p className="text-sm text-secondary mt-1">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="bg-surface border border-border rounded-[1.35rem] p-6 text-center">
            <Mail size={32} className="text-accent mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-primary mb-2">Check your email</h2>
            <p className="text-xs text-secondary mb-4">
              We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full text-sm font-medium">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-[1.35rem] p-5 md:p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <Button type="submit" fullWidth loading={loading}>Send Reset Link</Button>
          </form>
        )}
      </div>
    </div>
  );
}
