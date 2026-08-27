"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HeroManager from "@/components/admin/HeroManager";

export default function StaffHeroImagePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/staff/dashboard" className="p-2 rounded-lg hover:bg-[#f7f5f2] transition-colors">
          <ArrowLeft size={18} className="text-[#6b6560]" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#1a1917]">Hero Image</h1>
          <p className="text-sm text-[#b0aba6] mt-0.5">Manage the homepage hero background image</p>
        </div>
      </div>
      <HeroManager />
    </div>
  );
}
