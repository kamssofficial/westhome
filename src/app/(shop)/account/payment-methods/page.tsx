"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, ArrowLeft } from "lucide-react";

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/account" className="text-xs text-[#6b6560] hover:text-[#1a1917] mb-2 inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Account
        </Link>
        <h1 className="text-xl font-serif mt-1">Payment Methods</h1>
        <p className="text-sm text-[#6b6560] mt-1">
          Manage your saved payment methods
        </p>
      </div>

      <div className="bg-white border border-black/[.06] rounded-2xl p-6 text-center">
        <CreditCard size={32} className="text-[#b0aba6] mx-auto mb-3" />
        <p className="text-sm text-[#6b6560] mb-1">No saved payment methods</p>
        <p className="text-xs text-[#b0aba6]">
          Payment methods are managed securely at checkout. We do not store card details on our servers.
        </p>
      </div>
    </div>
  );
}
