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
  basePath?: string;
}

export default function ProfileMenu({
  userName,
  userRole,
  userInitials,
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
        className="flex items-center gap-2 pl-1 rounded-xl hover:bg-panel-hover transition-colors py-1"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <div className={cn("w-8 h-8 rounded-full bg-panel-avatar flex items-center justify-center ring-2 ring-panel-header transition-shadow", open && "ring-panel-avatar-ring")}>
          <span className="text-text-inverse text-xs font-medium">{userInitials}</span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none text-panel-text-strong">{userName}</p>
          <p className="text-[10px] text-panel-icon mt-0.5">{roleLabel}</p>
        </div>
        <ChevronDown size={12} className={cn("text-panel-icon hidden sm:block transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-56 bg-panel-popover rounded-2xl border border-panel-border shadow-xl z-50 overflow-hidden animate-fade-in"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-panel-border bg-panel/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-panel-avatar flex items-center justify-center">
                <span className="text-text-inverse text-sm font-medium">{userInitials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-panel-text-strong truncate">{userName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className="text-panel-icon" />
                  <p className="text-[11px] text-panel-text">{roleLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href={basePath + "/settings"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-panel-text hover:text-panel-text-strong hover:bg-panel transition-colors"
            >
              <Settings size={15} className="text-panel-icon" />
              Settings
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-panel-text hover:text-panel-text-strong hover:bg-panel transition-colors"
            >
              <User size={15} className="text-panel-icon" />
              View Store
            </Link>
          </div>

          {/* Sign out */}
          <div className="border-t border-panel-border py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-panel-text hover:text-panel-danger hover:bg-panel-danger/10 transition-colors w-full"
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
