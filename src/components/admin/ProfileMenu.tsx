"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { User, Settings, LogOut, ChevronDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileMenuProps {
  userName: string;
  userRole: string;
  userInitials: string;
  accentRing?: string;
  basePath?: string;
}

export default function ProfileMenu({
  userName,
  userRole,
  userInitials,
  accentRing = "ring-panel-header",
  basePath = "/admin",
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const roleLabel = userRole === "ADMIN" ? "Owner" : userRole.replace(/_/g, " ");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-1 rounded-xl hover:bg-black/[.04] transition-colors py-1"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <div className={cn("w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center ring-2 transition-shadow", accentRing, open && "ring-stone-600")}>
          <span className="text-white text-xs font-medium">{userInitials}</span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none text-[#1a1917]">{userName}</p>
          <p className="text-[10px] text-[#b0aba6] mt-0.5">{roleLabel}</p>
        </div>
        <ChevronDown size={12} className={cn("text-[#b0aba6] hidden sm:block transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-black/[.06] shadow-xl z-50 overflow-hidden animate-fade-in"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-black/[.06] bg-[#f7f5f2]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center">
                <span className="text-white text-sm font-medium">{userInitials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1917] truncate">{userName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className="text-[#b0aba6]" />
                  <p className="text-[11px] text-[#6b6560]">{roleLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href={basePath + "/settings"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6560] hover:text-[#1a1917] hover:bg-[#f7f5f2] transition-colors"
            >
              <Settings size={15} className="text-[#b0aba6]" />
              Settings
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6560] hover:text-[#1a1917] hover:bg-[#f7f5f2] transition-colors"
            >
              <User size={15} className="text-[#b0aba6]" />
              View Store
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-black/[.06] py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6560] hover:text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
