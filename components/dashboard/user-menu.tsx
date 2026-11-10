"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api-client";

export function UserMenu({ name, email, compact = false }: { name: string; email: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group flex items-center gap-2 rounded-full p-1 transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a979f0]"
        aria-label="Account menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#63429b] to-[#af6ec5] text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 transition-transform group-hover:scale-105">
          {initials || "?"}
        </div>
        {!compact && <span className="hidden md:inline max-w-[120px] truncate pr-1.5 text-xs font-semibold text-white">{name}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-50 mt-2.5 w-64 rounded-2xl border border-white/10 bg-[#2b2833] p-2 text-white shadow-2xl ring-1 ring-black/20 animate-in fade-in zoom-in-95 duration-150 ${compact ? "md:bottom-0 md:left-full md:right-auto md:ml-3 md:mt-0" : ""}`}
        >
          {/* User profile card */}
          <div className="mb-1.5 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#63429b] text-sm font-bold text-white shadow-sm">
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-xs text-[#b9b3c4]">{email}</p>
            </div>
          </div>

          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#b9b3c4]">
            Gimage Workspace
          </div>

          <div className="space-y-0.5">
            <div className="my-1 border-t border-white/10" />

            <button
              role="menuitem"
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
